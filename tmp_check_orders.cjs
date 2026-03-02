require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(10);

    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('PEDIDOS_RECENTES:', JSON.stringify(data, null, 2));
    }
}

check();
