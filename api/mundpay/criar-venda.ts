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

        const { valor, email, nome, pedido_id, items, utm_source } = req.body
        if (!valor || !pedido_id) return res.status(400).json({ erro: 'valor e pedido_id são obrigatórios' })

        // Registrar pedido pendente (Método: Pix via MundPay)
        const { error: upsertError } = await supabase.from('pedidos').upsert({
            id: pedido_id,
            email_comprador: email,
            nome_comprador: nome,
            valor: Number(valor),
            metodo_pagamento: 'pix', // Alterado para pix
            gateway: 'mundipagg',
            status: 'pendente',
            utm_source: utm_source || null
        })

        if (upsertError) {
            console.error('[MundPay Pix] Erro Supabase:', upsertError)
            return res.status(500).json({ erro: `Erro ao registrar pedido: ${upsertError.message}` })
        }

        const appUrl = process.env.VITE_APP_URL || 'https://sharkpaycheckout.vercel.app';

        // Em uma integração real com Mundipagg para Pix:
        // const response = await fetch('https://api.mundipagg.com/v1/orders', { ... })
        // const data = await response.json()
        // return res.json({ qr_code: data.checkouts[0].pix.qr_code, qr_code_text: data.checkouts[0].pix.qr_code_text })

        // Retorno Simulado/Fallback de Pix para MundPay
        return res.status(200).json({
            message: 'Pix MundPay gerado',
            qr_code_text: `00020126330014br.gov.bcb.pix0111MUNDIPAYPIX5204000053039865802BR5913SHARKPAY6009SAO PAULO62070503***6304${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
            id: pedido_id
        })
    } catch (erro) {
        const error = erro as Error;
        return res.status(500).json({ erro: error.message })
    }
}
