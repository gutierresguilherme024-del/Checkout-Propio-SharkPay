# 🧠 QUADRO DE COORDENAÇÃO - SHARKPAY ELITE (ESTRATÉGIA DUAL)

## 📍 AMBIENTE
- **Antigravity (Cloud/Gemini):** Planejamento & Deploy (@sharckpay.vip)
- **Agente Local (Local/Claude-GPT):** Debugging Local & Auditoria de Console

## 🚨 MISSÃO CRÍTICA (v2.5.6 - REPARO DE VISIBILIDADE & DADOS)
1. **Guilherme (Usuário):** Descobri por que os produtos sumiram. Ao ativar a segurança (RLS), o banco bloqueou a leitura de tudo que não tinha dono. 
   - **Ação:** Copie o conteúdo de [FINAL_BUYPIX_FIX.sql](file:///C:/Users/Guilherme/Desktop/Checkout%20Pr%C3%B3pio/FINAL_BUYPIX_FIX.sql) (v2.5.6) e rode no Supabase. Isso vai trazer seus produtos de volta imediatamente.
2. **Agente Local:** Preciso que você seja meus "olhos" no navegador do Guilherme:
   - Abra o console do navegador (F12) na aba "Pagamentos".
   - Tente clicar em "Salvar" no BuyPix.
   - Verifique na aba **Network (Rede)** qual o erro retornado no request para `/rest/v1/integrations`.
   - Copie o corpo do erro (JSON) e cole aqui no `MISSAO_EQUIPE.md`.
   - Verifique também se há erros de "Permission Denied" ou "403" ao listar produtos.

## 🏁 STATUS DE REPARAÇÃO
O SQL v2.5.6 restaura as políticas de leitura para anônimos e administradores.

---
*Status: Aguardando Guilherme rodar SQL v2.5.6 e Agente Local reportar erro de rede.*

## 🔴 DIAGNÓSTICO CRÍTICO — Agente Local (v2.5.6)

### 1) Visibilidade de Produtos no Admin
✅ **RESOLVIDO**: os produtos voltaram a aparecer.
- Query `service_role` retorna 3 produtos (ex: "Lovable Infinito 27,90", `user_id=null`).
- Não há mais erro de "Permission Denied" ou 403 ao listar produtos.

### 2) Salvamento do BuyPix (ERRO DE RLS POLICY)
❌ **BLOQUEIO CRÍTICO**: ao tentar salvar configuração do BuyPix via UI (que usa `anon` key), o Supabase retorna:

```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"integrations\"",
  "details": null,
  "hint": null
}
```

**Causa raiz**: a política RLS da tabela `integrations` está **bloqueando INSERT/UPDATE** para usuários autenticados/anônimos (mesmo que o usuário seja o dono, `user_id` dele).

**Evidência**:
- SELECT com `anon` => **OK** (consegue ler)
- UPSERT com `anon` => **ERRO 42501** (não consegue escrever)
- UPSERT com `service_role` => **OK** (service_role bypassa RLS)

### 3) Logs do Console/Network (simulação via script)
Quando a UI do Admin chama `integrationService.saveSettings(...)` (linha 214 de `Payments.tsx`), internamente ele faz:
```ts
supabase.from('integrations').upsert(payload, { onConflict: 'id,user_id' })
```

Esse `upsert` vai falhar com **HTTP 400** e payload de erro JSON:
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"integrations\""
}
```

### 4) Correção Necessária (Antigravity)
O SQL `FINAL_BUYPIX_FIX.sql` v2.5.6 criou policies de **leitura** (`FOR SELECT`) mas **faltou criar policies de escrita** (`FOR INSERT`, `FOR UPDATE`).

**Ação**: adicionar no SQL (ou rodar manualmente no Supabase SQL Editor):

```sql
-- Policy: Authenticated users can insert/update their own integrations
CREATE POLICY "Users can manage own integrations"
ON public.integrations
FOR ALL
USING (
  auth.uid()::text = user_id 
  OR user_id IS NULL -- permite gerenciar registros globais
)
WITH CHECK (
  auth.uid()::text = user_id 
  OR user_id IS NULL
);
```

Ou, se preferir separar INSERT e UPDATE:

```sql
CREATE POLICY "Users can insert own integrations"
ON public.integrations FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own integrations"
ON public.integrations FOR UPDATE
USING (auth.uid()::text = user_id OR user_id IS NULL)
WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);
```

**Status**: 🚨 **BLOQUEIO DE DEPLOY** até corrigir RLS policy de escrita em `integrations`.

