import { createClient } from '@supabase/supabase-js'

// Usa service_role no backend - NUNCA exposta ao cliente
const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tcthjnpqjlifmuqipwhq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

function gerarSlug(nome: string): string {
    const base = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')      // Remove acentos
        .replace(/[^a-z0-9]+/g, '-')           // Substitui especiais por -
        .replace(/^-+|-+$/g, '')               // Remove - do início/fim
        .substring(0, 40)                       // Limita tamanho
    const sufixo = Math.random().toString(36).substring(2, 6) // 4 chars aleatórios
    return `${base}-${sufixo}`
}

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
        console.log(`[API Produtos] Método: ${req.method}`, req.query);

        if (req.method === 'GET') {
            console.log('[API Produtos] Listando produtos...');
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .order('criado_em', { ascending: false })

            if (error) {
                console.error('[API Produtos] Erro ao buscar produtos:', error);
                throw error;
            }
            console.log(`[API Produtos] ${data?.length || 0} produtos encontrados.`);
            return res.status(200).json({ produtos: data || [] })

        } else if (req.method === 'POST') {
            const {
                nome, preco, descricao, ativo, imagem_url, pdf_storage_key,
                stripe_product_id, stripe_price_id, mundpay_url,
                stripe_enabled, pushinpay_enabled, mundpay_enabled
            } = req.body
            console.log('[API Produtos] Criando produto:', { nome, preco, mundpay_url });

            if (!nome || preco === undefined) {
                return res.status(400).json({ error: 'Nome e preço são obrigatórios' })
            }

            const checkout_slug = gerarSlug(nome)

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
                    checkout_slug,
                    mundpay_url: mundpay_url || null,
                    stripe_enabled: stripe_enabled !== undefined ? stripe_enabled : true,
                    pushinpay_enabled: pushinpay_enabled !== undefined ? pushinpay_enabled : true,
                    mundpay_enabled: mundpay_enabled !== undefined ? mundpay_enabled : false,
                    atualizado_em: new Date().toISOString()
                }])
                .select()
                .single()

            if (error) {
                console.error('[API Produtos] Erro ao inserir produto:', error);
                throw error;
            }
            return res.status(201).json({ produto: data })

        } else if (req.method === 'DELETE') {
            const { id } = req.query
            console.log('[API Produtos] Excluindo produto:', id);
            if (!id) return res.status(400).json({ error: 'ID do produto obrigatório' })

            const { error } = await supabase
                .from('produtos')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('[API Produtos] Erro ao excluir produto:', error);
                throw error;
            }
            return res.status(200).json({ sucesso: true })

        } else if (req.method === 'PUT') {
            const { id } = req.query
            console.log('[API Produtos] Atualizando produto:', id, req.body);
            if (!id) return res.status(400).json({ error: 'ID do produto obrigatório' })

            const { data, error } = await supabase
                .from('produtos')
                .update({ ...req.body, atualizado_em: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('[API Produtos] Erro ao atualizar produto:', error);
                throw error;
            }
            return res.status(200).json({ produto: data })
        }

        return res.status(405).json({ error: 'Método não permitido' })

    } catch (error: any) {
        console.error('[API Produtos] EXCEÇÃO:', error)
        return res.status(500).json({ error: error.message || 'Erro interno ao gerenciar produtos' })
    }
}
