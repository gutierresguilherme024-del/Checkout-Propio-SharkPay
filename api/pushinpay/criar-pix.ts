import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' })

    const token = process.env.PUSHINPAY_TOKEN || process.env.VITE_PUSHINPAY_TOKEN
    if (!token || token.length < 10 || token.includes('placeholder')) {
        return res.status(500).json({ erro: 'PushinPay Token não configurado ou inválido (placeholder)' })
    }

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
        )

        const { valor, email, nome, pedido_id } = req.body
        if (!valor || !pedido_id) return res.status(400).json({ erro: 'valor e pedido_id são obrigatórios' })

        await supabase.from('pedidos').insert({
            id: pedido_id, email, nome,
            valor: Number(valor), metodo: 'pix', status: 'pendente'
        })

        const appUrl = process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app';
        const response = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                value: Math.round(Number(valor) * 100),
                webhook_url: `${appUrl}/api/pushinpay/webhook`,
                external_reference: pedido_id,
            })
        })

        const texto = await response.text()
        if (!response.ok) return res.status(400).json({ erro: `PushinPay ${response.status}: ${texto}` })

        const data = JSON.parse(texto)
        await supabase.from('pedidos').update({ pix_id: data.id }).eq('id', pedido_id)

        return res.status(200).json({
            qr_code: data.qr_code,
            qr_code_text: data.qr_code_text,
            id: data.id
        })
    } catch (erro) {
        const error = erro as Error;
        return res.status(500).json({ erro: error.message })
    }
}
