import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' })

    const token = process.env.MUNDPAY_API_TOKEN || process.env.VITE_MUNDPAY_API_TOKEN

    // Fallback para buscar das configurações do Supabase se necessário, 
    // mas o ideal é que o Vercel tenha a env.

    if (!token || token.length < 5 || token.includes('placeholder')) {
        return res.status(500).json({ erro: 'MundPay API Token não configurado' })
    }

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
        )

        const { valor, email, nome, pedido_id, items } = req.body
        if (!valor || !pedido_id) return res.status(400).json({ erro: 'valor e pedido_id são obrigatórios' })

        // Registrar pedido pendente
        await supabase.from('pedidos').upsert({
            id: pedido_id,
            email,
            nome,
            valor: Number(valor),
            metodo: 'mundpay',
            status: 'pendente'
        })

        // Nota: Esta é uma implementação genérica. 
        // A API real da MundPay pode variar.
        // Geralmente espera um POST para /v1/sales ou /checkout

        const appUrl = process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app';

        // Simulação de chamada de API para MundPay
        // Em uma integração real, você chamaria o endpoint da MundPay aqui.

        /*
        const response = await fetch('https://api.mundpay.com/v1/checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Math.round(Number(valor) * 100),
                items: items || [{ name: 'Produto SharkPay', amount: Math.round(Number(valor) * 100), quantity: 1 }],
                customer: { name: nome, email: email },
                external_id: pedido_id,
                webhook_url: `${appUrl}/api/mundpay/webhook`,
                success_url: `${appUrl}/sucesso?id=${pedido_id}`,
                cancel_url: `${appUrl}/cancelado?id=${pedido_id}`,
            })
        })
        */

        // Por enquanto, retornamos um sucesso simulado ou a URL de checkout se for o caso.
        return res.status(200).json({
            message: 'Integração MundPay preparada',
            checkout_url: `https://checkout.mundpay.com/pay/${pedido_id}`, // Exemplo
            id: pedido_id
        })
    } catch (erro) {
        const error = erro as Error;
        return res.status(500).json({ erro: error.message })
    }
}
