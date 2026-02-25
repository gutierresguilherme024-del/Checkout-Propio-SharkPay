export const webhookRoutes = {
    stripe: '/api/webhooks/stripe',
    mundipagg: '/api/webhooks/mundipagg',
    pushinpay: '/api/pushinpay/webhook',
    mundpay: '/api/mundpay/webhook',
    n8n: '/api/webhooks/n8n'
} as const;
