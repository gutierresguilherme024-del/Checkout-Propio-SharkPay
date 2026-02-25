import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end()

    const payload = req.body
    console.log('[PushinPay Webhook] Recebido:', JSON.stringify(payload))

    // Se não for status PAID, apenas confirma recebimento
    if (payload.status !== 'PAID') {
        return res.status(200).json({ ok: true, message: `Status ${payload.status} recebido` })
    }

    try {
        // 1. Atualizar pedido no banco
        const { data: pedido, error: updateError } = await supabase
            .from('pedidos')
            .update({
                status: 'pago',
                pago_em: new Date().toISOString()
            })
            .eq('id', payload.external_reference)
            .eq('status', 'pendente')
            .select()
            .single()

        if (updateError) {
            console.error('[PushinPay Webhook] Erro ao atualizar pedido:', updateError)
        }

        // 2. Notificar N8N para automação (entrega de produto)
        const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL
        if (n8nUrl && !n8nUrl.includes('seudominio')) {
            try {
                await fetch(n8nUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'payment_confirmed',
                        source: 'pushinpay',
                        pedido_id: payload.external_reference,
                        valor: payload.value / 100,
                        metodo: 'pix',
                        email: pedido?.email || '',
                        nome: pedido?.nome || '',
                        timestamp: new Date().toISOString()
                    })
                })
                console.log('[PushinPay Webhook] Notificação enviada ao N8N')
            } catch (n8nErr) {
                console.error('[PushinPay Webhook] Erro ao notificar N8N:', n8nErr)
            }
        }

        return res.status(200).json({ ok: true, message: 'Pagamento confirmado' })
    } catch (error: any) {
        console.error('[PushinPay Webhook] Erro:', error)
        return res.status(500).json({ ok: false, message: error.message })
    }
}
