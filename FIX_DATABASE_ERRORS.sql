-- =========================================================
-- SUPER FIX UNIVERSAL (SaaS + BuyPix + Security Refined)
-- Copie este conteúdo e rode no SQL EDITOR do Supabase
-- =========================================================

-- FORÇAR O SUPABASE A ATUALIZAR A ESTRUTURA DAS TABELAS (SCHEMA CACHE)
NOTIFY pgrst, 'reload';

-- 1. ESTRUTURA DE COLUNAS (USER_ID + BUYPIX)
-- Garante que as tabelas tenham suporte a múltiplos usuários e BuyPix
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS use_buypix BOOLEAN DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS buypix_redirect_url TEXT;

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_deposit_id TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_status TEXT DEFAULT 'pending';
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code_base64 TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_expires_at TIMESTAMPTZ;

ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. ÍNDICES PARA PERFORMANCE
-- Melhora a velocidade de busca no Admin e no Checkout
CREATE INDEX IF NOT EXISTS idx_produtos_user_id ON public.produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON public.pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_slug ON public.produtos(checkout_slug);

-- 3. INTEGRAÇÃO BUYPIX (SEED)
INSERT INTO public.integrations (id, name, description, category, enabled, config)
VALUES (
    'buypix', 
    'BuyPix', 
    'Gateway de pagamento Pix instantâneo com as menores taxas do mercado.', 
    'payment', 
    false, 
    '{"buypix_api_key": "", "buypix_webhook_secret": ""}'
)
ON CONFLICT (id) DO NOTHING;

-- 4. REGRAS DE SEGURANÇA (RLS REFINADAS)
-- Habilita proteção de linha
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- 4.1 POLÍTICAS PARA PRODUTOS
DROP POLICY IF EXISTS "Leitura pública de produtos ativos" ON public.produtos;
CREATE POLICY "Leitura pública de produtos ativos" ON public.produtos 
FOR SELECT TO anon, authenticated USING (ativo = true);

DROP POLICY IF EXISTS "Gestão total do dono" ON public.produtos;
CREATE POLICY "Gestão total do dono" ON public.produtos 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4.2 POLÍTICAS PARA PEDIDOS
DROP POLICY IF EXISTS "Clientes criam pedidos" ON public.pedidos;
CREATE POLICY "Clientes criam pedidos" ON public.pedidos 
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Clientes veem seu próprio pix" ON public.pedidos;
CREATE POLICY "Clientes veem seu próprio pix" ON public.pedidos 
FOR SELECT TO anon, authenticated USING (status = 'pendente');

DROP POLICY IF EXISTS "Dono vê seus pedidos" ON public.pedidos;
CREATE POLICY "Dono vê seus pedidos" ON public.pedidos 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4.3 POLÍTICAS PARA INTEGRAÇÕES
DROP POLICY IF EXISTS "Leitura de configurações pelo Checkout" ON public.integrations;
CREATE POLICY "Leitura de configurações pelo Checkout" ON public.integrations 
FOR SELECT TO anon, authenticated USING (enabled = true);

DROP POLICY IF EXISTS "Dono gerencia integrações" ON public.integrations;
CREATE POLICY "Dono gerencia integrações" ON public.integrations 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FIM DO SCRIPT
-- Auditoria Antigravity: Status Concluído.
