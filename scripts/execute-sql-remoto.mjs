import fs from 'fs';
import path from 'path';

async function executeSql() {
    console.log('🐘 Tentando executar SQL via endpoint /pg/query...');

    // Manual env reader
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
        console.error('❌ Faltam chaves do Supabase no .env');
        return;
    }

    const sqlPath = path.resolve(process.cwd(), 'supabase_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        const res = await fetch(`${SUPABASE_URL}/pg/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'apikey': SERVICE_ROLE_KEY
            },
            body: JSON.stringify({ query: sql })
        });

        if (res.ok) {
            console.log('✅ SQL executado com sucesso! Tabelas criadas.');
        } else {
            const error = await res.json();
            console.error('❌ Erro ao executar SQL:', error);

            // Tentativa 2: RPC exec_sql (alguns projetos tem)
            console.log('🔄 Tentando via RPC exec_sql...');
            const resRpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'apikey': SERVICE_ROLE_KEY
                },
                body: JSON.stringify({ query: sql })
            });

            if (resRpc.ok) {
                console.log('✅ SQL executado via RPC!');
            } else {
                console.log('❌ Todas as tentativas automáticas falharam. O usuário precisa colar o SQL no dashboard.');
            }
        }
    } catch (err) {
        console.error('💥 Exceção ao tentar executar SQL:', err);
    }
}

executeSql();
