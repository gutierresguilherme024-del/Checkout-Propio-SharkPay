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
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 40)
    const sufixo = Math.random().toString(36).substring(2, 6)
    return `${base}-${sufixo}`
}

// Campos extras de gateway — só incluir se a coluna existir no banco
const GATEWAY_FIELDS = ['stripe_enabled', 'pushinpay_enabled', 'mundpay_enabled', 'mundpay_url']

function buildRecord(body: Record<string, any>, includeGatewayFields: boolean): Record<string, any> {
    const record: Record<string, any> = {}
    for (const [key, value] of Object.entries(body)) {
        if (!includeGatewayFields && GATEWAY_FIELDS.includes(key)) continue
        if (key === 'atualizado_em') continue // será gerenciado manualmente
        record[key] = value
    }
    return record
}

async function upsertWithRetry(
    table: string,
    operation: 'insert' | 'update',
    record: Record<string, any>,
    id?: string
) {
    // Primeira tentativa: com campos de gateway
    const query = operation === 'insert'
        ? supabase.from(table).insert([record]).select().single()
        : supabase.from(table).update(record).eq('id', id!).select().single()

    const { data, error } = await query

    if (error && error.message?.includes('column') && error.message?.includes('schema cache')) {
        // Coluna não existe — retry sem os campos de gateway
        console.warn(`[API Produtos] Coluna faltando, tentando sem campos de gateway...`)
        const cleanRecord: Record<string, any> = {}
        for (const [key, value] of Object.entries(record)) {
            if (!GATEWAY_FIELDS.includes(key)) cleanRecord[key] = value
        }
        const retryQuery = operation === 'insert'
            ? supabase.from(table).insert([cleanRecord]).select().single()
            : supabase.from(table).update(cleanRecord).eq('id', id!).select().single()

        const { data: retryData, error: retryError } = await retryQuery
        if (retryError) throw retryError
        return retryData
    }

    if (error) throw error
    return data
}

export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') return res.status(200).end()

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    if (!serviceKey) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' })
    }

    try {
        console.log(`[API Produtos] Método: ${req.method}`, req.query);

        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .order('criado_em', { ascending: false })

            if (error) throw error
            return res.status(200).json({ produtos: data || [] })

        } else if (req.method === 'POST') {
            const {
                nome, preco, descricao, ativo, imagem_url, pdf_storage_key,
                stripe_product_id, stripe_price_id, mundpay_url,
                stripe_enabled, pushinpay_enabled, mundpay_enabled
            } = req.body

            if (!nome || preco === undefined) {
                return res.status(400).json({ error: 'Nome e preço são obrigatórios' })
            }

            const checkout_slug = gerarSlug(nome)

            const record: Record<string, any> = {
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
                atualizado_em: new Date().toISOString()
            }

            // Adicionar campos de gateway (podem não existir no banco)
            if (stripe_enabled !== undefined) record.stripe_enabled = stripe_enabled
            if (pushinpay_enabled !== undefined) record.pushinpay_enabled = pushinpay_enabled
            if (mundpay_enabled !== undefined) record.mundpay_enabled = mundpay_enabled

            const data = await upsertWithRetry('produtos', 'insert', record)
            return res.status(201).json({ produto: data })

        } else if (req.method === 'DELETE') {
            const { id } = req.query
            if (!id) return res.status(400).json({ error: 'ID do produto obrigatório' })

            const { error } = await supabase.from('produtos').delete().eq('id', id)
            if (error) throw error
            return res.status(200).json({ sucesso: true })

        } else if (req.method === 'PUT') {
            const { id } = req.query
            if (!id) return res.status(400).json({ error: 'ID do produto obrigatório' })

            const campos = { ...req.body, atualizado_em: new Date().toISOString() }
            const data = await upsertWithRetry('produtos', 'update', campos, id)
            return res.status(200).json({ produto: data })
        }

        return res.status(405).json({ error: 'Método não permitido' })

    } catch (error: any) {
        console.error('[API Produtos] EXCEÇÃO:', error)
        return res.status(500).json({ error: error.message || 'Erro interno ao gerenciar produtos' })
    }
}
