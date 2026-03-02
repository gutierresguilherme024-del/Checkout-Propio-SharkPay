import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

    const signature = req.headers['x-webhook-signature'] as string

    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const payload = req.body
    const depositId = payload.data?.id

    if (!depositId) {
        return res.status(200).json({ received: false, error: 'Dados inválidos' })
    }

    try {
        // 1. Localizar o pedido pelo ID do depósito da BuyPix
        const { data: pedido } = await supabase
            .from('pedidos')
            .select('*')
            .eq('buypix_deposit_id', depositId)
            .maybeSingle()

        if (!pedido) {
            console.warn(`[BuyPix Webhook] Pedido não encontrado para depósito ${depositId}`)
            return res.status(200).json({ received: true, message: 'Pedido não localizado' })
        }

        // 2. Verificar Assinatura (Segurança)
        // Buscamos o secret do usuário dono do produto (SaaS)
        let webhookSecret = process.env.BUYPIX_WEBHOOK_SECRET || ""

        const { data: integ } = await supabase
            .from('integrations')
            .select('config')
            .eq('id', 'buypix')
            .eq('user_id', pedido.user_id)
            .maybeSingle()

        if (integ?.config?.buypix_webhook_secret) {
            webhookSecret = integ.config.buypix_webhook_secret as string
        }

        if (webhookSecret && signature) {
            const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body))
            const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')

            if (expected !== signature) {
                console.error('[BuyPix Webhook] Assinatura inválida')
                if (process.env.VERCEL_ENV === 'production') {
                    return res.status(401).json({ error: 'Invalid signature' })
                }
            }
        }

        const event = payload.event
        console.log(`[BuyPix Webhook] Evento: ${event} para depósito ${depositId}`)

        // 3. Mapear status
        let statusUpdate = pedido.status
        let buypixStatus = payload.data.status

        switch (event) {
            case 'deposit.completed':
                statusUpdate = 'pago'
                break
            case 'deposit.expired':
                statusUpdate = 'expirado'
                break
            case 'deposit.canceled':
                statusUpdate = 'cancelado'
                break
            case 'deposit.under_review':
                statusUpdate = 'em_analise'
                break
            case 'deposit.refunded':
                statusUpdate = 'reembolsado'
                break
            case 'deposit.error':
                statusUpdate = 'erro'
                break
        }

        // 4. Atualizar o pedido
        await supabase
            .from('pedidos')
            .update({
                status: statusUpdate,
                buypix_status: buypixStatus,
                pago_em: statusUpdate === 'pago' ? new Date().toISOString() : pedido.pago_em
            } as any)
            .eq('id', pedido.id)

        // 5. Log de Sistema
        await supabase.from('logs_sistema').insert({
            user_id: pedido.user_id,
            tipo: 'webhook',
            gateway: 'buypix',
            evento: event,
            pedido_id: pedido.id,
            payload: payload,
            mensagem: `Evento BuyPix: ${event} (${buypixStatus})`
        } as any)

        // 6. Notificar N8N para entrega (se pago)
        if (statusUpdate === 'pago' && pedido.status !== 'pago') {
            const { data: n8nInteg } = await supabase
                .from('integrations')
                .select('config, enabled')
                .eq('id', 'main_webhook')
                .eq('user_id', pedido.user_id)
                .maybeSingle()

            const n8nUrl = n8nInteg?.enabled ? n8nInteg.config?.url : (process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL)

            if (n8nUrl && !String(n8nUrl).includes('seudominio')) {
                fetch(n8nUrl as string, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'payment_confirmed',
                        source: 'buypix',
                        pedido_id: pedido.id,
                        email: pedido.email_comprador,
                        nome: pedido.nome_comprador,
                        valor: pedido.valor,
                        metodo: 'pix',
                        timestamp: new Date().toISOString()
                    })
                }).catch(e => console.error('[N8N] Erro:', e))
            }
        }

        return res.status(200).json({ received: true })

    } catch (error: any) {
        console.error('[BuyPix Webhook] Erro crítico:', error)
        return res.status(500).json({ error: error.message })
    }
}
