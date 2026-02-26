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

        const isImage = mimeType.startsWith('image/')
        const isPdf = mimeType === 'application/pdf'

        if (!isImage && !isPdf) {
            return res.status(400).json({ error: 'Tipo de arquivo não suportado. Apenas imagens e PDFs são permitidos.' })
        }

        // Converter base64 para Buffer
        const base64Data = base64.replace(/^data:[^;]+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')

        const ext = fileName.split('.').pop() || 'bin'
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        // Usar sempre 'produtos-pdf' como bucket principal (único garantido no setup)
        const bucket = 'produtos-pdf'

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(uniqueFileName, buffer, {
                contentType: mimeType,
                upsert: true
            })

        if (error) {
            console.error(`[Upload] Erro no bucket '${bucket}':`, error.message)
            throw error
        }

        const usedBucket = bucket
        const uploadResult = data

        if (!uploadResult) {
            throw new Error('Falha ao enviar arquivo para todos os buckets disponíveis.')
        }

        // Gerar URL pública completa
        const { data: urlData } = supabase.storage
            .from(usedBucket)
            .getPublicUrl(uploadResult.path)

        const publicUrl = urlData.publicUrl

        console.log(`[Upload] URL pública: ${publicUrl}`)

        return res.status(200).json({
            path: uploadResult.path,
            url: publicUrl,
            bucket: usedBucket
        })
    } catch (error: any) {
        console.error('[Upload] Erro:', error)
        return res.status(500).json({ error: error.message || 'Erro ao fazer upload' })
    }
}
