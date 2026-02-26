-- SharkPay v3 Migration - Colunas que faltam para pagamento funcionar corretamente
-- Execute no SQL Editor do Supabase

-- 1. Colunas faltando na tabela pedidos (usadas pelo process-payment.ts e webhooks)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cpf_comprador VARCHAR(20);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS erro TEXT;

-- 2. Coluna mundpay_url na tabela produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS mundpay_url TEXT;

-- 3. Política de UPDATE para pedidos (webhooks precisam atualizar status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'pedidos' AND policyname = 'Acesso service_role para atualizar pedidos'
    ) THEN
        CREATE POLICY "Acesso service_role para atualizar pedidos" ON public.pedidos
        FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Garantir que integrações possam ser escritas (upsert do admin panel)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'integrations' AND policyname = 'Acesso para upsert de integracoes'
    ) THEN
        CREATE POLICY "Acesso para upsert de integracoes" ON public.integrations
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
