import Stripe from 'stripe'
// BLINDAGEM: Não altere esta importação. O crypto.randomUUID é essencial para o banco de dados.
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
// import { createPayment } from '../core/paymentRouter' // REMOVIDO: causando erro de build no Vercel

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

// ─── Nome Completo Validator ──────────────────────────────
function validarNomeCompleto(nome: string | null | undefined): { valid: boolean; error?: string } {
    if (!nome || typeof nome !== 'string') {
        return { valid: false, error: 'Nome completo obrigatório (nome + sobrenome)' }
    }

    const nomeParts = nome.trim().split(/\s+/).filter(Boolean)

    if (nomeParts.length < 2) {
        return { valid: false, error: 'Nome completo obrigatório (nome + sobrenome)' }
    }

    // Verifica se tem pelo menos 2 caracteres em cada parte (evita "A B")
    const temPartesValidas = nomeParts.every(part => part.length >= 2)
    if (!temPartesValidas) {
        return { valid: false, error: 'Nome completo obrigatório (nome + sobrenome)' }
    }

    return { valid: true }
}

// ─── Handler Principal ────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

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

    // BLINDAGEM: Geração de ID único (UUID) — NÃO ALTERAR. Essencial para compatibilidade com tabela 'pedidos' (UUID).
    const pid = randomUUID()

    // ─── SaaS: Identificar o dono do produto ───
    let productOwnerId: string | null = null
    let productId: string | null = null
    try {
        if (checkout_slug) {
            const { data: prod } = await supabase
                .from('produtos')
                .select('id, user_id, nome')
                .eq('checkout_slug', checkout_slug)
                .maybeSingle()
            if (prod) {
                productOwnerId = prod.user_id || null
                productId = prod.id
            }
        }
    } catch (e) {
        console.warn('[process-payment] Erro ao buscar owner:', e)
    }

    // ═══════════════════════════════════════
    // BLINDAGEM: CARTÃO VIA STRIPE (FUNCIONANDO)
    // NÃO ALTERAR ESTE BLOCO.
    // ═══════════════════════════════════════
    if (method === 'card') {
        let stripeKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY

        try {
            let query = supabase
                .from('integrations')
                .select('config, enabled')
                .eq('id', 'stripe')

            if (productOwnerId) query = query.eq('user_id', productOwnerId)

            const { data: integ } = await query.maybeSingle()

            // Se tiver chave no banco, usa ela (prioridade sobre o ENV)
            if (integ?.config?.secKey && !String(integ.config.secKey).includes('placeholder')) {
                stripeKey = integ.config.secKey as string
            }
        } catch { /* usa env como fallback */ }

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
                    produto_nome: produto_nome || '',
                    product_owner: productOwnerId || ''
                }
            })

            // Registrar pedido como pendente
            try {
                await supabase.from('pedidos').insert({
                    id: pid,
                    user_id: productOwnerId,
                    email_comprador: email,
                    nome_comprador: nome || 'Cliente',
                    valor: Number(valor),
                    metodo_pagamento: 'card',
                    status: 'pendente',
                    gateway: 'stripe',
                    utm_source: utm_source || null,
                    checkout_slug: checkout_slug || null,
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
                    id: pid, user_id: productOwnerId, email_comprador: email, nome_comprador: nome,
                    valor: Number(valor), metodo_pagamento: 'card',
                    status: 'falhou', gateway: 'stripe', erro: error.message,
                    checkout_slug: checkout_slug || null
                } as any)
            } catch { /* ignora */ }
            return res.status(500).json({ error: error.message || 'Erro ao processar cartão' })
        }
    }

    // ═══════════════════════════════════════
    // BLINDAGEM: PIX VIA PUSHINPAY (FUNCIONANDO)
    // NÃO ALTERAR ESTE BLOCO.
    // ═══════════════════════════════════════
    if (method === 'pix' && (!gateway || gateway === 'pushinpay')) {
        // ✅ VALIDAÇÃO DE NOME COMPLETO **ANTES** DE CRIAR O PEDIDO
        const validacaoNome = validarNomeCompleto(nome)
        if (!validacaoNome.valid) {
            try {
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'audit',
                    gateway: 'pushinpay',
                    evento: 'VALIDATION_FAILED',
                    pedido_id: null,
                    sucesso: false,
                    mensagem: `Validação falhou: ${validacaoNome.error} | Email: ${email} | Nome recebido: "${nome || ''}"`,
                    payload: {
                        nome_recebido: nome,
                        email,
                        valor,
                        checkout_slug,
                        erro: validacaoNome.error
                    }
                } as any)
            } catch (logErr) {
                console.error('[pushinpay] Erro ao registrar log de validação:', logErr)
            }

            return res.status(400).json({
                success: false,
                error: validacaoNome.error
            })
        }

        let token = process.env.PUSHINPAY_TOKEN || process.env.VITE_PUSHINPAY_TOKEN

        try {
            let query = supabase
                .from('integrations')
                .select('config, enabled')
                .eq('id', 'pushinpay')

            if (productOwnerId) query = query.eq('user_id', productOwnerId)

            const { data: integ } = await query.maybeSingle()

            if (integ?.enabled && integ.config?.apiToken) {
                token = integ.config.apiToken as string
            }
        } catch { /* usa env */ }

        // PushinPay indisponível
        if (!token || token.length < 10 || token.includes('placeholder')) {
            return res.status(500).json({ error: 'PushinPay Token não configurado.' })
        }

        try {
            // Registrar pedido pendente
            try {
                await supabase.from('pedidos').insert({
                    id: pid,
                    user_id: productOwnerId,
                    email_comprador: email,
                    nome_comprador: nome || 'Cliente',
                    valor: Number(valor),
                    metodo_pagamento: 'pix',
                    status: 'pendente',
                    gateway: 'pushinpay',
                    utm_source: utm_source || null,
                    checkout_slug: checkout_slug || null
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

            // PushinPay retorna QR code — fechar popup vazio se existir
            const pixData = JSON.parse(texto)
            try {
                await supabase.from('pedidos').update({ pix_id: pixData.id } as any).eq('id', pid)

                // LOG DE GERAÇÃO DE PIX
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'gateway',
                    gateway: 'pushinpay',
                    evento: 'pix_gerado',
                    pedido_id: pid,
                    payload: pixData,
                    mensagem: `Pix gerado via PushinPay para ${email}`
                } as any)
            } catch { /* ignora */ }

            return res.status(200).json({
                qr_code: pixData.qr_code_base64 || pixData.qr_code,
                qr_code_text: pixData.qr_code || pixData.qr_code_text,
                expires_at: pixData.expires_at || new Date(Date.now() + 30 * 60000).toISOString(),
                pedido_id: pid,
                gateway: 'pushinpay'
            })
        } catch (err: any) {
            console.error('[process-payment/pix/pushinpay]:', err)
            try {
                await supabase.from('pedidos').update({ status: 'falhou', erro: err.message } as any).eq('id', pid)

                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'gateway',
                    gateway: 'pushinpay',
                    evento: 'pix_erro',
                    pedido_id: pid,
                    sucesso: false,
                    mensagem: `Erro ao gerar Pix: ${err.message}`
                } as any)
            } catch { /* ignora */ }
            return res.status(500).json({ error: err.message || 'Erro ao gerar Pix via PushinPay' })
        }
    }

    // ═══════════════════════════════════════
    // BLINDAGEM: PIX VIA MUNDPAY (FUNCIONANDO - UUID FIX)
    // NÃO ALTERAR ESTE BLOCO.
    // ═══════════════════════════════════════
    if (method === 'pix' && gateway === 'mundpay') {
        // ✅ VALIDAÇÃO DE NOME COMPLETO **ANTES** DE CRIAR O PEDIDO
        const validacaoNome = validarNomeCompleto(nome)
        if (!validacaoNome.valid) {
            // Log de auditoria para validação falha
            try {
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'audit',
                    gateway: 'mundpay',
                    evento: 'VALIDATION_FAILED',
                    pedido_id: null,
                    sucesso: false,
                    mensagem: `Validação falhou: ${validacaoNome.error} | Email: ${email} | Nome recebido: "${nome || ''}"`,
                    payload: {
                        nome_recebido: nome,
                        email,
                        valor,
                        checkout_slug,
                        erro: validacaoNome.error
                    }
                } as any)
            } catch (logErr) {
                console.error('[mundpay] Erro ao registrar log de validação:', logErr)
            }

            return res.status(400).json({
                success: false,
                error: validacaoNome.error
            })
        }

        // Validar se mundpay_url foi enviado (erro de configuração = 400, não 500)
        const { cpf, phone, mundpay_url } = req.body;

        if (!mundpay_url) {
            return res.status(400).json({
                success: false,
                error: 'URL do checkout MundPay não configurada para este produto. Configure o MundPay no painel admin.'
            });
        }

        try {
            console.log("[mundpay] Iniciando processamento:", { email, pid, mundpay_url: mundpay_url.slice(0, 50) + '...' })

            // 1. Registrar pedido pendente no SharkPay
            // ✅ MÍNIMO ABSOLUTO de colunas (só as essenciais e garantidas)
            const { data: insertData, error: insertError } = await supabase
                .from('pedidos')
                .insert({
                    id: pid,
                    email_comprador: email,
                    nome_comprador: nome,
                    valor: Number(valor),
                    metodo_pagamento: 'pix',
                    status: 'pendente',
                    gateway: 'mundpay'
                } as any)
                .select()
                .single()

            if (insertError) {
                console.error('[mundpay] ERRO CRÍTICO ao inserir pedido:', insertError)
                console.error('[mundpay] Código do erro:', insertError.code)
                console.error('[mundpay] Mensagem:', insertError.message)
                console.error('[mundpay] Detalhes:', insertError.details)
                console.error('[mundpay] Hint:', insertError.hint)
                console.error('[mundpay] Objeto completo:', JSON.stringify(insertError, null, 2))

                // Retornar mensagem específica do Supabase
                const mensagemErro = insertError.message || insertError.hint || insertError.details || 'Falha ao registrar pedido no banco';
                throw new Error(`[MundPay Insert] ${mensagemErro}`);
            }

            console.log('[mundpay] ✅ Pedido criado com sucesso:', pid)
            console.log('[mundpay] Dados do pedido:', JSON.stringify(insertData, null, 2))

            // 2. Montar URL do checkout MundPay
            const checkoutUrl = new URL(mundpay_url)
            if (nome) checkoutUrl.searchParams.set('name', nome)
            if (email) checkoutUrl.searchParams.set('email', email)
            if (cpf) {
                const cpfLimpo = cpf.replace(/\D/g, '')
                checkoutUrl.searchParams.set('document', cpfLimpo)
                checkoutUrl.searchParams.set('cpf', cpfLimpo)
            }
            if (phone) {
                const phoneDigits = phone.replace(/\D/g, '')
                checkoutUrl.searchParams.set('phone', phoneDigits)
                checkoutUrl.searchParams.set('phone_number', phoneDigits)
            }
            checkoutUrl.searchParams.set('locale', 'pt_BR')
            checkoutUrl.searchParams.set('lang', 'pt_BR')
            checkoutUrl.searchParams.set('currency', 'BRL')
            checkoutUrl.searchParams.set('country', 'BR')
            checkoutUrl.searchParams.set('payment_method', 'pix')
            checkoutUrl.searchParams.set('method', 'pix')
            checkoutUrl.searchParams.set('pay_method', 'pix')
            checkoutUrl.searchParams.set('external_id', pid)
            checkoutUrl.searchParams.set('metadata[pedido_id]', pid)
            checkoutUrl.searchParams.set('reference', pid)

            // 3. LOG
            try {
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'gateway',
                    gateway: 'mundpay',
                    evento: 'pix_gerado',
                    pedido_id: pid,
                    mensagem: `Checkout Pix iniciado via MundPay para ${email}`
                } as any)
            } catch { /* ignora */ }

            return res.status(200).json({
                checkout_url: checkoutUrl.toString(),
                pedido_id: pid,
                gateway: 'mundpay'
            });

        } catch (err: any) {
            console.error('[process-payment/mundpay]:', err)

            // Log de erro detalhado
            try {
                await supabase.from('pedidos').update({ status: 'falhou', erro: err.message } as any).eq('id', pid)
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'gateway',
                    gateway: 'mundpay',
                    evento: 'pix_erro',
                    pedido_id: pid,
                    sucesso: false,
                    mensagem: `Erro ao iniciar MundPay: ${err.message}`,
                    payload: { erro_stack: err.stack }
                } as any)
            } catch { /* ignora */ }

            // Retornar mensagem específica do erro (nunca genérica)
            const mensagemErro = err.message || 'Erro desconhecido ao processar pagamento MundPay';
            return res.status(500).json({
                success: false,
                error: mensagemErro
            });
        }
    }

    // ═══════════════════════════════════════
    // PIX VIA BUYPIX (NEW)
    // ═══════════════════════════════════════
    if (method === 'pix' && gateway === 'buypix') {
        // ✅ VALIDAÇÃO DE NOME COMPLETO **ANTES** DE CRIAR O PEDIDO
        const validacaoNome = validarNomeCompleto(nome)
        if (!validacaoNome.valid) {
            try {
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'audit',
                    gateway: 'buypix',
                    evento: 'VALIDATION_FAILED',
                    pedido_id: null,
                    sucesso: false,
                    mensagem: `Validação falhou: ${validacaoNome.error} | Email: ${email} | Nome recebido: "${nome || ''}"`,
                    payload: {
                        nome_recebido: nome,
                        email,
                        valor,
                        checkout_slug,
                        erro: validacaoNome.error
                    }
                } as any)
            } catch (logErr) {
                console.error('[buypix] Erro ao registrar log de validação:', logErr)
            }

            return res.status(400).json({
                success: false,
                error: validacaoNome.error
            })
        }

        let apiKey = process.env.BUYPIX_API_KEY || "";
        let webhookSecret = process.env.BUYPIX_WEBHOOK_SECRET || "";

        try {
            // Tentativa 1: buscar pela config do dono do produto
            if (productOwnerId) {
                const { data: integ } = await supabase
                    .from('integrations')
                    .select('config, enabled')
                    .eq('id', 'buypix')
                    .eq('user_id', productOwnerId)
                    .maybeSingle()

                if (integ?.enabled && integ.config?.buypix_api_key) {
                    apiKey = integ.config.buypix_api_key as string
                    webhookSecret = (integ.config.buypix_webhook_secret as string) || webhookSecret
                    console.log('[buypix] API Key carregada via productOwnerId')
                }
            }

            // Tentativa 2: Fallback Global (busca registro onde user_id é nulo)
            if (!apiKey || apiKey.includes('placeholder')) {
                const { data: globalInteg } = await supabase
                    .from('integrations')
                    .select('config, enabled')
                    .eq('id', 'buypix')
                    .is('user_id', null)
                    .maybeSingle()

                if (globalInteg?.config?.buypix_api_key) {
                    apiKey = globalInteg.config.buypix_api_key as string
                    webhookSecret = (globalInteg.config.buypix_webhook_secret as string) || webhookSecret
                    console.log('[buypix] API Key carregada via fallback global (user_id null)')
                }
            }

            // Tentativa 3: Backup Agressivo (busca qualquer registro buypix com config)
            if (!apiKey || apiKey.includes('placeholder')) {
                const { data: anyIntegs } = await supabase
                    .from('integrations')
                    .select('config, enabled')
                    .eq('id', 'buypix')
                    .limit(5)

                if (anyIntegs && anyIntegs.length > 0) {
                    const valid = anyIntegs.find(i => i.config?.buypix_api_key);
                    if (valid) {
                        apiKey = valid.config.buypix_api_key as string
                        webhookSecret = (valid.config.buypix_webhook_secret as string) || webhookSecret
                        console.log('[buypix] API Key carregada via backup agressivo')
                    }
                }
            }
        } catch (e: any) {
            console.warn('[buypix] Erro crítico na busca de config:', e.message)
        }

        if (!apiKey || apiKey.length < 5 || apiKey.includes('placeholder')) {
            return res.status(500).json({ error: 'BuyPix API Key não configurada.' })
        }

        try {
            // 1. Registrar pedido pendente
            try {
                await supabase.from('pedidos').insert({
                    id: pid,
                    user_id: productOwnerId,
                    email_comprador: email,
                    nome_comprador: nome || 'Cliente',
                    valor: Number(valor),
                    metodo_pagamento: 'pix',
                    status: 'pendente',
                    gateway: 'buypix',
                    utm_source: utm_source || null,
                    checkout_slug: checkout_slug || null,
                    buypix_status: 'pending'
                } as any)
            } catch (e) {
                console.error('[buypix] Erro ao inserir pedido:', e)
            }

            // 2. Criar depósito na BuyPix
            console.log(`[buypix] Chamando API com key: ${apiKey.slice(0, 8)}... valor: ${valor}`)

            const buyPixResp = await fetch('https://buypix.me/api/v1/deposits', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Idempotency-Key': pid
                },
                body: JSON.stringify({
                    amount: Math.round(Number(valor) * 100),
                    external_id: pid,
                    description: `Pedido ${pid}`
                })
            })

            const rawText = await buyPixResp.text()
            console.log(`[buypix] Status: ${buyPixResp.status} | Resposta: ${rawText.slice(0, 500)}`)

            let buyPixData: any
            try {
                buyPixData = JSON.parse(rawText)
            } catch {
                throw new Error(`BuyPix retornou resposta inválida: ${rawText.slice(0, 200)}`)
            }

            if (!buyPixResp.ok) {
                throw new Error(`BuyPix ${buyPixResp.status}: ${buyPixData.message || buyPixData.error || JSON.stringify(buyPixData)}`)
            }

            // 3. Extrair QR Code — suporta múltiplos formatos de resposta da API
            const qrCodeText = buyPixData.pix_qr_code
                || buyPixData.qr_code
                || buyPixData.qrCode
                || buyPixData.copy_paste
                || buyPixData.pix_copy_paste
                || buyPixData.code
                || buyPixData.data?.qr_code
                || buyPixData.data?.pix_qr_code
                || ''

            const qrCodeBase64 = buyPixData.pix_qr_code_base64
                || buyPixData.qr_code_base64
                || buyPixData.qrCodeBase64
                || buyPixData.image
                || buyPixData.qr_code_image
                || buyPixData.data?.qr_code_base64
                || ''

            const depositId = buyPixData.id || buyPixData.deposit_id || buyPixData.data?.id || pid

            console.log(`[buypix] QR Text: ${qrCodeText ? 'OK' : 'VAZIO'} | Base64: ${qrCodeBase64 ? 'OK' : 'VAZIO'} | ID: ${depositId}`)

            // 4. Atualizar pedido com dados do QR Code
            try {
                await supabase.from('pedidos').update({
                    buypix_deposit_id: depositId,
                    buypix_qr_code: qrCodeText,
                    buypix_qr_code_base64: qrCodeBase64,
                    buypix_expires_at: buyPixData.expires_at || buyPixData.expiration || null,
                    gateway_payment_id: depositId
                } as any).eq('id', pid)
            } catch (e) {
                console.error('[buypix] Erro ao atualizar pedido com QR:', e)
            }

            // 5. Log
            try {
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'gateway',
                    gateway: 'buypix',
                    evento: 'pix_gerado',
                    pedido_id: pid,
                    payload: buyPixData,
                    sucesso: true,
                    mensagem: `Pix gerado via BuyPix para ${email} | QR: ${qrCodeText ? 'presente' : 'ausente'}`
                } as any)
            } catch { /* ignora */ }

            return res.status(200).json({
                qr_code: qrCodeBase64 || qrCodeText,
                qr_code_text: qrCodeText,
                expires_at: buyPixData.expires_at || buyPixData.expiration || new Date(Date.now() + 30 * 60000).toISOString(),
                pedido_id: pid,
                gateway: 'buypix'
            })

        } catch (err: any) {
            console.error('[process-payment/pix/buypix]:', err)
            try {
                await supabase.from('pedidos').update({ status: 'falhou', erro: err.message } as any).eq('id', pid)
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'gateway',
                    gateway: 'buypix',
                    evento: 'pix_erro',
                    pedido_id: pid,
                    sucesso: false,
                    mensagem: `Erro BuyPix: ${err.message}`
                } as any)
            } catch { /* ignora */ }
            return res.status(500).json({ error: err.message || 'Erro ao gerar Pix via BuyPix' })
        }
    }

    return res.status(400).json({ error: `Combinação inválida: method=${method}, gateway=${gateway}` })
}
