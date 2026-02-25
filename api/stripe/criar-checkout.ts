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

    try {
        const { produto_id, nome, preco, email, pedido_id, checkout_slug } = req.body

        if (!nome || !preco) {
            return res.status(400).json({ error: 'Nome e preço são obrigatórios' })
        }

        const appUrl = process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app'

        // 1. Criar sessão de Checkout do Stripe
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: email || undefined,
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: nome,
                    },
                    unit_amount: Math.round(Number(preco) * 100), // Centavos
                },
                quantity: 1,
            }],
            success_url: `${appUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}&pedido=${pedido_id}`,
            cancel_url: checkout_slug ? `${appUrl}/checkout/${checkout_slug}` : `${appUrl}`,
            metadata: {
                pedido_id: pedido_id || '',
                produto_id: produto_id || '',
                source: 'sharkpay_checkout'
            }
        })

        // 2. Registrar pedido no Supabase
        if (pedido_id) {
            await supabase
                .from('pedidos')
                .upsert({
                    id: pedido_id,
                    email: email || '',
                    nome: email || '', // Will be updated by webhook
                    valor: Number(preco),
                    metodo: 'cartao',
                    status: 'pendente',
                    stripe_session_id: session.id,
                    criado_em: new Date().toISOString()
                })
        }

        return res.status(200).json({
            checkout_url: session.url,
            session_id: session.id
        })
    } catch (error: any) {
        console.error('[Stripe Checkout] Erro:', error)
        return res.status(500).json({ error: error.message })
    }
}
