/**
 * Cria uma sessão de checkout Stripe e redireciona o usuário
 */
export async function criarCheckoutStripe(dados: {
    produto_id?: string
    nome: string
    preco: number
    email: string
    pedido_id: string
    checkout_slug?: string
    utm_source?: string
}): Promise<{ checkout_url: string; session_id: string }> {
    const response = await fetch('/api/stripe/criar-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })

    const contentType = response.headers.get('content-type')
    if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
            const erro = await response.json()
            throw new Error(erro.error || 'Erro ao criar checkout Stripe')
        }
        throw new Error('Servidor de pagamentos offline ou erro na Vercel (500). Verifique os logs.')
    }

    return response.json()
}

import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
)
