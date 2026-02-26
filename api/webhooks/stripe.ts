import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

/**
 * Stripe Webhook Handler
 * URL configurada no painel Stripe: https://sharkpaycheckout.vercel.app/api/webhooks/stripe
 * Aceita dois webhook secrets (snapshot + minimal) configurados no painel Stripe
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Tentar os dois webhook secrets (snapshot e thin)
    const secrets = [
        process.env.STRIPE_WEBHOOK_SECRET,
        process.env.STRIPE_WEBHOOK_SECRET_THIN,
    ].filter(Boolean) as string[]

    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    if (!stripeKey || !stripeKey.startsWith('sk_')) {
        console.error('[Stripe Webhook] STRIPE_SECRET_KEY inválida ou ausente')
        return res.status(500).json({ error: 'Stripe não configurado' })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })

    // Verificar assinatura com cada secret disponível
    const sig = req.headers['stripe-signature'] as string
    let event: Stripe.Event | null = null

    // O body precisa ser raw (Buffer) para verificação de assinatura
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body))

    for (const secret of secrets) {
        try {
            event = stripe.webhooks.constructEvent(rawBody, sig, secret)
            break // Encontrou o secret correto
        } catch {
            // Tentar próximo secret
        }
    }

    // Fallback: se não conseguiu verificar (ex: dev local sem sig), processar body direto
    if (!event) {
        if (process.env.VERCEL_ENV === 'production') {
            console.error('[Stripe Webhook] Assinatura inválida')
            return res.status(400).json({ error: 'Invalid signature' })
        }
        // Em dev, processar sem verificação
        event = req.body as Stripe.Event
    }

    console.log(`[Stripe Webhook] Evento: ${event.type}`)

    try {
        switch (event.type) {
            // ─── Pagamento via Checkout Session ──────────────────
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const pedidoId = session.metadata?.pedido_id

                if (!pedidoId) {
                    console.warn('[Stripe Webhook] checkout.session sem pedido_id no metadata')
                    return res.status(200).json({ received: true })
                }

                await supabase
                    .from('pedidos')
                    .update({
                        status: 'pago',
                        pago_em: new Date().toISOString(),
                        stripe_session_id: session.id,
                        stripe_payment_intent: typeof session.payment_intent === 'string'
                            ? session.payment_intent
                            : null
                    } as any)
                    .eq('id', pedidoId)

                console.log(`[Stripe Webhook] ✅ Pedido ${pedidoId} → PAGO`)

                // Notificar N8N para entrega digital
                const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL
                if (n8nUrl && !n8nUrl.includes('seudominio')) {
                    fetch(n8nUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            event: 'payment_confirmed',
                            source: 'stripe',
                            pedido_id: pedidoId,
                            session_id: session.id,
                            email: session.customer_details?.email || '',
                            nome: session.customer_details?.name || '',
                            valor: (session.amount_total || 0) / 100,
                            metodo: 'cartao',
                            timestamp: new Date().toISOString()
                        })
                    }).catch(e => console.error('[N8N] Erro:', e))
                }
                break
            }

            // ─── PaymentIntent confirmado diretamente ─────────────
            case 'payment_intent.succeeded': {
                const intent = event.data.object as Stripe.PaymentIntent
                const pedidoId = intent.metadata?.pedido_id
                if (pedidoId) {
                    await supabase
                        .from('pedidos')
                        .update({
                            status: 'pago',
                            pago_em: new Date().toISOString(),
                            stripe_payment_intent: intent.id
                        } as any)
                        .eq('id', pedidoId)
                    console.log(`[Stripe Webhook] ✅ PaymentIntent → Pedido ${pedidoId} PAGO`)
                }
                break
            }

            // ─── Pagamento recusado ───────────────────────────────
            case 'payment_intent.payment_failed': {
                const intent = event.data.object as Stripe.PaymentIntent
                const pedidoId = intent.metadata?.pedido_id
                const errMsg = intent.last_payment_error?.message || 'Pagamento recusado'
                console.log(`[Stripe Webhook] ❌ Pagamento falhou: ${errMsg}`)

                if (pedidoId) {
                    await supabase.from('pedidos')
                        .update({ status: 'falhou', erro: errMsg } as any)
                        .eq('id', pedidoId)
                } else {
                    await supabase.from('pedidos')
                        .update({ status: 'falhou', erro: errMsg } as any)
                        .eq('stripe_payment_intent', intent.id)
                }
                break
            }

            default:
                console.log(`[Stripe Webhook] Evento não tratado: ${event.type}`)
        }

        return res.status(200).json({ received: true })
    } catch (err: any) {
        console.error('[Stripe Webhook] Erro ao processar:', err)
        return res.status(500).json({ error: 'Erro interno' })
    }
}
