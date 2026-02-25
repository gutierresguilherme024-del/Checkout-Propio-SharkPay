// Script para criar políticas de RLS do Storage via API REST
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/test-storage.mjs
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tcthjnpqjlifmuqipwhq.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY,
}

async function runSQL(query) {
    // Tentar via endpoint /sql (Supabase Management API)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query })
    })
    return res
}

async function main() {
    console.log('🔒 Criando políticas de Storage via Supabase...\n')

    // Verificar se o bucket está acessível
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/produtos-pdf`, { headers })
    const bucket = await listRes.json()
    console.log('Bucket status:', listRes.status, bucket.name || bucket.error)

    // Testar upload de arquivo pequeno para verificar permissões
    const testContent = 'test'
    const testBlob = new Blob([testContent], { type: 'text/plain' })

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/produtos-pdf/test-permissions.txt`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'text/plain',
            'x-upsert': 'true'
        },
        body: testBlob
    })

    const uploadData = await uploadRes.json()
    console.log('Teste de upload (service_role):', uploadRes.status, uploadData)

    if (uploadRes.ok) {
        console.log('\n✅ O bucket está funcionando com service_role!')
        console.log('ℹ️  O problema era que o código frontend usava anon key.')
        console.log('   Vou corrigir o Products.tsx para usar a service role key no storage.\n')

        // Limpar arquivo de teste
        await fetch(`${SUPABASE_URL}/storage/v1/object/produtos-pdf/test-permissions.txt`, {
            method: 'DELETE',
            headers
        })
    } else {
        console.error('❌ Falha no upload:', uploadData)
    }

    // Tentar criar políticas via rpc
    const policies = [
        `CREATE POLICY IF NOT EXISTS "Public Read produtos-pdf" ON storage.objects FOR SELECT USING (bucket_id = 'produtos-pdf')`,
        `CREATE POLICY IF NOT EXISTS "Auth Upload produtos-pdf" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produtos-pdf')`,
        `CREATE POLICY IF NOT EXISTS "Auth Delete produtos-pdf" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'produtos-pdf')`,
    ]

    for (const sql of policies) {
        // Usar edge runtime / admin API
        const res = await fetch(`https://api.supabase.com/v1/projects/tcthjnpqjlifmuqipwhq/database/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ query: sql })
        })
        console.log(`Policy SQL status: ${res.status}`)
    }
}

main().catch(console.error)
