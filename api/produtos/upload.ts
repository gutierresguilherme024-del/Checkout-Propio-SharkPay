import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tcthjnpqjlifmuqipwhq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

    try {
        const { base64, mimeType, fileName } = req.body

        if (!base64 || !mimeType || !fileName) {
            return res.status(400).json({ error: 'base64, mimeType e fileName são obrigatórios' })
        }

        // Converter base64 para Buffer
        const base64Data = base64.replace(/^data:[^;]+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')

        const ext = fileName.split('.').pop() || 'bin'
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        const { data, error } = await supabase.storage
            .from('produtos-pdf')
            .upload(uniqueFileName, buffer, {
                contentType: mimeType,
                upsert: true
            })

        if (error) throw error

        const { data: urlData } = supabase.storage
            .from('produtos-pdf')
            .getPublicUrl(data.path)

        return res.status(200).json({
            path: data.path,
            url: urlData.publicUrl
        })
    } catch (error: any) {
        console.error('Erro no upload:', error)
        return res.status(500).json({ error: error.message || 'Erro ao fazer upload' })
    }
}
