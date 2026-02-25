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
}): Promise<{ checkout_url: string; session_id: string }> {
    const response = await fetch('/api/stripe/criar-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })

    if (!response.ok) {
        const erro = await response.json()
        throw new Error(erro.error || 'Erro ao criar checkout Stripe')
    }

    return response.json()
}

import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

if (!publishableKey) {
    console.warn('VITE_STRIPE_PUBLISHABLE_KEY não configurada. O Stripe não funcionará no checkout.')
}

export const stripePromise = publishableKey ? loadStripe(publishableKey) : null
