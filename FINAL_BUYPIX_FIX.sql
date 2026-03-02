-- =========================================================
-- FINAL BUYPIX FIX (v2.5.4) - SharkPay Checkout
-- Instrução: Copie tudo abaixo e cole no SQL EDITOR do seu Supabase.
-- Clique em RUN para aplicar a correção definitiva.
-- =========================================================

-- 0. LIMPEZA TOTAL (Necessário para resetar a PK bloqueante)
DROP TABLE IF EXISTS public.integrations CASCADE;

-- FORÇA ATUALIZAÇÃO DO CACHE DO SCHEMA
NOTIFY pgrst, 'reload schema cache';

-- 1. CRIAR TABELA INTEGRATIONS (ESTRUTURA CORRIGIDA)
CREATE TABLE IF NOT EXISTS public.integrations (
    id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'payment', 'tracking', etc.
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. GARANTIR INDICE ÚNICO (Impede duplicidade global ou por usuário)
DROP INDEX IF EXISTS idx_integrations_id_user_global;
CREATE UNIQUE INDEX idx_integrations_id_user_global ON public.integrations (id) WHERE user_id IS NULL;

DROP INDEX IF EXISTS idx_integrations_id_user_specific;
CREATE UNIQUE INDEX idx_integrations_id_user_specific ON public.integrations (id, user_id) WHERE user_id IS NOT NULL;

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

-- 5. HABILITAR RLS E POLÍTICAS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE ACESSO
DROP POLICY IF EXISTS "Public read integrations" ON public.integrations;
CREATE POLICY "Public read integrations" ON public.integrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage integrations" ON public.integrations;
CREATE POLICY "Admin manage integrations" ON public.integrations FOR ALL TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

-- 7. PERMISSÕES FINAIS
GRANT ALL ON TABLE public.integrations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.produtos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pedidos TO anon, authenticated, service_role;

-- 8. INSERIR REGISTRO GLOBAL SE NÃO EXISTIR
INSERT INTO public.integrations (id, type, name, enabled, config)
VALUES ('buypix', 'payment', 'BuyPix', false, '{"buypix_api_key": "", "buypix_webhook_secret": ""}')
ON CONFLICT DO NOTHING;

-- ✅ Script v2.5.4 executado!
