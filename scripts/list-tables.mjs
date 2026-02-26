import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=')
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
})

const supabaseUrl = env['VITE_SUPABASE_URL']
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']

const supabase = createClient(supabaseUrl, supabaseKey)

async function list() {
    // Para listar tabelas sem RPC ou pg_catalog acessível via PostgREST,
    // podemos tentar um truque: chamar o endpoint rest/v1/ com um esquema vazio.
    // Ou usar a lib de inspeção se disponível.
    // Mas o jeito mais confiável no Supabase via JS é:
    try {
        const { data, error } = await supabase.rpc('get_tables') // se existir
        if (data) console.log('Tabelas (RPC):', data)
    } catch { }

    // Tentativa por inspeção de erro
    const tables = ['integrations', 'integration', 'configuracoes', 'configs', 'settings', 'pedidos', 'produtos']
    for (const t of tables) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true })
        if (!error) {
            console.log(`✅ Tabela encontrada: ${t}`)
        } else {
            console.log(`❌ Tabela NÃO encontrada: ${t} (${error.message})`)
        }
    }
}

list()
