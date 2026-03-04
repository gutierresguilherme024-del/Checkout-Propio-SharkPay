import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Content-Type', 'application/json')
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    )

    console.log('[save-integration] body recebido:', JSON.stringify(req.body))

    const { id, type, name, enabled, config } = req.body

    if (!id) return res.status(400).json({ error: 'id obrigatório' })

    console.log('[save-integration] config recebido:', JSON.stringify(config))

    try {
        const { data: existing } = await supabase
            .from('integrations')
            .select('id')
            .eq('id', id)
            .maybeSingle()

        if (existing) {
            const { error } = await supabase
                .from('integrations')
                .update({ enabled, config, name })
                .eq('id', id)
            if (error) throw error
            console.log('[save-integration] UPDATE OK:', id, 'enabled:', enabled)
        } else {
            const { error } = await supabase
                .from('integrations')
                .insert({ id, type, name, enabled, config, user_id: null })
            if (error) throw error
            console.log('[save-integration] INSERT OK:', id, 'enabled:', enabled)
        }

        return res.status(200).json({ success: true })
    } catch (err: any) {
        console.error('[save-integration] ERRO:', err)
        return res.status(500).json({ error: err.message })
    }
}
