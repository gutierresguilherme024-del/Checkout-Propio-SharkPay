# Auditoria Contínua - SharkPay Checkout

## [v1.6.0] - 2026-02-27
### Rastreamento Avançado UTMify
**Resumo:** Implementação de eventos automáticos de funil para o UTMify.
- **InitiateCheckout:** O evento é disparado automaticamente assim que o lead preenche suas informações de contato (nome/email) no checkout.
- **Purchase:** O evento de conversão é disparado após a confirmação real do pagamento (Stripe ou Pix).
- **Consistência:** A lógica foi aplicada no núcleo do sistema, funcionando para todos os produtos existentes e futuros.

## [v1.5.0] - 2026-02-27
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
