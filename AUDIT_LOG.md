# Auditoria Contínua - SharkPay Checkout

## [v1.7.0] - 2026-02-27
### Personalização Mobile: Ícones PWA & Favicons
**Resumo:** Atualização visual da aplicação quando instalada em dispositivos móveis.
- **Ícones Home Screen:** Implementação de suporte PWA (manifest.json) com ícones de alta resolução da pasta Front-icons-favicons.
- **Apple Touch Icon:** Configuração específica para garantir que a marca SharkPay apareça perfeitamente no iOS (iPhone/iPad).
- **Favicon Dinâmico:** Atualização do ícone da aba do navegador para maior consistência visual.

## [v1.6.0] - 2026-02-27
### Rastreamento Avançado UTMify
**Resumo:** Implementação de eventos automáticos de funil para o UTMify.
- **InitiateCheckout:** O evento é disparado automaticamente assim que o lead preenche suas informações de contato (nome/email) no checkout.
- **Purchase:** O evento de conversão é disparado após a confirmação real do pagamento (Stripe ou Pix).
- **Consistência:** A lógica foi aplicada no núcleo do sistema, funcionando para todos os produtos existentes e futuros.

## [v1.5.0] - 2026-02-27
### Simplificação UTMify & Status Sidebar
**Resumo:** Ajuste fino na integração UTMify para facilitar a configuração pelo usuário.
- **Simplificação:** Removido o campo "Webhook URL" da configuração, mantendo apenas API Key, Pixel ID e Script. 
- **Feedback Visual:** Implementada lógica dinâmica no sidebar para exibir o badge "Ativo" em tempo real.

## [v1.4.0] - 2026-02-27
### Integração Nativa UTMify
**Resumo:** O rastreamento via UTMify foi totalmente integrado ao frontend e aos painéis de administração.
- **Configuração:** Adicionados campos para API Key, Pixel ID e Script UTMify.
- **Injeção Dinâmica:** O script UTMify agora é automaticamente injetado no <head> dos checkouts.

## [v1.3.3] - 2026-02-26
### Auditoria Final & Correção Estrutural SaaS
**Resumo:** Realizada uma auditoria completa com foco em isolamento de dados entre usuários (Multi-tenancy).
- **Isolamento de Dados:** Cada lojista vê apenas suas próprias vendas e produtos.
- **Atribuição de Faturamento:** Pedidos vinculados automaticamente ao owner do produto.

---
*Assinado: Agente Antigravity (Auditor Superior)*
