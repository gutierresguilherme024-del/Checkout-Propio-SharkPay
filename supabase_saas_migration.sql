-- MIGRACAO PARA SAAS (MULTITENANCY)
-- Adiciona user_id para separar dados entre usuários

-- 1. Adicionar colunas de usuário
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Atualizar Políticas de RLS para Produtos
DROP POLICY IF EXISTS "Acesso publico para leitura de produtos" ON public.produtos;
CREATE POLICY "Leitura publica de produtos ativos" ON public.produtos FOR SELECT USING (ativo = true);
CREATE POLICY "Usuarios veem seus proprios produtos" ON public.produtos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Atualizar Políticas de RLS para Integrações
DROP POLICY IF EXISTS "Acesso publico para leitura de configuracoes" ON public.integrations;
CREATE POLICY "Checkout le configuracoes do dono" ON public.integrations FOR SELECT USING (true); -- Precisamos de uma forma do checkout saber de quem é a integração
CREATE POLICY "Usuarios gerenciam suas integracoes" ON public.integrations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Atualizar Políticas de RLS para Pedidos
DROP POLICY IF EXISTS "Acesso publico para criar pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Acesso publico para ver status do pedido" ON public.pedidos;
CREATE POLICY "Publico cria pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Dono ve seus pedidos" ON public.pedidos FOR SELECT TO authenticated USING (auth.uid() = user_id);
