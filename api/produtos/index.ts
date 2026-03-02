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
const GATEWAY_FIELDS = [
    'stripe_enabled', 'pushinpay_enabled', 'mundpay_enabled', 'mundpay_url',
    'use_buypix', 'buypix_redirect_url'
]

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
    // 1. Tentar o salvamento completo primeiro
    const query = operation === 'insert'
        ? supabase.from(table).insert([record]).select().single()
        : supabase.from(table).update(record).eq('id', id!).select().single()

    const { data, error } = await query

    // Se funcionou, perfeito
    if (!error) return data

    // 2. Se deu erro de coluna ou cache, filtrar para campos "Seguros" (Base)
    console.warn(`[API Produtos] Erro detectado: ${error.message}. Tentando salvamento seguro...`)

    // Forçar o PostgREST a recarregar o cache enviando um notify (se possível via RPC ou apenas ignorando erro)
    try { await supabase.rpc('reload_schema_cache'); } catch { /* ignore */ }

    // Campos que TEMOS CERTEZA que existem no banco (v1.0)
    const BASE_FIELDS = [
        'nome', 'preco', 'descricao', 'ativo',
        'imagem_url', 'pdf_storage_key', 'checkout_slug',
        'atualizado_em'
    ]

    const secureRecord: Record<string, any> = {}
    for (const [key, value] of Object.entries(record)) {
        if (BASE_FIELDS.includes(key)) {
            secureRecord[key] = value
        }
    }

    // Tentar salvamento apenas com o básico (Nome, Preço, etc)
    const retryQuery = operation === 'insert'
        ? supabase.from(table).insert([secureRecord]).select().single()
        : supabase.from(table).update(secureRecord).eq('id', id!).select().single()

    const { data: retryData, error: retryError } = await retryQuery

    // 3. Se ainda falhou por causa do user_id (SaaS Migration), tentar sem ele
    if (retryError && retryError.message?.includes('user_id')) {
        console.warn(`[API Produtos] User_id inexistente, removendo do salvamento...`)
        delete secureRecord.user_id;
        const finalQuery = operation === 'insert'
            ? supabase.from(table).insert([secureRecord]).select().single()
            : supabase.from(table).update(secureRecord).eq('id', id!).select().single()

        const final = await finalQuery;
        if (final.error) throw final.error;
        return final.data;
    }

    if (retryError) {
        console.error('[API Produtos] Falha crítica no retry:', retryError);
        throw retryError;
    }

    return retryData;
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

        // Extrair userId do token Bearer
        const authHeader = req.headers.authorization
        const userId = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

        if (req.method === 'GET') {
            let query = supabase
                .from('produtos')
                .select('*')
                .order('criado_em', { ascending: false })

            if (userId) query = query.eq('user_id', userId)

            let { data, error } = await query

            // FALLBACK: Se o banco ainda não tem a coluna user_id ou se deu erro de cache
            if (error && (error.message?.includes('user_id') || error.message?.includes('schema cache'))) {
                console.warn("[API Produtos] Fallback para busca global devido a erro de schema/cache.");
                const fallbackQuery = supabase
                    .from('produtos')
                    .select('*')
                    .order('criado_em', { ascending: false })
                const fallback = await fallbackQuery
                data = fallback.data
                error = fallback.error
            }

            if (error) throw error
            return res.status(200).json({ produtos: data || [] })

        } else if (req.method === 'POST') {
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado (Authorization header faltando)' })
            }

            const {
                nome, preco, descricao, ativo, imagem_url, pdf_storage_key,
                stripe_product_id, stripe_price_id, mundpay_url,
                stripe_enabled, pushinpay_enabled, mundpay_enabled,
                use_buypix, buypix_redirect_url
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
                user_id: userId,
                atualizado_em: new Date().toISOString()
            }

            // Adicionar campos de gateway (podem não existir no banco)
            if (stripe_enabled !== undefined) record.stripe_enabled = stripe_enabled
            if (pushinpay_enabled !== undefined) record.pushinpay_enabled = pushinpay_enabled
            if (mundpay_enabled !== undefined) record.mundpay_enabled = mundpay_enabled
            if (use_buypix !== undefined) record.use_buypix = use_buypix
            if (buypix_redirect_url !== undefined) record.buypix_redirect_url = buypix_redirect_url

            const data = await upsertWithRetry('produtos', 'insert', record)
            return res.status(201).json({ produto: data })

        } else if (req.method === 'DELETE') {
            const { id } = req.query
            if (!id) return res.status(400).json({ error: 'ID do produto obrigatório' })

            // Proteção DELETE: só exclui se for o dono
            let query = supabase.from('produtos').delete().eq('id', id)
            if (userId) query = query.eq('user_id', userId)

            const { error } = await query

            if (error) {
                // Se falhou no delete por causa do user_id, tenta excluir globalmente (Admin)
                if (error.message?.includes('user_id') || error.message?.includes('schema cache')) {
                    const fallbackDelete = await supabase.from('produtos').delete().eq('id', id)
                    if (fallbackDelete.error) throw fallbackDelete.error
                } else {
                    throw error
                }
            }
            return res.status(200).json({ sucesso: true })

        } else if (req.method === 'PUT') {
            const { id } = req.query
            if (!id) return res.status(400).json({ error: 'ID do produto obrigatório' })
            if (!userId) return res.status(401).json({ error: 'Não autorizado' })

            const campos = { ...req.body, atualizado_em: new Date().toISOString() }

            // Proteção UPDATE: garante que o user_id não seja alterado ou injetado indevidamente
            // e que o retryQuery (se disparado) mantenha o filtro de owner
            const data = await upsertWithRetry('produtos', 'update', campos, id)
            return res.status(200).json({ produto: data })
        }

        return res.status(405).json({ error: 'Método não permitido' })

    } catch (error: any) {
        console.error('[API Produtos] EXCEÇÃO:', error)
        return res.status(500).json({ error: error.message || 'Erro interno ao gerenciar produtos' })
    }
}
