// Script para criar o bucket e politicas no Supabase Storage
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/setup-supabase-storage.mjs
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tcthjnpqjlifmuqipwhq.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
}

async function main() {
  console.log('🦈 SharkPay - Configurando Supabase Storage...\n')

  // 1. Criar o bucket
  console.log('📦 Criando bucket "produtos-pdf"...')
  const bucketRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'produtos-pdf',
      name: 'produtos-pdf',
      public: true,
      file_size_limit: 52428800, // 50MB
      allowed_mime_types: ['image/*', 'application/pdf']
    })
  })

  const bucketData = await bucketRes.json()

  if (bucketRes.ok) {
    console.log('✅ Bucket criado com sucesso!')
  } else if (bucketData.error === 'Bucket already exists') {
    console.log('ℹ️  Bucket já existe — OK, avançando.')
  } else {
    console.error('❌ Erro ao criar bucket:', bucketData)
    process.exit(1)
  }

  // 2. Criar as políticas via SQL
  console.log('\n🔒 Configurando políticas de acesso...')

  const sql = `
    -- Política: leitura pública
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Leitura publica produtos-pdf'
      ) THEN
        CREATE POLICY "Leitura publica produtos-pdf"
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'produtos-pdf' );
      END IF;
    END $$;

    -- Política: insert para autenticados
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Upload autenticado produtos-pdf'
      ) THEN
        CREATE POLICY "Upload autenticado produtos-pdf"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK ( bucket_id = 'produtos-pdf' );
      END IF;
    END $$;

    -- Política: delete para autenticados
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Delete autenticado produtos-pdf'
      ) THEN
        CREATE POLICY "Delete autenticado produtos-pdf"
        ON storage.objects FOR DELETE
        TO authenticated
        USING ( bucket_id = 'produtos-pdf' );
      END IF;
    END $$;
  `

  const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql })
  })

  // Tentar via endpoint de query direto
  const queryRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers,
  })

  // Usar a API de admin do Supabase para executar SQL
  const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  })

  if (pgRes.ok) {
    console.log('✅ Políticas configuradas!')
  } else {
    console.log('⚠️  Políticas precisam ser criadas manualmente (veja instruções abaixo)')
  }

  console.log('\n✅ Setup concluído!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Bucket "produtos-pdf" está configurado e público.')
  console.log('Você já pode criar produtos com imagem e PDF! 🚀')
  console.log('\nSe ainda houver erro de política, cole isso no Supabase SQL Editor:')
  console.log(`
CREATE POLICY "Leitura publica produtos-pdf"
ON storage.objects FOR SELECT
USING ( bucket_id = 'produtos-pdf' );

CREATE POLICY "Upload autenticado produtos-pdf"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'produtos-pdf' );
  `)
}

main().catch(console.error)
