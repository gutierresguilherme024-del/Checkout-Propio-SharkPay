import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log("--- Verificação Real de Colunas (Tabela: produtos) ---")
    const { data, error } = await supabase.from('produtos').select('*').limit(1)

    if (error) {
        console.error("Erro ao ler tabela:", error.message)
        return
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0])
        console.log("Colunas encontradas:", columns.join(', '))

        const required = ['use_buypix', 'buypix_redirect_url', 'user_id']
        required.forEach(col => {
            if (columns.includes(col)) {
                console.log(`✅ Coluna ${col}: PRESENTE`)
            } else {
                console.log(`❌ Coluna ${col}: AUSENTE`)
            }
        })
    } else {
        console.log("Tabela vazia ou sem dados para conferir colunas via chaves de objeto.")
        // Tentar via API de metadados se possível, ou apenas informar.
    }
}

check()
