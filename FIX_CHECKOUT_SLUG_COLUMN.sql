-- ============================================
-- SharkPay - Adiciona coluna checkout_slug faltante
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Adicionar coluna checkout_slug na tabela pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS checkout_slug TEXT;

-- 2. Adicionar coluna pedido_id se ainda não existir (compatibilidade)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS pedido_id TEXT;

-- 3. Adicionar coluna produto_nome se ainda não existir (compatibilidade)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS produto_nome TEXT;

-- 4. Criar índice para checkout_slug (otimização de queries)
CREATE INDEX IF NOT EXISTS idx_pedidos_checkout_slug ON public.pedidos(checkout_slug);

-- 5. Criar índice para pedido_id (otimização de queries)
CREATE INDEX IF NOT EXISTS idx_pedidos_pedido_id ON public.pedidos(pedido_id);

-- 6. Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pedidos' 
AND column_name IN ('checkout_slug', 'pedido_id', 'produto_nome')
ORDER BY column_name;

-- 7. Verificar registros existentes (deve retornar contagem)
SELECT COUNT(*) as total_pedidos FROM public.pedidos;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- As 3 colunas devem aparecer na query 6:
-- • checkout_slug | text | YES
-- • pedido_id     | text | YES
-- • produto_nome  | text | YES
-- ============================================
