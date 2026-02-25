import Stripe from 'stripe'

// Note:process.env.STRIPE_SECRET_KEY must be set in Vercel envs
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27' as any,
})

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    try {
        const { nome, preco, descricao } = req.body

        if (!nome || !preco) {
            return res.status(400).json({ error: 'Nome e preco são obrigatórios' })
        }

        // 1. Criar Produto no Stripe
        const produto = await stripe.products.create({
            name: nome,
            description: descricao || '',
        })

        // 2. Criar Preço para o Produto
        const price = await stripe.prices.create({
            product: produto.id,
            unit_amount: Math.round(Number(preco) * 100),
            currency: 'brl',
        })

        // 3. Criar uma Session de Checkout para teste/link direto
        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price: price.id, quantity: 1 }],
            success_url: `${process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app'}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app'}/checkout`,
        })

        return res.status(200).json({
            stripe_product_id: produto.id,
            stripe_price_id: price.id,
            checkout_url: checkoutSession.url
        })
    } catch (error: any) {
        console.error('Erro na API do Stripe:', error)
        return res.status(500).json({ error: error.message })
    }
}
