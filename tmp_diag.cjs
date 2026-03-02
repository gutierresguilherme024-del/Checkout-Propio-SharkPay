require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );

    const results = {};

    // 1. Check Table Names
    const { data: tables, error: tableErr } = await supabase.rpc('get_tables'); // Won't work without custom RPC

    // 2. Count Pedidos
    const { count: pedidosCount } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
    results.pedidosCount = pedidosCount;

    // 3. Count Integrations
    const { count: integCount } = await supabase.from('integrations').select('*', { count: 'exact', head: true });
    results.integCount = integCount;

    // 4. Last 5 Pedidos
    const { data: recentOrders } = await supabase.from('pedidos').select('*').order('criado_em', { ascending: false }).limit(5);
    results.recentOrders = recentOrders;

    // 5. Check if 'logs_sistema' exists
    const { data: recentLogs, error: logErr } = await supabase.from('logs_sistema').select('*').limit(5);
    results.recentLogs = recentLogs;
    results.logError = logErr;

    console.log('--- DIAGNOSTICO ---');
    console.log(JSON.stringify(results, null, 2));
}

run();
