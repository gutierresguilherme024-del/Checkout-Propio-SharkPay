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

async function debug() {
    const { data, error } = await supabase.from('integrations').select('*')
    if (error) {
        console.error('Erro:', error)
        return
    }
    console.log('--- INTEGRAÇÕES ---')
    console.log(JSON.stringify(data, null, 2))
}

debug()
