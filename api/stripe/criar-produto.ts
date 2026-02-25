import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' })

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
        return res.status(500).json({ erro: 'STRIPE_SECRET_KEY não configurada no ambiente.' })
    }

    try {
        const stripe = new Stripe(stripeKey)
        const { nome, preco, descricao, success_url, cancel_url } = req.body

        if (!nome || !preco) return res.status(400).json({ erro: 'nome e preco são obrigatórios' })

        const produto = await stripe.products.create({ name: nome, description: descricao || '' })
        const price = await stripe.prices.create({
            product: produto.id,
            unit_amount: Math.round(Number(preco) * 100),
            currency: 'brl',
        })
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price: price.id, quantity: 1 }],
            success_url: success_url || 'https://sharkpaycheckout.vercel.app/sucesso?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: cancel_url || 'https://sharkpaycheckout.vercel.app/',
            payment_method_types: ['card'],
        })

        return res.status(200).json({
            stripe_product_id: produto.id,
            stripe_price_id: price.id,
            checkout_url: session.url
        })
    } catch (erro: any) {
        return res.status(500).json({ erro: erro.message })
    }
}
