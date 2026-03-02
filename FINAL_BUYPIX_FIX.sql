-- SHARKPAY CHECKOUT - REPARO TOTAL DO BANCO (BUYPIX FIX)
-- Instrução: Copie tudo abaixo e cole no SQL EDITOR do seu Supabase, depois clique em RUN.

-- 1. CRIAR TABELA DE INTEGRAÇÕES (Se não existir)
CREATE TABLE IF NOT EXISTS public.integrations (
    id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'payment', 'tracking', etc.
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (id, user_id) -- Permite que cada usuário tenha sua própria config buypix
);

-- 2. ADICIONAR COLUNA USER_ID CASO A TABELA JÁ EXISTA SEM ELA
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='integrations' AND column_name='user_id') THEN
        ALTER TABLE public.integrations ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. AJUSTAR TABELA DE PRODUTOS PARA BUYPIX
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS use_buypix BOOLEAN DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS buypix_redirect_url TEXT;

-- 4. AJUSTAR TABELA DE PEDIDOS PARA BUYPIX
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_deposit_id TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_status TEXT DEFAULT 'pending';
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code_base64 TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_expires_at TIMESTAMPTZ;

-- 5. HABILITAR RLS E CRIAR POLÍTICAS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Políticas de Integrações
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.integrations;
CREATE POLICY "Users can manage their own integrations" ON public.integrations
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read active integrations for processing" ON public.integrations;
CREATE POLICY "Public can read active integrations for processing" ON public.integrations
    FOR SELECT USING (true);

-- 6. GRANT PERMISSIONS (Fundamental para o Checkout ler as chaves)
GRANT ALL ON public.integrations TO anon, authenticated, service_role;
GRANT ALL ON public.produtos TO anon, authenticated, service_role;
GRANT ALL ON public.pedidos TO anon, authenticated, service_role;

-- 7. INICIALIZAR REGISTRO GLOBAL SE NECESSÁRIO
INSERT INTO public.integrations (id, type, name, enabled, config)
VALUES ('buypix', 'payment', 'BuyPix', false, '{"buypix_api_key": "", "buypix_webhook_secret": ""}')
ON CONFLICT DO NOTHING;

-- MENSAGEM DE SUCESSO: Banco de dados preparado para BuyPix!
