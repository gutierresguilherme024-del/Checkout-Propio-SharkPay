-- Migração para suporte ao BuyPix
-- Este script adiciona as colunas necessárias para o gateway BuyPix e inicializa a integração.

-- 1. Colunas na tabela 'produtos'
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS use_buypix BOOLEAN DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS buypix_redirect_url TEXT;

-- 2. Colunas na tabela 'pedidos'
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_deposit_id TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_status TEXT DEFAULT 'pending';
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_qr_code_base64 TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS buypix_expires_at TIMESTAMPTZ;

-- 3. Inserir BuyPix na tabela de integrações
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
