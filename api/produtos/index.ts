import { createClient } from '@supabase/supabase-js'

// Usa service_role no backend - NUNCA exposta ao cliente
const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tcthjnpqjlifmuqipwhq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') return res.status(200).end()

    // Verificar se service_role está configurada
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    if (!serviceKey) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' })
    }

    try {
        if (req.method === 'GET') {
            // Listar todos os produtos
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .order('criado_em', { ascending: false })

            if (error) throw error
            return res.status(200).json({ produtos: data || [] })

        } else if (req.method === 'POST') {
            // Criar produto (INSERT com service_role - bypass RLS)
            const { nome, preco, descricao, ativo, imagem_url, pdf_storage_key, stripe_product_id, stripe_price_id } = req.body

            if (!nome || preco === undefined) {
                return res.status(400).json({ error: 'Nome e preço são obrigatórios' })
            }

            const { data, error } = await supabase
                .from('produtos')
                .insert([{
                    nome,
                    preco: parseFloat(String(preco)),
                    descricao: descricao || null,
                    ativo: ativo !== undefined ? ativo : true,
                    imagem_url: imagem_url || null,
                    pdf_storage_key: pdf_storage_key || null,
                    stripe_product_id: stripe_product_id || null,
                    stripe_price_id: stripe_price_id || null,
                    atualizado_em: new Date().toISOString()
                }])
                .select()
                .single()

            if (error) throw error
            return res.status(201).json({ produto: data })

        } else if (req.method === 'DELETE') {
            // Excluir produto
            const { id } = req.query
            if (!id) return res.status(400).json({ error: 'ID do produto obrigatório' })

            const { error } = await supabase
                .from('produtos')
                .delete()
                .eq('id', id)

            if (error) throw error
            return res.status(200).json({ sucesso: true })

        } else if (req.method === 'PUT') {
            // Atualizar produto
            const { id } = req.query
            if (!id) return res.status(400).json({ error: 'ID do produto obrigatório' })

            const { data, error } = await supabase
                .from('produtos')
                .update({ ...req.body, atualizado_em: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return res.status(200).json({ produto: data })
        }

        return res.status(405).json({ error: 'Método não permitido' })

    } catch (error: any) {
        console.error('Erro na API de produtos:', error)
        return res.status(500).json({ error: error.message || 'Erro interno ao gerenciar produtos' })
    }
}
