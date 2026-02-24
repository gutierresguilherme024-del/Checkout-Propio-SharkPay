-- SQL for Supabase Editor

-- 1. Enable Storage for PDFs
-- Create a bucket named 'produtos-pdf' in the Supabase Dashboard -> Storage

-- 2. Tabela: produtos
CREATE TABLE IF NOT EXISTS produtos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(255) NOT NULL,
  descricao   TEXT,
  preco       DECIMAL(10,2) NOT NULL,
  imagem_url  TEXT,
  pdf_storage_key TEXT,  -- chave no storage (não URL pública)
  ativo       BOOLEAN DEFAULT true,
  criado_em   TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 3. Tabela: pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id      UUID REFERENCES produtos(id),
  email_comprador VARCHAR(255) NOT NULL,
  nome_comprador  VARCHAR(255),
  valor           DECIMAL(10,2) NOT NULL,
  metodo_pagamento VARCHAR(50),  -- 'pix' | 'cartao'
  gateway         VARCHAR(50),   -- 'pushinpay' | 'stripe'
  gateway_payment_id TEXT,        -- ID do pagamento no gateway
  status          VARCHAR(50) DEFAULT 'pendente',
                  -- pendente | pago | cancelado | estornado
  entregue        BOOLEAN DEFAULT false,
  entregue_em     TIMESTAMP,
  criado_em       TIMESTAMP DEFAULT NOW()
);

-- 4. Tabela: configuracoes_entrega
CREATE TABLE IF NOT EXISTS configuracoes_entrega (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id      UUID REFERENCES produtos(id) UNIQUE,
  assunto_email   VARCHAR(255),
  corpo_email     TEXT,           -- HTML com variáveis
  modo_entrega    VARCHAR(50) DEFAULT 'link',  -- 'link' | 'anexo'
  validade_link_dias INT DEFAULT 7,
  email_remetente VARCHAR(255),
  email_remetente_nome VARCHAR(255),
  criado_em       TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security) if needed, but for now we'll assume it's for admin use
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_entrega ENABLE ROW LEVEL SECURITY;

-- Simple policies for authenticated users (Admin)
CREATE POLICY "Allow all for authenticated users" ON produtos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON pedidos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON configuracoes_entrega FOR ALL TO authenticated USING (true);
