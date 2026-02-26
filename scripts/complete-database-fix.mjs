import fs from 'fs';
import path from 'path';

async function fixDatabase() {
    console.log('🐘 Iniciando Reparo Completo do Banco de Dados...');

    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });

    const SUPABASE_URL = env['VITE_SUPABASE_URL'];
    const SERVICE_ROLE_KEY = env['VITE_SUPABASE_SERVICE_ROLE_KEY'];

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error('❌ Faltam chaves do Supabase!');
        return;
    }

    const sql = `
        -- 1. Tabela integrations
        CREATE TABLE IF NOT EXISTS public.integrations (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            enabled BOOLEAN DEFAULT false,
            config JSONB DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        -- 2. Colunas na tabela produtos
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='mundpay_url') THEN
                ALTER TABLE public.produtos ADD COLUMN mundpay_url TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='stripe_enabled') THEN
                ALTER TABLE public.produtos ADD COLUMN stripe_enabled BOOLEAN DEFAULT true;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='pushinpay_enabled') THEN
                ALTER TABLE public.produtos ADD COLUMN pushinpay_enabled BOOLEAN DEFAULT false;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='mundpay_enabled') THEN
                ALTER TABLE public.produtos ADD COLUMN mundpay_enabled BOOLEAN DEFAULT false;
            END IF;
        END $$;

        -- 3. Colunas na tabela pedidos
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='cpf_comprador') THEN
                ALTER TABLE public.pedidos ADD COLUMN cpf_comprador TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='stripe_payment_intent') THEN
                ALTER TABLE public.pedidos ADD COLUMN stripe_payment_intent TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='pago_em') THEN
                ALTER TABLE public.pedidos ADD COLUMN pago_em TIMESTAMPTZ;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='erro') THEN
                ALTER TABLE public.pedidos ADD COLUMN erro TEXT;
            END IF;
        END $$;

        -- 4. Garantir Acesso
        GRANT ALL ON TABLE public.integrations TO anon, authenticated, service_role;
        GRANT ALL ON TABLE public.produtos TO anon, authenticated, service_role;
        GRANT ALL ON TABLE public.pedidos TO anon, authenticated, service_role;
    `;

    try {
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
            console.log('✅ Banco de dados atualizado com sucesso!');
        } else {
            const err = await res.text();
            console.error('❌ Erro RPC:', err);
        }
    } catch (err) {
        console.error('💥 Exceção:', err);
    }
}

fixDatabase();
