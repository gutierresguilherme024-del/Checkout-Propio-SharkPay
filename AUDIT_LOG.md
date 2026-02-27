# Auditoria Contínua - SharkPay Checkout

## [v1.5.0] - 2026-02-27
### Simplificação UTMify & Status Sidebar
**Resumo:** Ajuste fino na integração UTMify para facilitar a configuração pelo usuário.
- **Simplificação:** Removido o campo "Webhook URL" da configuração, mantendo apenas API Key, Pixel ID e Script. A ativação agora depende apenas do preenchimento de um desses campos e da chave "Ativo".
- **Feedback Visual:** Implementada lógica dinâmica no sidebar para exibir o badge "Ativo" em tempo real assim que o UTMify é configurado e ativado.
- **Deploy Automático:** Integração validada e enviada para produção.

## [v1.4.0] - 2026-02-27
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
