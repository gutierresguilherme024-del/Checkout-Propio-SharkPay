import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27' as any,
})

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event: Stripe.Event

    try {
        if (sig && webhookSecret) {
            // Verificar assinatura (produção)
            const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
            event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
        } else {
            // Sem signature check (dev)
            event = req.body as Stripe.Event
        }
    } catch (err: any) {
        console.error('[Stripe Webhook] Erro de assinatura:', err.message)
        return res.status(400).json({ error: `Webhook Error: ${err.message}` })
    }

    console.log(`[Stripe Webhook] Evento recebido: ${event.type}`)

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session

                // Atualizar pedido no banco
                const { error: dbError } = await supabase
                    .from('pedidos')
                    .update({
                        status: 'pago',
                        pago_em: new Date().toISOString(),
                        stripe_session_id: session.id,
                        stripe_payment_intent: session.payment_intent
                    })
                    .eq('stripe_session_id', session.id)

                if (dbError) {
                    console.error('[Stripe Webhook] Erro ao atualizar pedido:', dbError)
                }

                // Notificar N8N
                const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL
                if (n8nUrl && !n8nUrl.includes('seudominio')) {
                    await fetch(n8nUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            event: 'payment_confirmed',
                            source: 'stripe',
                            session_id: session.id,
                            email: session.customer_details?.email || '',
                            nome: session.customer_details?.name || '',
                            valor: (session.amount_total || 0) / 100,
                            metodo: 'cartao',
                            timestamp: new Date().toISOString()
                        })
                    }).catch(e => console.error('[Stripe Webhook] Erro N8N:', e))
                }

                console.log(`[Stripe Webhook] Pagamento confirmado: ${session.id}`)
                break
            }

            case 'payment_intent.payment_failed': {
                const intent = event.data.object as Stripe.PaymentIntent
                console.log(`[Stripe Webhook] Pagamento falhou: ${intent.id}`)

                await supabase
                    .from('pedidos')
                    .update({
                        status: 'falhou',
                        erro: intent.last_payment_error?.message || 'Pagamento recusado'
                    })
                    .eq('stripe_payment_intent', intent.id)
                break
            }

            default:
                console.log(`[Stripe Webhook] Evento não tratado: ${event.type}`)
        }

        return res.status(200).json({ received: true })
    } catch (error: any) {
        console.error('[Stripe Webhook] Erro:', error)
        return res.status(500).json({ error: error.message })
    }
}
