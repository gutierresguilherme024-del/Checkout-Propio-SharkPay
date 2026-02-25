import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

if (!publishableKey) {
    console.warn('VITE_STRIPE_PUBLISHABLE_KEY não configurada. O Stripe não funcionará no checkout.')
}

export const stripePromise = publishableKey ? loadStripe(publishableKey) : null
