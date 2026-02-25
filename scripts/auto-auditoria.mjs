// SharkPay - Script de Auto-Auditoria Técnica
// Este script verifica o estado real das tabelas e conexões.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function auditoria() {
    console.log('🔍 Iniciando Auto-Auditoria SharkPay...\n');

    if (!URL || !KEY || URL.includes('placeholder')) {
        console.error('❌ ERRO: Variáveis do Supabase não configuradas no .env');
        return;
    }

    const supabase = createClient(URL, KEY);

    // 1. Testar Conexão e Tabelas
    const tabelas = ['produtos', 'pedidos', 'integrations', 'checkout_settings'];
    console.log('--- Verificando Tabelas no Supabase ---');

    for (const tabela of tabelas) {
        const { error } = await supabase.from(tabela).select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ Tabela '${tabela}': NÃO ENCONTRADA ou SEM ACESSO (Erro: ${error.message})`);
        } else {
            console.log(`✅ Tabela '${tabela}': OK`);
        }
    }

    // 2. Verificar Colunas Críticas em 'pedidos'
    console.log('\n--- Verificando Estrutura de \'pedidos\' ---');
    const { data: cols, error: colError } = await supabase.rpc('inspect_columns', { table_name: 'pedidos' });

    // Como RPC pode não existir, tentamos um select simples para ver os campos
    const { data: sample, error: sampleError } = await supabase.from('pedidos').select('*').limit(1);
    if (sampleError) {
        console.log(`❌ Erro ao ler colunas de 'pedidos': ${sampleError.message}`);
    } else {
        const keys = sample && sample[0] ? Object.keys(sample[0]) : [];
        const obrigatorias = ['email_comprador', 'metodo_pagamento', 'gateway_payment_id'];
        obrigatorias.forEach(col => {
            if (keys.includes(col)) {
                console.log(`✅ Coluna '${col}': PRESENTE`);
            } else {
                console.log(`⚠️  Coluna '${col}': AUSENTE (Isso quebrará o processamento!)`);
            }
        });
    }

    // 3. Resumo de Integrações
    console.log('\n--- Status de Configurações ---');
    console.log(`Stripe Key: ${process.env.STRIPE_SECRET_KEY ? 'Preenchida' : 'Vazia'}`);
    console.log(`PushinPay Token: ${process.env.VITE_PUSHINPAY_TOKEN?.includes('placeholder') ? 'PLACEHOLDER (Inválida)' : 'Configurada'}`);
    console.log(`Mundipagg Token: ${process.env.VITE_MUNDPAG_API_TOKEN ? 'Preenchida' : 'Vazia'}`);

    console.log('\n💡 DICA: Se colunas estiverem ausentes, execute o SQL de migração no painel do Supabase.');
}

auditoria();
