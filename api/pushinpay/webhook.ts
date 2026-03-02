import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end()

    const payload = req.body
    console.log('[PushinPay Webhook] Recebido:', JSON.stringify(payload))

    try {
        // 1. Localizar o pedido (com fallback inteligente)
        let finalId = payload.external_reference;
        let pedido: any = null;

        if (finalId) {
            const { data } = await supabase.from('pedidos').select('*').eq('id', finalId).single();
            pedido = data;
        }

        // FALLBACK: Se não encontrou por ID, buscar por Valor + Email (Evita perda de Pix)
        if (!pedido && payload.value && (payload.customer?.email || payload.email)) {
            const emailBusca = (payload.customer?.email || payload.email).toLowerCase();
            const valorBusca = (payload.value || 0) / 100; // Centavos para Real

            const { data: fallbackData } = await supabase
                .from('pedidos')
                .select('*')
                .eq('status', 'pendente')
                .eq('valor', valorBusca)
                .ilike('email', emailBusca)
                .order('criado_em', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fallbackData) {
                pedido = fallbackData;
                finalId = fallbackData.id;
            }
        }

        // LOG DE AUDITORIA
        await supabase.from('logs_sistema').insert({
            tipo: 'webhook',
            gateway: 'pushinpay',
            evento: payload.status,
            pedido_id: finalId || null,
            payload: payload,
            mensagem: pedido
                ? `Webhook PushinPay associado ao pedido ${finalId} (${payload.status})`
                : `Webhook PushinPay recebido SEM ASSOCIAÇÃO: ${payload.status}`
        } as any);

        // Se não for status PAID, apenas confirma recebimento
        if (payload.status !== 'PAID') {
            return res.status(200).json({ ok: true });
        }

        if (!pedido) {
            return res.status(200).json({ ok: true, warn: 'Pedido não localizado para aprovação' });
        }

        // 2. Atualizar pedido no banco
        const { error: updateError } = await supabase
            .from('pedidos')
            .update({
                status: 'pago',
                pago_em: new Date().toISOString()
            })
            .eq('id', finalId);

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
                        valor: (payload.value || 0) / 100,
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
        await supabase.from('logs_sistema').insert({
            tipo: 'webhook',
            gateway: 'pushinpay',
            evento: 'erro_webhook',
            pedido_id: payload.external_reference,
            sucesso: false,
            mensagem: `Erro no processamento do webhook: ${error.message}`
        } as any)
        return res.status(500).json({ ok: false, message: error.message })
    }
}
