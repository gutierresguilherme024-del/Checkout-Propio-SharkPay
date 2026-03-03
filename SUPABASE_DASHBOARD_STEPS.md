# SharkPay - Passos no Dashboard do Supabase

## 📋 Lint Item 1: Habilitar Leaked Password Protection

**⚠️ IMPORTANTE:** Este item NÃO pode ser corrigido via SQL. Deve ser feito no dashboard.

### Passos:

1. **Acesse o Dashboard do Supabase:**
   ```
   https://supabase.com/dashboard/project/[seu-projeto-id]
   ```

2. **Navegue até Authentication:**
   - No menu lateral esquerdo, clique em **"Authentication"**

3. **Acesse as Configurações:**
   - Clique em **"Policies"** (ou "Configuration" dependendo da versão)
   - Procure por **"Password Protection"** ou **"Security Settings"**

4. **Habilite a Proteção contra Senhas Vazadas:**
   - Procure a opção: **"Enable Leaked Password Protection"**
   - Toggle para **ON** (ativado)
   
5. **Configurações Recomendadas:**
   - **Minimum password length:** 8 caracteres
   - **Require uppercase:** ✅ Sim
   - **Require lowercase:** ✅ Sim
   - **Require numbers:** ✅ Sim
   - **Require special characters:** ⚠️ Opcional (pode dificultar UX)
   - **Check against leaked passwords:** ✅ **SIM (OBRIGATÓRIO)**

6. **Salvar:**
   - Clique em **"Save"** ou **"Update"**

### ✅ Como Verificar:

Após habilitar, tente criar um usuário com senha fraca (ex: "password123"):
- ✅ **Correto:** Deve retornar erro informando que a senha é fraca ou vazada
- ❌ **Errado:** Senha é aceita sem validação

---

## 📊 Resumo de Lint Items

| # | Lint Item | Correção | Tipo |
|---|-----------|----------|------|
| 1 | Leaked Password Protection Disabled | Dashboard (manual) | Segurança |
| 2 | RLS Policy Always True em pedidos | SQL (mantido com CHECK true) | Performance |
| 3 | RLS Disabled em configuracoes_entrega | SQL (ENABLE RLS) | Segurança |
| 4 | Multiple Permissive Policies em produtos | SQL (consolidado) | Performance |
| 5 | Multiple Permissive Policies em pedidos | SQL (consolidado) | Performance |
| 6 | Multiple Permissive Policies em integrations | SQL (consolidado) | Performance |
| 7 | Auth RLS Initialization Plan em pedidos | SQL (SELECT auth.uid()) | Performance |
| 8 | Auth RLS Initialization Plan em produtos | SQL (SELECT auth.uid()) | Performance |
| 9 | Auth RLS Initialization Plan em integrations | SQL (SELECT auth.uid()) | Performance |

---

## 🎯 Prioridade de Execução

### Alta Prioridade (impacto no MundPay):
1. ✅ SQL: Consolidar policies em **pedidos** (items 5, 7)
2. ✅ SQL: Consolidar policies em **produtos** (items 4, 8)
3. ✅ SQL: Consolidar policies em **integrations** (items 6, 9)

### Média Prioridade:
4. ✅ SQL: Habilitar RLS em **configuracoes_entrega** (item 3)

### Baixa Prioridade:
5. ⚠️ Dashboard: Habilitar **Leaked Password Protection** (item 1)
6. 📝 Item 2 mantido como está (WITH CHECK true é correto para nosso caso)

---

## ✅ Após Executar SQL

**Verificações obrigatórias:**

1. **Teste o fluxo MundPay:**
   - Acesse um checkout com MundPay
   - Preencha os dados e clique em "Continuar para Pagamento Seguro"
   - ✅ Pedido deve ser criado com sucesso
   - ✅ Popup do MundPay deve abrir
   - ✅ NENHUM erro de RLS ou schema cache

2. **Verifique as policies:**
   ```sql
   SELECT tablename, policyname, permissive, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('produtos', 'pedidos', 'integrations')
   ORDER BY tablename;
   ```
   - ✅ Deve mostrar policies consolidadas
   - ✅ NENHUMA policy duplicada

3. **Teste admin panel:**
   - Acesse `/admin/products`
   - Adicione/edite um produto
   - ✅ Deve funcionar normalmente
   - ✅ NENHUM erro 42501 (insufficient privilege)

---

## 🚨 Troubleshooting

### Se o insert de pedido falhar após SQL:

```sql
-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'pedidos';

-- Se rowsecurity = true, verificar policies
SELECT * FROM pg_policies WHERE tablename = 'pedidos';

-- Testar insert manual
INSERT INTO pedidos (id, pedido_id, email_comprador, valor, status, gateway)
VALUES ('test123', 'test123', 'test@test.com', 100, 'pending', 'mundpay');
```

### Se admin panel não conseguir editar:

```sql
-- Verificar se usuário tem permissão
SELECT (SELECT auth.uid())::text;

-- Verificar policy
SELECT qual, with_check FROM pg_policies 
WHERE tablename = 'produtos' AND policyname = 'produtos_unified_policy';
```

---

**Arquivo criado:** 2026-03-03  
**Autor:** Rovo Dev (SharkPay Tech Lead)
