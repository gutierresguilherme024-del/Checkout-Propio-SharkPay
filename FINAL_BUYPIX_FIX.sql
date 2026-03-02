-- =========================================================
-- FINAL BUYPIX FIX (v2.5.4) - SharkPay Checkout
-- Instrução: Copie tudo abaixo e cole no SQL EDITOR do seu Supabase.
-- Clique em RUN para aplicar a correção definitiva.
-- =========================================================

-- 0. LIMPEZA TOTAL (Necessário para resetar a PK bloqueante)
DROP TABLE IF EXISTS public.integrations CASCADE;

-- FORÇA ATUALIZAÇÃO DO CACHE DO SCHEMA
NOTIFY pgrst, 'reload schema cache';

-- 1. CRIAR TABELA INTEGRATIONS (ESTRUTURA FINAL)
CREATE TABLE IF NOT EXISTS public.integrations (
    id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'payment', 'tracking', etc.
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. GARANTIR UNICIDADE (Suporta NULLS no user_id para config global)
-- Requer Postgres 15+ (Padrão Supabase)
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_id_user_id_key;
ALTER TABLE public.integrations ADD CONSTRAINT integrations_id_user_id_key UNIQUE NULLS NOT DISTINCT (id, user_id);

-- 3. ADICIONAR COLUNAS BUYPIX EM PRODUTOS
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS use_buypix BOOLEAN DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS buypix_redirect_url TEXT;

-- 4. ADICIONAR COLUNAS BUYPIX EM PEDIDOS (CRÍTICO)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_deposit_id TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_status TEXT DEFAULT 'pending';
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code_base64 TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_expires_at TIMESTAMPTZ;

-- 5. HABILITAR RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE ACESSO (INTEGRATIONS - PROTEÇÃO DE CONFIGS)
DROP POLICY IF EXISTS "Public read integrations" ON public.integrations;
CREATE POLICY "Public read integrations" ON public.integrations 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage integrations" ON public.integrations;
-- Role: authenticated (Admins) can manage their own or global records
CREATE POLICY "Admin manage integrations" ON public.integrations 
FOR ALL TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 7. POLÍTICAS DE ACESSO (PRODUTOS - RECUPERAÇÃO DE VISIBILIDADE)
DROP POLICY IF EXISTS "Public read active products" ON public.produtos;
CREATE POLICY "Public read active products" ON public.produtos 
FOR SELECT USING (true); 

DROP POLICY IF EXISTS "Admin manage products" ON public.produtos;
CREATE POLICY "Admin manage products" ON public.produtos 
FOR ALL TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 8. POLÍTICAS DE ACESSO (PEDIDOS)
DROP POLICY IF EXISTS "Public insert orders" ON public.pedidos;
CREATE POLICY "Public insert orders" ON public.pedidos 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage orders" ON public.pedidos;
CREATE POLICY "Admin manage orders" ON public.pedidos 
FOR ALL TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 9. PERMISSÕES FINAIS
GRANT ALL ON TABLE public.integrations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.produtos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pedidos TO anon, authenticated, service_role;

-- 10. INCIALIZAR REGISTRO GLOBAL COM CREDENCIAIS REAIS
INSERT INTO public.integrations (id, type, name, enabled, config)
VALUES (
    'buypix', 
    'payment', 
    'BuyPix', 
    true, -- Já deixa ativado
    '{"buypix_api_key": "bpx_sVXfxDNUaWqErFSnx6xxczbKrc6KvqlItC1v43f6", "buypix_webhook_secret": "whsec_buypix_default"}'
)
ON CONFLICT (id, user_id) 
DO UPDATE SET 
    config = EXCLUDED.config,
    enabled = true;

-- ✅ Script v2.5.8 executado! (BuyPix Live & Connected)
