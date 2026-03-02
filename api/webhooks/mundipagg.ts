import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

// Mundipagg Webhook Secret
const MUNDIPAGG_WEBHOOK_SECRET = process.env.MUNDIPAGG_WEBHOOK_SECRET || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const body = req.body;
        const rawBody = JSON.stringify(body);
        const eventType = body.type;

        // LOG DE RECEBIMENTO DE WEBHOOK
        await supabase.from('logs_sistema').insert({
            tipo: 'webhook',
            gateway: 'mundipagg',
            evento: eventType,
            pedido_id: body.data?.id || body.data?.metadata?.pedido_id,
            payload: body,
            mensagem: `Webhook Mundipagg recebido: ${eventType}`
        } as any)

        console.log('[Mundipagg Webhook] Evento recebido:', body.type)
        // Mapeamento de Mundipagg para o Schema SharkPay (tabela 'pedidos')
        // Mundipagg envia dados em body.data
        const data = body.data;

        switch (eventType) {
            case 'invoice.status_changed':
            case 'payment.status_changed':
            case 'subscription.status_changed':
                await handleOrderUpdate(data);
                break;
            default:
                console.log('[Mundipagg Webhook] Evento não tratado:', eventType)
        }

        // Notificar N8N também (opcional, mas recomendado pelo usuário)
        const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL;
        if (n8nUrl && !n8nUrl.includes('seudominio')) {
            fetch(n8nUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: rawBody
            }).catch(e => console.error('Erro ao notificar N8N:', e));
        }

        return res.status(200).json({ received: true })
    } catch (error: any) {
        console.error('[Mundipagg Webhook] Erro:', error)
        return res.status(500).json({ error: 'Webhook processing failed', message: error.message })
    }
}

async function handleOrderUpdate(data: any) {
    // O ID que usamos para buscar pode ser invoice_id, payment_id ou subscription_id
    const gatewayId = data.id;
    const status = data.status; // 'paid', 'canceled', etc.

    console.log(`[Mundipagg Webhook] Atualizando pedido ${gatewayId} para status: ${status}`);

    // Mapear status Mundipagg para status SharkPay
    let finalStatus = 'pendente';
    if (['paid', 'captured', 'succeeded', 'active'].includes(status)) {
        finalStatus = 'pago';
    } else if (['canceled', 'failed', 'expired'].includes(status)) {
        finalStatus = 'cancelado';
    }

    const { error } = await supabase
        .from('pedidos')
        .update({
            status: finalStatus,
            entregue_em: finalStatus === 'pago' ? new Date().toISOString() : null
        })
        .eq('gateway_payment_id', gatewayId);

    if (error) {
        console.error('[Mundipagg Webhook] Erro ao atualizar Supabase:', error);
        // Fallback: tentar pelo id do pedido se estiver presente no metadata
        const pedidoId = data.metadata?.pedido_id || data.external_id;
        if (pedidoId) {
            await supabase.from('pedidos').update({ status: finalStatus }).eq('id', pedidoId);
        }
    }
}

// Helper function para comparar HMAC de forma segura contra timing attacks
function hmacEqual(signature1: string, signature2: string): boolean {
    if (signature1.length !== signature2.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature1), Buffer.from(signature2));
}
