import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) env[key.trim()] = value.trim()
})

const supabaseUrl = env['VITE_SUPABASE_URL'] || 'https://tcthjnpqjlifmuqipwhq.supabase.co'
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('--- Verificando Colunas de Produtos ---')
    const { data, error } = await supabase.from('produtos').select('*').limit(1)
    if (error) {
        console.error('Erro ao ler produtos:', error.message)
    } else if (data && data.length > 0) {
        const item = data[0]
        const columns = Object.keys(item)
        console.log('Colunas existentes:', columns.join(', '))

        const required = ['pushinpay_enabled', 'mundpay_enabled', 'stripe_enabled', 'mundpay_url']
        required.forEach(col => {
            if (columns.includes(col)) {
                console.log(`✅ Coluna ${col}: OK`)
            } else {
                console.log(`❌ Coluna ${col}: FALTANDO`)
            }
        })
    } else {
        console.log('Nenhum produto para verificar colunas.')
    }
}

check()
