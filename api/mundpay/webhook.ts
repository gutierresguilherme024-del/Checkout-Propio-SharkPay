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

    // Status comuns de aprovação
    const statusSucesso = ['paid', 'approved', 'succeeded', 'pago', 'sale_approved', 'aprovado'];

    try {
        // 1. Tentar encontrar o pedido
        let finalPedidoId = pedidoId;
        let pedido: any = null;

        if (finalPedidoId) {
            const { data } = await supabase.from('pedidos').select('*').eq('id', finalPedidoId).single();
            pedido = data;
        }

        // FALLBACK: Se não encontrou por ID, tenta por Valor + Email (Evita perdas na MundPay/Scraper)
        if (!pedido && payload.amount && (payload.customer?.email || payload.email)) {
            const emailBusca = (payload.customer?.email || payload.email).toLowerCase();
            const valorBusca = payload.amount || payload.valor;

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
                finalPedidoId = fallbackData.id;
            }
        }

        // LOG DE RECEBIMENTO
        await supabase.from('logs_sistema').insert({
            tipo: 'webhook',
            gateway: 'mundpay',
            evento: status,
            pedido_id: finalPedidoId || null,
            payload: payload,
            mensagem: pedido
                ? `Webhook MundPay associado ao pedido ${finalPedidoId} (${status})`
                : `Webhook MundPay recebido SUB-ÓTIMO (Pedido não localizado): ${status}`
        } as any);

        if (!statusSucesso.includes(status)) return res.status(200).json({ ok: true });
        if (!pedido) return res.status(200).json({ ok: true, warn: 'Pedido não localizado para aprovação' });

        // 2. Atualizar pedido
        const { error: updateError } = await supabase
            .from('pedidos')
            .update({
                status: 'pago',
                pago_em: new Date().toISOString()
            })
            .eq('id', finalPedidoId);

        if (updateError) throw updateError;

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
        await supabase.from('logs_sistema').insert({
            tipo: 'webhook',
            gateway: 'mundpay',
            evento: 'erro_webhook',
            pedido_id: pedidoId,
            sucesso: false,
            mensagem: `Erro no processamento do webhook: ${error.message}`
        } as any)
        return res.status(500).json({ ok: false, message: error.message })
    }
}
