# Auditoria Contínua - SharkPay Checkout

## [v1.4.0] - 2026-02-27
### Integração UTMify Nativa
**Resumo:** O rastreamento via UTMify foi totalmente integrado ao frontend e aos painéis de administração.
- **Configuração:** Adicionados campos "Webhook URL (Postback)" e "Script UTMify (Header)" no painel Administrativo -> Rastreamento, permitindo salvar o script sem depender do n8n (botão de teste removido).
- **Injeção Dinâmica:** O script UTMify configurado é agora automaticamente injetado via DOM no `<head>` de todos os checkouts (existentes e novos).
- **Hook Atualizado:** A verificação de status no sistema agora aprova a integração como "Ativa" caso qualquer um dos campos (API, Script ou Webhook) esteja preenchido.

## [v1.3.0] - 2026-02-26
### Auditoria Final & Correção Estrutural SaaS
**Resumo:** Realizada uma auditoria completa com foco em isolamento de dados entre usuários (Multi-tenancy), atribuição correta de faturamento e fluxo de sucesso do cliente.

- **Isolamento de Dados (Bug de Segurança Fixado):**
  - Fixado bug onde o Dashboard `Overview` e a listagem de `Produtos` exibiam dados de todos os usuários. Agora, cada lojista vê apenas suas próprias vendas e produtos.
- **Atribuição de Faturamento (Bug Fixado):**
  - Refatorada a API `process-payment.ts` para buscar o produto pelo slug e vincular automaticamente o `user_id` (owner) a todos os pedidos criados (Stripe, PushinPay, MundPay).
- **Polling & Redirecionamento (UX Fixado):**
  - Implementado polling automático para Pix (PushinPay) e MundPay. O cliente agora é redirecionado instantaneamente para a página de sucesso assim que o pagamento é confirmado.
  - Correção do `pedido_id` no sucesso do Stripe (agora exibe o ID real em vez de um timestamp).
- **APIs Serverless:**
  - Adicionados cabeçalhos de `Cache-Control: no-store` para evitar caching indevido em CDNs.
  - Implementada proteção em `api/produtos` para impedir exclusão ou edição de produtos por outros usuários.
- **Responsividade:**
  - Ajuste final no `Sucesso.tsx` utilizando `100dvh` para evitar comportamentos anômalos no Safari Mobile.

## [v1.2.0] - 2026-02-26
### Performance Ultra & Responsividade Total
- **Performance:** CSS Crítico inline, fonts assíncronas, dns-prefetch.
- **Responsividade:** Media queries para smartphones, tablets e iPads. Suporte a notch (safe-area).
- **Robustez:** Fallback de buscas de produto por prefixo e slug base.

---
*Assinado: Agente Antigravity (Auditor Superior)*
