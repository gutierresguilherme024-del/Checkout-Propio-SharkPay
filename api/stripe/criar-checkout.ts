import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Garantir que a resposta seja sempre JSON
    res.setHeader('Content-Type', 'application/json')

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Buscar chave no banco (SaaS) ou usar Env (Uso Próprio)
    let stripeKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY

    try {
        const { data: integ, error: dbError } = await supabase
            .from('integrations')
            .select('config, enabled')
            .eq('id', 'stripe')
            .single()

        if (!dbError && integ?.enabled && integ.config?.secKey) {
            stripeKey = integ.config.secKey as string
            console.log('[Stripe] Usando chave configurada no banco de dados.')
        }
    } catch (e) {
        console.warn('[Stripe] Erro ao buscar no banco, usando Env de fallback')
    }

    // Validação final da chave
    const isPlaceholder = !stripeKey ||
        stripeKey === 'sk_live_placeholder' ||
        stripeKey === 'sk_test_placeholder' ||
        stripeKey.includes('placeholder');

    if (isPlaceholder) {
        console.error('[Stripe] Erro: Chave secreta não configurada ou é placeholder.')
        return res.status(500).json({ error: 'STRIPE_SECRET_KEY não configurada. Configure em Admin -> Pagamentos.' })
    }

    const stripe = new Stripe(stripeKey as string, { apiVersion: '2025-01-27' as any })

    try {
        const { nome, preco, email, pedido_id, checkout_slug, utm_source } = req.body

        if (!preco || !email) {
            return res.status(400).json({ error: 'Dados insuficientes para criar checkout (preco/email faltando)' })
        }

        const appUrl = process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app'

        // 1. Registrar pedido no Supabase
        const { error: insertError } = await supabase.from('pedidos').insert({
            id: pedido_id,
            email_comprador: email,
            nome_comprador: nome || 'Cliente',
            valor: preco,
            metodo_pagamento: 'card',
            status: 'pendente',
            utm_source: utm_source || null
        })

        if (insertError) {
            console.error('[Stripe] Erro Supabase:', insertError)
            return res.status(500).json({ error: `Erro ao registrar pedido: ${insertError.message}` })
        }

        // 2. Criar Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: { name: nome },
                    unit_amount: Math.round(preco * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            customer_email: email,
            success_url: `${appUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}&pedido_id=${pedido_id}`,
            cancel_url: checkout_slug ? `${appUrl}/checkout/${checkout_slug}` : appUrl,
            metadata: { pedido_id, utm_source: utm_source || '' }
        })

        return res.status(200).json({ checkout_url: session.url, session_id: session.id })
    } catch (err) {
        const error = err as Error;
        console.error('Erro Stripe:', error)
        return res.status(500).json({ error: error.message || 'Erro interno no servidor de pagamentos' })
    }
}
