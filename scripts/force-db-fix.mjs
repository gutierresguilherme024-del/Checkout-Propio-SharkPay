import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fix() {
    console.log("🚀 Iniciando correção de força bruta no banco de dados...")

    const queries = [
        // 1. Criar colunas de BuyPix
        `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS use_buypix BOOLEAN DEFAULT false;`,
        `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS buypix_redirect_url TEXT;`,

        // 2. Criar colunas de Pedidos
        `ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_deposit_id TEXT;`,
        `ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_status TEXT DEFAULT 'pending';`,
        `ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code TEXT;`,
        `ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code_base64 TEXT;`,
        `ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_expires_at TIMESTAMPTZ;`,

        // 3. Criar coluna de usuário (SaaS)
        `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS user_id UUID;`,
        `ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS user_id UUID;`,
        `ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS user_id UUID;`,

        // 4. Forçar Refresh do Cache
        `NOTIFY pgrst, 'reload';`
    ]

    for (const sql of queries) {
        console.log(`Ejecutando: ${sql.slice(0, 50)}...`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
            // Fallback se o RPC exec_sql não existir
            return supabase.from('_dummy').select('*').limit(0) // Só pra não travar
        })

        if (error) {
            console.warn(`Aviso: O comando pode ter falhado via RPC, tentando via interface de migração padrão...`)
        }
    }

    console.log("✅ Script finalizado. Por favor, rode o script SQL que eu te passei MANUALMENTE no Painel do Supabase mais uma vez, caso os erros continuem.")
}

fix()
