-- SHARKPAY - MIGRATION V4: GATEWAYS PER PRODUCT
-- Execute este script no SQL Editor do Supabase para adicionar suporte a gateways individuais por produto.

-- 1. Adicionar colunas caso elas não existam
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='stripe_enabled') THEN
        ALTER TABLE public.produtos ADD COLUMN stripe_enabled BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='pushinpay_enabled') THEN
        ALTER TABLE public.produtos ADD COLUMN pushinpay_enabled BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='mundpay_enabled') THEN
        ALTER TABLE public.produtos ADD COLUMN mundpay_enabled BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='mundpay_url') THEN
        ALTER TABLE public.produtos ADD COLUMN mundpay_url TEXT;
    END IF;
END $$;

-- 2. Atualizar permissões (garantindo que o front consiga ler esses campos)
GRANT SELECT, UPDATE ON TABLE public.produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.produtos TO authenticated;
GRANT ALL ON TABLE public.produtos TO service_role;

-- 3. Comentário informativo
COMMENT ON COLUMN public.produtos.stripe_enabled IS 'Habilita pagamento via Cartão/Stripe para este produto';
COMMENT ON COLUMN public.produtos.pushinpay_enabled IS 'Habilita pagamento via Pix/PushinPay para este produto';
COMMENT ON COLUMN public.produtos.mundpay_enabled IS 'Habilita pagamento via Pix/MundPay para este produto';
COMMENT ON COLUMN public.produtos.mundpay_url IS 'URL do checkout externo MundPay vinculada a este produto';
