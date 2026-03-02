-- Migração para Ponte IA (Trinity -> Antigravity)
-- Cria uma tabela para armazenar solicitações de melhorias via celular

CREATE TABLE IF NOT EXISTS public.ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processed, failed
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para permitir que o site (anon) envie solicitações
CREATE POLICY "Acesso publico para criar solicitacoes" ON public.ai_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Acesso publico para ver solicitacoes" ON public.ai_requests FOR SELECT USING (true);

-- Permissões
GRANT ALL ON TABLE public.ai_requests TO anon, authenticated, service_role;
