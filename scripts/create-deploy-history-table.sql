-- ============================================
-- SharkPay - Tabela de Histórico de Deploys
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Criar tabela deploy_history
CREATE TABLE IF NOT EXISTS public.deploy_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summary TEXT NOT NULL,
    commit_hash TEXT,
    changed_files JSONB,
    breaking_changes BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'feat', -- 'feat' | 'fix' | 'refactor' | 'docs' | 'chore'
    deployed_by TEXT, -- user_id de quem fez o deploy (se aplicável)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca rápida por versão
CREATE INDEX IF NOT EXISTS idx_deploy_history_version ON public.deploy_history(version);

-- Criar índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_deploy_history_deployed_at ON public.deploy_history(deployed_at DESC);

-- RLS Policy: Permitir leitura pública do histórico
ALTER TABLE public.deploy_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deploy history"
ON public.deploy_history
FOR SELECT
USING (true);

-- RLS Policy: Apenas service_role pode inserir (backend via API)
CREATE POLICY "Service role can insert deploy history"
ON public.deploy_history
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Comentários nas colunas
COMMENT ON TABLE public.deploy_history IS 'Histórico de deploys em produção do SharkPay';
COMMENT ON COLUMN public.deploy_history.version IS 'Versão do deploy (formato semver: X.Y.Z)';
COMMENT ON COLUMN public.deploy_history.summary IS 'Resumo das mudanças neste deploy';
COMMENT ON COLUMN public.deploy_history.commit_hash IS 'Hash do commit Git (short)';
COMMENT ON COLUMN public.deploy_history.changed_files IS 'Array JSON com arquivos alterados';
COMMENT ON COLUMN public.deploy_history.breaking_changes IS 'Se este deploy contém breaking changes';
COMMENT ON COLUMN public.deploy_history.type IS 'Tipo de mudança: feat, fix, refactor, docs, chore';

-- Inserir versão inicial
INSERT INTO public.deploy_history (
    version,
    deployed_at,
    summary,
    commit_hash,
    changed_files,
    breaking_changes,
    type
) VALUES (
    '1.0.0',
    NOW(),
    'Versão inicial do sistema de versionamento e histórico de atualizações',
    'initial',
    '["public/version.json", "version-history.json", "scripts/bump-version.ps1", "src/components/admin/DeploymentHistory.tsx", "SHARKPAY_CONTEXT.md"]'::jsonb,
    false,
    'feat'
);

-- Verificar se inseriu corretamente
SELECT * FROM public.deploy_history ORDER BY deployed_at DESC LIMIT 5;
