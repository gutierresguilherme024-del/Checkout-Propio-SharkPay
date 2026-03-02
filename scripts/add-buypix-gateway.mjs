import fs from 'fs';
import path from 'path';

async function updateSchema() {
    console.log('🐘 Iniciando migração para o gateway BuyPix...');

    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ Arquivo .env não encontrado!');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length > 0) {
            env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });

    const SUPABASE_URL = env['VITE_SUPABASE_URL'] || env['SUPABASE_URL'];
    const SERVICE_ROLE_KEY = env['VITE_SUPABASE_SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error('❌ Credenciais do Supabase não encontradas no .env');
        return;
    }

    const sql = `
        DO $$ 
        BEGIN 
            -- 1. Colunas na tabela produtos
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='use_buypix') THEN
                ALTER TABLE public.produtos ADD COLUMN use_buypix BOOLEAN DEFAULT false;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='buypix_redirect_url') THEN
                ALTER TABLE public.produtos ADD COLUMN buypix_redirect_url TEXT;
            END IF;

            -- 2. Colunas na tabela pedidos
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='buypix_deposit_id') THEN
                ALTER TABLE public.pedidos ADD COLUMN buypix_deposit_id TEXT;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='buypix_status') THEN
                ALTER TABLE public.pedidos ADD COLUMN buypix_status TEXT DEFAULT 'pending';
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='buypix_qr_code') THEN
                ALTER TABLE public.pedidos ADD COLUMN buypix_qr_code TEXT;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='buypix_qr_code_base64') THEN
                ALTER TABLE public.pedidos ADD COLUMN buypix_qr_code_base64 TEXT;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='buypix_expires_at') THEN
                ALTER TABLE public.pedidos ADD COLUMN buypix_expires_at TEXT;
            END IF;

            -- 3. Seed config se não existir
            IF NOT EXISTS (SELECT 1 FROM public.integrations WHERE id='buypix') THEN
                INSERT INTO public.integrations (id, type, name, enabled, config)
                VALUES ('buypix', 'payment', 'BuyPix', false, '{"buypix_api_key": "", "buypix_webhook_secret": ""}'::jsonb);
            END IF;
        END $$;
    `;

    try {
        console.log('📡 Enviando SQL para o Supabase...');
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'apikey': SERVICE_ROLE_KEY
            },
            body: JSON.stringify({ query: sql })
        });

        if (res.ok) {
            console.log('✅ Schema atualizado com sucesso para o BuyPix!');
        } else {
            const errorText = await res.text();
            console.error('❌ Falha ao atualizar via RPC. Por favor, execute este SQL manualmente no Supabase:');
            console.log(sql);
            console.error('Mensagem de erro:', errorText);
        }
    } catch (err) {
        console.error('💥 Erro ao tentar atualizar schema:', err);
    }
}

updateSchema();
