-- ============================================
-- SharkPay - Diagnóstico da Tabela pedidos
-- ============================================
-- Execute este SQL no Supabase SQL Editor para VERIFICAR
-- a estrutura atual da tabela pedidos em produção
-- ============================================

-- 1. Verificar se a tabela pedidos existe
SELECT 
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name = 'pedidos';

-- 2. Listar TODAS as colunas da tabela pedidos
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'pedidos'
ORDER BY ordinal_position;

-- 3. Verificar se as 7 colunas ESSENCIAIS existem
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'id') 
        THEN '✅ id existe' 
        ELSE '❌ id NÃO EXISTE' 
    END AS col_id,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'email_comprador') 
        THEN '✅ email_comprador existe' 
        ELSE '❌ email_comprador NÃO EXISTE' 
    END AS col_email,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'nome_comprador') 
        THEN '✅ nome_comprador existe' 
        ELSE '❌ nome_comprador NÃO EXISTE' 
    END AS col_nome,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'valor') 
        THEN '✅ valor existe' 
        ELSE '❌ valor NÃO EXISTE' 
    END AS col_valor,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'metodo_pagamento') 
        THEN '✅ metodo_pagamento existe' 
        ELSE '❌ metodo_pagamento NÃO EXISTE' 
    END AS col_metodo,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'status') 
        THEN '✅ status existe' 
        ELSE '❌ status NÃO EXISTE' 
    END AS col_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'gateway') 
        THEN '✅ gateway existe' 
        ELSE '❌ gateway NÃO EXISTE' 
    END AS col_gateway;

-- 4. Verificar RLS (Row Level Security)
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'pedidos';

-- 5. Listar todas as policies da tabela pedidos
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'pedidos'
ORDER BY policyname;

-- 6. Contar pedidos existentes
SELECT 
    COUNT(*) as total_pedidos,
    COUNT(CASE WHEN gateway = 'mundpay' THEN 1 END) as pedidos_mundpay,
    COUNT(CASE WHEN gateway = 'stripe' THEN 1 END) as pedidos_stripe,
    COUNT(CASE WHEN gateway = 'pushinpay' THEN 1 END) as pedidos_pushinpay,
    COUNT(CASE WHEN gateway = 'buypix' THEN 1 END) as pedidos_buypix
FROM pedidos;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Query 1: Deve retornar 'pedidos' | 'public'
-- Query 2: Lista TODAS as colunas (compare com schema base)
-- Query 3: Mostra ✅ ou ❌ para cada coluna essencial
-- Query 4: Mostra se RLS está habilitado
-- Query 5: Lista todas as policies (pode haver conflito)
-- Query 6: Mostra total de pedidos e por gateway
-- ============================================

-- 🎯 APÓS EXECUTAR, ME PASSE O RESULTADO DA QUERY 3 (✅/❌)
