import { createClient } from '@supabase/supabase-js'

// Variáveis de ambiente configuradas diretamente para o deploy na Vercel
const supabaseUrl = "https://tcthjnpqjlifmuqipwhq.supabase.co"
const supabaseAnonKey = "sb_publishable_ceqd7Zx2356UV4G30Wvrrg_B3O8DyGh"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
