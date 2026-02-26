import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://tcthjnpqjlifmuqipwhq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: any, res: any) {
    const { data: produtos } = await supabase.from('produtos').select('id, nome, checkout_slug, ativo, mundpay_url').order('criado_em', { ascending: false })
    return res.status(200).json({ produtos })
}
