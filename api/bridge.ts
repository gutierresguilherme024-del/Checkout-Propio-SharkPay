import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * API BRIDGE - SHARKPAY
 * Esta rota recebe comandos do n8n/OpenClaw para manipular o site remotamente.
 */
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

    const { action, payload, secret_key } = req.body

    // Segurança: Verifica se o comando vem do seu n8n oficial
    const APP_SECRET = process.env.BRIDGE_SECRET_KEY || 'shark-secret-123'
    if (secret_key !== APP_SECRET) {
        return res.status(401).json({ error: 'Não autorizado' })
    }

    try {
        switch (action) {
            case 'update_product_price':
                // Exemplo: { "id": "123", "new_price": 49.90 }
                const { error: pErr } = await supabase
                    .from('produtos')
                    .update({ preco: payload.new_price })
                    .eq('id', payload.id)
                if (pErr) throw pErr
                return res.status(200).json({ success: true, message: 'Preço atualizado via Bridge' })

            case 'get_daily_report':
                const hoje = new Date().toISOString().split('T')[0]
                const { data: sales, error: sErr } = await supabase
                    .from('pedidos')
                    .select('valor')
                    .eq('status', 'pago')
                    .gte('criado_em', hoje)
                if (sErr) throw sErr
                const total = sales.reduce((acc, s) => acc + Number(s.valor), 0)
                return res.status(200).json({ success: true, total_vendas: total, count: sales.length })

            case 'firecrawl_research':
                // Aqui o n8n pode enviar dados extraídos pelo Firecrawl para o SharkPay
                return res.status(200).json({ success: true, message: 'Dados de pesquisa recebidos' })

            default:
                return res.status(400).json({ error: 'Ação não reconhecida' })
        }
    } catch (err: any) {
        return res.status(500).json({ error: err.message })
    }
}
