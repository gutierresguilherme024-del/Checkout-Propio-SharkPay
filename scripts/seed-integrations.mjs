import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(
    env['VITE_SUPABASE_URL'] || '',
    env['VITE_SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'] || ''
);

async function seedIntegrations() {
    console.log('🚀 Iniciando preenchimento automático de integrações via script...');

    const integrations = [
        {
            id: 'stripe',
            type: 'payment',
            name: 'Stripe',
            enabled: !!env['STRIPE_SECRET_KEY'],
            config: {
                pubKey: env['VITE_STRIPE_PUBLISHABLE_KEY'] || '',
                secKey: env['STRIPE_SECRET_KEY'] || '',
                webhookSecret: env['STRIPE_WEBHOOK_SECRET'] || ''
            }
        },
        {
            id: 'pushinpay',
            type: 'payment',
            name: 'PushinPay',
            enabled: env['VITE_PUSHINPAY_TOKEN'] && !env['VITE_PUSHINPAY_TOKEN'].includes('placeholder'),
            config: {
                apiToken: env['VITE_PUSHINPAY_TOKEN'] || '',
                webhookToken: ''
            }
        },
        {
            id: 'n8n',
            type: 'n8n',
            name: 'Automação Principal',
            enabled: !!env['VITE_N8N_WEBHOOK_URL'],
            config: {
                url: env['VITE_N8N_WEBHOOK_URL'] || ''
            }
        }
    ];

    for (const integ of integrations) {
        console.log(`Tentando upsert para: ${integ.name}...`);
        const { error } = await supabase
            .from('integrations')
            .upsert(integ);

        if (error) {
            console.error(`❌ Erro ao preencher ${integ.name}:`, error.message);
        } else {
            console.log(`✅ ${integ.name} configurado com sucesso!`);
        }
    }

    console.log('\n✨ Todas as credenciais foram migradas do .env para o banco de dados.');
}

seedIntegrations();
