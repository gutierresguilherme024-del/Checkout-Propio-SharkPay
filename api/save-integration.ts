import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Content-Type', 'application/json')
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { id, type, name, enabled, config } = req.body

    if (!id) return res.status(400).json({ error: 'id obrigatório' })

    try {
        // Verifica se existe registro com user_id null (global)
        const { data: existing } = await supabase
            .from('integrations')
            .select('id')
            .eq('id', id)
            .is('user_id', null)
            .maybeSingle()

        if (existing) {
            const { error } = await supabase
                .from('integrations')
                .update({ enabled, config, name })
                .eq('id', id)
                .is('user_id', null)
            if (error) throw error
        } else {
            const { error } = await supabase
                .from('integrations')
                .insert({ id, type, name, enabled, config, user_id: null })
            if (error) throw error
        }

        return res.status(200).json({ success: true })
    } catch (err: any) {
        console.error('[save-integration]', err)
        return res.status(500).json({ error: err.message })
    }
}
