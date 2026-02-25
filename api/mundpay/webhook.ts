import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end()

    const payload = req.body
    console.log('[MundPay Webhook] Recebido:', JSON.stringify(payload))

    // Tentativa de extrair o ID do pedido de campos comuns
    // MundPay costuma usar metadata ou external_id
    const pedidoId = payload.external_id || payload.metadata?.pedido_id || payload.reference;
    const status = (payload.status || payload.event || '').toLowerCase();

    // Se não houver pedidoId ou não for um status de sucesso, apenas registramos
    if (!pedidoId) {
        console.warn('[MundPay Webhook] Pedido ID não encontrado no payload')
        return res.status(200).json({ ok: true, message: 'Recebido, mas sem Pedido ID' })
    }

    // Status comuns de aprovação: 'paid', 'approved', 'succeeded', 'pago'
    const statusSucesso = ['paid', 'approved', 'succeeded', 'pago', 'sale_approved'];

    if (!statusSucesso.includes(status)) {
        console.log(`[MundPay Webhook] Status ${status} ignorado para o pedido ${pedidoId}`);
        return res.status(200).json({ ok: true, message: `Status ${status} recebido` })
    }

    try {
        // 1. Atualizar pedido no banco
        const { data: pedido, error: updateError } = await supabase
            .from('pedidos')
            .update({
                status: 'pago',
                pago_em: new Date().toISOString()
            })
            .eq('id', pedidoId)
            .eq('status', 'pendente')
            .select()
            .single()

        if (updateError) {
            console.error('[MundPay Webhook] Erro ao atualizar pedido:', updateError)
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
                        source: 'mundpay',
                        pedido_id: pedidoId,
                        valor: payload.amount || payload.valor || 0,
                        metodo: payload.payment_method || 'desconhecido',
                        email: pedido?.email || payload.customer?.email || '',
                        nome: pedido?.nome || payload.customer?.name || '',
                        timestamp: new Date().toISOString()
                    })
                })
                console.log('[MundPay Webhook] Notificação enviada ao N8N')
            } catch (n8nErr) {
                console.error('[MundPay Webhook] Erro ao notificar N8N:', n8nErr)
            }
        }

        return res.status(200).json({ ok: true, message: 'Pagamento MundPay confirmado' })
    } catch (error: any) {
        console.error('[MundPay Webhook] Erro:', error)
        return res.status(500).json({ ok: false, message: error.message })
    }
}
