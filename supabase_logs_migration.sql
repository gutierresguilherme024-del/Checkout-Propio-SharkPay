-- TABELA DE LOGS DO SISTEMA (Auditoria e Webhooks)
CREATE TABLE IF NOT EXISTS public.logs_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    tipo TEXT NOT NULL, -- 'webhook', 'gateway', 'audit', 'debug'
    gateway TEXT,       -- 'stripe', 'pushinpay', 'mundpay'
    evento TEXT,        -- 'pix_gerado', 'webhook_recebido', 'pagamento_confirmado'
    pedido_id TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    sucesso BOOLEAN DEFAULT true,
    mensagem TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Usuarios veem seus proprios logs" ON public.logs_sistema FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Servidor cria logs" ON public.logs_sistema FOR INSERT WITH CHECK (true);

-- Grant Access
GRANT ALL ON TABLE public.logs_sistema TO anon, authenticated, service_role;
