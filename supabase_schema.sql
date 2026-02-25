-- SHARKPAY CHECKOUT - SCHEMA COMPLETO (SQL)
-- Execute este script no SQL Editor do Supabase para garantir que tudo funcione.

-- 1. Tabela de Integrações
CREATE TABLE IF NOT EXISTS public.integrations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Pedidos (A principal para processamento)
CREATE TABLE IF NOT EXISTS public.pedidos (
    id TEXT PRIMARY KEY,
    produto_id UUID,
    email_comprador TEXT NOT NULL,
    nome_comprador TEXT,
    valor DECIMAL(10,2) NOT NULL,
    metodo_pagamento TEXT,
    gateway TEXT,
    gateway_payment_id TEXT,
    pix_id TEXT,
    status TEXT DEFAULT 'pendente',
    entregue BOOLEAN DEFAULT false,
    entregue_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now(),
    utm_source TEXT,
    checkout_slug TEXT
);

-- 3. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    imagem_url TEXT,
    pdf_storage_key TEXT,
    ativo BOOLEAN DEFAULT true,
    checkout_slug TEXT UNIQUE,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar RLS (Opcional, mas recomendado para segurança)
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 5. Criar Políticas de Acesso Público (Para o checkout funcionar sem Auth)
CREATE POLICY "Acesso publico para leitura de produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Acesso publico para leitura de configuracoes" ON public.integrations FOR SELECT USING (true);
CREATE POLICY "Acesso publico para criar pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Acesso publico para ver status do pedido" ON public.pedidos FOR SELECT USING (true);

-- 6. Grant Access
GRANT ALL ON TABLE public.integrations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pedidos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.produtos TO anon, authenticated, service_role;
