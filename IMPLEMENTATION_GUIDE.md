# Guia de Implementação - Sistema de Entrega Digital

Este documento resume as alterações feitas e os próximos passos para colocar o sistema em produção.

## 1. Banco de Dados (Supabase)
Execute o conteúdo do arquivo `supabase_schema.sql` no **SQL Editor** do seu painel Supabase. 
Isso criará as tabelas:
- `produtos`: Armazena os dados dos ebooks/produtos.
- `pedidos`: Registra as vendas e status de entrega.
- `configuracoes_entrega`: Armazena o template de email por produto.

## 2. Storage (Supabase)
Crie um Bucket no Supabase Storage chamado:
- `produtos-pdf`
- Certifique-se de que ele seja **Privado** para que os arquivos não fiquem públicos.

## 3. Automação N8N
O sistema já está enviando eventos para o n8n através do `integrationService.sendToN8N`.
No n8n, você deve criar um workflow com um **Webhook Trigger** (POST).

### Payload esperado no n8n:
```json
{
  "event": "PAGAMENTO_CONFIRMADO",
  "email_comprador": "...",
  "nome_comprador": "...",
  "nome_produto": "...",
  "link_download": "..."
}
```

## 4. Webhooks de Pagamento
Como este é um projeto Frontend (Vite), os webhooks da **Stripe** e **PushinPay** devem ser configurados no painel de cada gateway apontando para o seu **n8n** ou para uma **Edge Function** do Supabase.

### Recomendação:
Aponte o webhook do PushinPay e da Stripe diretamente para o n8n. No n8n:
1. Recebe o Webhook.
2. Valida a assinatura (HMAC para Pushinpay / Signing Secret para Stripe).
3. Busca o produto no Supabase.
4. Gera um link assinado (Signed URL) via API do Supabase.
5. Envia o e-mail usando o template que você configurou no painel.

## 5. Funcionalidades Implementadas
- [x] **Gestão de Produtos**: Upload de PDF e Imagem de Capa diretamente para o Storage.
- [x] **Configuração de Entrega**: Editor de e-mail por produto com suporte a variáveis.
- [x] **Teste de Envio**: Botão funcional que dispara um evento para o n8n.
- [x] **Histórico**: Tabela de logs de entrega (baseada na tabela de pedidos).

---
*Desenvolvido pela Equipe de IA*
