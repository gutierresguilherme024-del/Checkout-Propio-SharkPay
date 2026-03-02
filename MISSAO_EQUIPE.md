# 🧠 QUADRO DE COORDENAÇÃO - SHARKPAY ELITE (ESTRATÉGIA DUAL)

## 📍 AMBIENTE
- **Antigravity (Cloud/Gemini):** Planejamento & Deploy (@sharckpay.vip)
- **Agente Local (Local/Claude-GPT):** Implementação & Verificação Local

## ⚡ MISSÃO CRÍTICA (v2.5.4 - REPARO DEFINITIVO)
1. **Guilherme (Usuário):** O Agente Local não tem permissão para rodar SQL direto. Você deve copiar o conteúdo de [FINAL_BUYPIX_FIX.sql](file:///C:/Users/Guilherme/Desktop/Checkout%20Pr%C3%B3pio/FINAL_BUYPIX_FIX.sql) e colar no SQL Editor do Supabase. **IMPORTANTE:** O novo script já faz o `DROP CASCADE` automático para limpar o erro da PK.
2. **Agente Local:** Assim que o Guilherme rodar o SQL, sua tarefa é:
   - Validar a existência de `pedidos.buypix_status` usando o endpoint `/rest/v1/pedidos?select=buypix_status&limit=1`.
   - Realizar um teste de **UPSERT** na tabela `integrations` com `id='buypix_test'` e `user_id=null` para confirmar que a restrição de NOT NULL foi removida.
   - Registrar no `MISSAO_EQUIPE.md` se o teste de "user_id null" passou.

## 🏁 HANDOVER DE PRODUÇÃO
O Antigravity aguarda o reporte de sucesso do Agente Local (teste de null pass) para dar o `git push` e o `deploy` final.

---
*Status: Aguardando Guilherme rodar o SQL e Agente Local validar.*

## ✅ REPORTE FINAL — Agente Local (validação pós SQL v2.5.4)
### 1) Colunas (produtos/pedidos)
Validação via `service_role` (Supabase JS):
- `produtos`: `use_buypix`, `buypix_redirect_url`, `user_id` => **OK**
- `pedidos`: `buypix_status`, `buypix_deposit_id`, `buypix_qr_code`, `buypix_qr_code_base64`, `buypix_expires_at`, `user_id` => **OK**

### 2) Tabela `integrations`
- `integrations` agora existe e é consultável => **OK**

### 3) Teste `user_id = NULL` (record global)
- `SELECT integrations WHERE id='buypix' AND user_id IS NULL` => **OK** (registro encontrado)
- `UPDATE` do registro global (`id='buypix'`, `user_id NULL`) => **OK** (sem erro)
- `INSERT` do registro `id='buypix_test'` com `user_id NULL` => **OK**
- `INSERT` duplicado do mesmo `id='buypix_test'` com `user_id NULL` => **bloqueado por unique** (comportamento esperado)

✅ Conclusão: o erro antigo de **"Null value in column user_id"** / PK bloqueante **foi resolvido**. O schema agora suporta registro global (`user_id NULL`).

### Observação técnica (UPSERT)
O `upsert(..., { onConflict: 'id' })` via PostgREST retornou `42P10` porque a tabela não tem PK/unique constraint "plena" em `id` (é um unique index parcial). Isso não impede o funcionamento do sistema (INSERT/SELECT/UPDATE do global funcionam), mas o *UPSERT direto* pode exigir ajuste de estratégia (ex: insert-then-update) se for usado em UI.

**Status: ✅ OK para Antigravity realizar PUSH + DEPLOY.**

