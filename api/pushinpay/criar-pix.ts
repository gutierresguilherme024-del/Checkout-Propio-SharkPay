import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const token = process.env.PUSHINPAY_TOKEN || process.env.VITE_PUSHINPAY_TOKEN
    if (!token || token === 'pp_live_placeholder') {
        return res.status(500).json({ erro: { message: 'PushinPay não configurado. Adicione PUSHINPAY_TOKEN nas variáveis de ambiente da Vercel.' } })
    }

    const { valor, email, nome, pedido_id, utm_source } = req.body

    if (!valor || valor <= 0) {
        return res.status(400).json({ erro: { message: 'Valor inválido' } })
    }

    try {
        // 1. Registrar pedido no Supabase antes de gerar o PIX
        const { error: dbError } = await supabase
            .from('pedidos')
            .insert({
                id: pedido_id,
                email,
                nome,
                valor,
                metodo: 'pix',
                status: 'pendente',
                utm_source: utm_source || null,
                criado_em: new Date().toISOString()
            })

        if (dbError) {
            console.warn('Aviso: não salvou pedido no Supabase:', dbError.message)
        }

        // 2. Gerar PIX na PushinPay
        const response = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                value: Math.round(valor * 100), // PushinPay espera em centavos
                webhook_url: `${process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app'}/api/pushinpay/webhook`,
                external_reference: pedido_id,
            })
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Erro PushinPay:', data)
            return res.status(400).json({ erro: data })
        }

        // 3. Atualizar pedido com ID do PIX
        await supabase
            .from('pedidos')
            .update({ pix_id: data.id })
            .eq('id', pedido_id)

        return res.status(200).json({
            qr_code: data.qr_code,
            qr_code_text: data.qr_code_text,
            id: data.id,
            expires_at: data.expiration_date
        })
    } catch (error: any) {
        console.error('Erro ao criar PIX:', error)
        return res.status(500).json({ erro: { message: error.message || 'Erro interno ao gerar PIX' } })
    }
}
