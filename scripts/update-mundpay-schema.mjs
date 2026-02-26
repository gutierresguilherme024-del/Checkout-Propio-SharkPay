import fs from 'fs';
import path from 'path';

async function updateSchema() {
    console.log('🐘 Iniciando atualização do schema para MundPay...');

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

    const sql = `
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='mundpay_url') THEN
                ALTER TABLE public.produtos ADD COLUMN mundpay_url TEXT;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='cpf_comprador') THEN
                ALTER TABLE public.pedidos ADD COLUMN cpf_comprador TEXT;
            END IF;
        END $$;
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
            console.log('✅ Colunas mundpay_url e cpf_comprador adicionadas com sucesso!');
        } else {
            console.error('❌ Falha ao atualizar via RPC. Por favor, execute este SQL manualmente no Supabase:');
            console.log(sql);
        }
    } catch (err) {
        console.error('💥 Erro ao tentar atualizar schema:', err);
    }
}

updateSchema();
