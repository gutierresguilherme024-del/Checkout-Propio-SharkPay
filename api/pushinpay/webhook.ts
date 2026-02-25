import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end()

    const payload = req.body

    if (payload.status !== 'PAID') {
        return res.status(200).json({ ok: true })
    }

    // Atualiza no banco
    await supabase
        .from('pedidos')
        .update({ status: 'pago', pago_em: new Date().toISOString() })
        .eq('id', payload.external_reference)
        .eq('status', 'pendente')

    // Notifica N8N
    if (process.env.VITE_N8N_WEBHOOK_URL) {
        await fetch(process.env.VITE_N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pedido_id: payload.external_reference,
                valor: payload.value / 100,
                metodo: 'pix'
            })
        })
    }

    res.status(200).json({ ok: true })
}
