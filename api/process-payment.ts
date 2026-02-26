import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ─── reCAPTCHA Validator ──────────────────────────────────
async function validarRecaptcha(token: string, secret: string): Promise<{ ok: boolean; score: number }> {
    try {
        const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token }).toString()
        })
        const data = await resp.json() as { success: boolean; score?: number }
        return { ok: data.success, score: data.score ?? 1 }
    } catch {
        return { ok: true, score: 1 } // fail-open: deixa passar se API indisponível
    }
}

// ─── Handler Principal ────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const {
        method,           // 'card' | 'pix'
        nome,
        email,
        valor,
        produto_nome,
        checkout_slug,
        utm_source,
        recaptcha_token,
        gateway           // 'stripe' | 'pushinpay' | 'mundpay'
    } = req.body

    if (!method || !email || valor === undefined) {
        return res.status(400).json({ error: 'Campos obrigatórios: method, email, valor' })
    }

    const appUrl = process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app'

    // ── reCAPTCHA ──
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
    if (recaptchaSecret && recaptcha_token) {
        const { ok, score } = await validarRecaptcha(recaptcha_token, recaptchaSecret)
        if (!ok || score < 0.3) {
            try {
                await supabase.from('pedidos').insert({
                    email_comprador: email,
                    nome_comprador: nome || 'Desconhecido',
                    valor: Number(valor),
                    metodo_pagamento: method,
                    status: 'bloqueado_fraude',
                    utm_source: utm_source || null,
                    erro: `reCAPTCHA score baixo: ${score}`
                } as any)
            } catch { /* ignora falha ao registrar */ }
            return res.status(403).json({ error: 'Transação bloqueada por suspeita de fraude.' })
        }
    }

    // Gerar ID único do pedido
    const pid = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // ═══════════════════════════════════════
    // CARTÃO VIA STRIPE
    // ═══════════════════════════════════════
    if (method === 'card') {
        let stripeKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY

        try {
            const { data: integ } = await supabase
                .from('integrations')
                .select('config, enabled')
                .eq('id', 'stripe')
                .single()
            if (integ?.enabled && integ.config?.secKey) {
                stripeKey = integ.config.secKey as string
            }
        } catch { /* usa env */ }

        if (!stripeKey || stripeKey.includes('placeholder')) {
            return res.status(500).json({ error: 'Stripe não configurado. Configure em Admin → Pagamentos.' })
        }

        try {
            const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })

            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(Number(valor) * 100),
                currency: 'brl',
                payment_method_types: ['card'],
                receipt_email: email,
                metadata: {
                    pedido_id: pid,
                    utm_source: utm_source || '',
                    produto_nome: produto_nome || ''
                }
            })

            // Registrar pedido como pendente
            try {
                await supabase.from('pedidos').insert({
                    id: pid,
                    email_comprador: email,
                    nome_comprador: nome || 'Cliente',
                    valor: Number(valor),
                    metodo_pagamento: 'card',
                    status: 'pendente',
                    gateway: 'stripe',
                    utm_source: utm_source || null,
                    stripe_payment_intent: paymentIntent.id
                } as any)
            } catch (e) {
                console.error('[process-payment/card] Supabase insert:', e)
            }

            return res.status(200).json({
                clientSecret: paymentIntent.client_secret,
                publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || stripeKey.replace('sk_', 'pk_'),
                pedido_id: pid
            })
        } catch (error: any) {
            console.error('[process-payment/card]:', error)
            try {
                await supabase.from('pedidos').insert({
                    id: pid, email_comprador: email, nome_comprador: nome,
                    valor: Number(valor), metodo_pagamento: 'card',
                    status: 'falhou', gateway: 'stripe', erro: error.message
                } as any)
            } catch { /* ignora */ }
            return res.status(500).json({ error: error.message || 'Erro ao processar cartão' })
        }
    }

    // ═══════════════════════════════════════
    // PIX VIA PUSHINPAY
    // ═══════════════════════════════════════
    if (method === 'pix' && (!gateway || gateway === 'pushinpay')) {
        let token = process.env.PUSHINPAY_TOKEN || process.env.VITE_PUSHINPAY_TOKEN

        try {
            const { data: integ } = await supabase
                .from('integrations')
                .select('config, enabled')
                .eq('id', 'pushinpay')
                .single()
            if (integ?.enabled && integ.config?.apiToken) {
                token = integ.config.apiToken as string
            }
        } catch { /* usa env */ }

        // PushinPay indisponível — cascata para MundPay
        if (!token || token.length < 10 || token.includes('placeholder')) {
            return res.status(500).json({ error: 'PushinPay Token não configurado.' })
        }

        try {
            // Registrar pedido pendente
            try {
                await supabase.from('pedidos').insert({
                    id: pid,
                    email_comprador: email,
                    nome_comprador: nome || 'Cliente',
                    valor: Number(valor),
                    metodo_pagamento: 'pix',
                    status: 'pendente',
                    gateway: 'pushinpay',
                    utm_source: utm_source || null
                } as any)
            } catch (e) {
                console.error('[process-payment/pix/pushinpay] Supabase insert:', e)
            }

            const pixResp = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    value: Math.round(Number(valor) * 100),
                    webhook_url: `${appUrl}/api/pushinpay/webhook`,
                    external_reference: pid
                })
            })

            const texto = await pixResp.text()
            if (!pixResp.ok) throw new Error(`PushinPay ${pixResp.status}: ${texto}`)

            const pixData = JSON.parse(texto)
            try {
                await supabase.from('pedidos').update({ pix_id: pixData.id } as any).eq('id', pid)
            } catch { /* ignora */ }

            return res.status(200).json({
                qr_code: pixData.qr_code_base64 || pixData.qr_code, // Tenta base64 primeiro
                qr_code_text: pixData.qr_code || pixData.qr_code_text, // Copia e cola
                expires_at: pixData.expires_at || new Date(Date.now() + 30 * 60000).toISOString(),
                pedido_id: pid,
                gateway: 'pushinpay'
            })
        } catch (err: any) {
            console.error('[process-payment/pix/pushinpay]:', err)
            try {
                await supabase.from('pedidos').update({ status: 'falhou', erro: err.message } as any).eq('id', pid)
            } catch { /* ignora */ }
            return res.status(500).json({ error: err.message || 'Erro ao gerar Pix via PushinPay' })
        }
    }

    // ═══════════════════════════════════════
    // PIX VIA MUNDPAY (REDIRECT DIRETO)
    // ═══════════════════════════════════════
    if (method === 'pix' && gateway === 'mundpay') {
        const { cpf, mundpay_url } = req.body

        if (!mundpay_url) {
            return res.status(400).json({ error: 'URL do checkout MundPay não configurada para este produto.' })
        }

        try {
            // 1. Registrar pedido pendente no SharkPay
            try {
                await supabase.from('pedidos').insert({
                    id: pid,
                    email_comprador: email,
                    nome_comprador: nome || 'Cliente',
                    cpf_comprador: cpf || null,
                    valor: Number(valor),
                    metodo_pagamento: 'pix',
                    status: 'pendente',
                    gateway: 'mundpay',
                    utm_source: utm_source || null,
                    checkout_slug: checkout_slug || null
                } as any)
            } catch (e) {
                console.error('[process-payment/mundpay] Supabase insert:', e)
            }

            // 2. Montar URL de redirect com dados do comprador
            const redirectUrl = new URL(mundpay_url)
            if (nome) redirectUrl.searchParams.set('name', nome)
            if (email) redirectUrl.searchParams.set('email', email)
            if (cpf) redirectUrl.searchParams.set('cpf', cpf.replace(/\D/g, ''))

            console.log(`[MundPay] Redirect para: ${redirectUrl.toString()}`)

            // 3. Retornar URL de redirect para o frontend
            return res.status(200).json({
                redirect_url: redirectUrl.toString(),
                pedido_id: pid,
                gateway: 'mundpay'
            })

        } catch (err: any) {
            console.error('[process-payment/mundpay]:', err)
            try {
                await supabase.from('pedidos').update({ status: 'falhou', erro: err.message } as any).eq('id', pid)
            } catch { /* ignora */ }
            return res.status(500).json({ error: err.message || 'Erro ao processar pagamento MundPay' })
        }
    }

    return res.status(400).json({ error: `Combinação inválida: method=${method}, gateway=${gateway}` })
}
