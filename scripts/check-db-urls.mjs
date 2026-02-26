import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Manual .env parsing
const envContent = fs.readFileSync('.env', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) env[key.trim()] = value.trim()
})

const supabaseUrl = env['VITE_SUPABASE_URL'] || 'https://tcthjnpqjlifmuqipwhq.supabase.co'
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
    const { data: produtos, error } = await supabase.from('produtos').select('nome, imagem_url').limit(10)
    if (error) {
        console.error('Erro:', error)
        return
    }

    console.log('--- PRODUTOS NO BANCO ---')
    produtos?.forEach(p => {
        console.log(`Nome: ${p.nome}`)
        console.log(`URL Bruta: ${p.imagem_url}`)
        console.log('---')
    })
}

debug()
