# Auditoria Contínua - SharkPay Checkout

## [2.5.3] - 2026-03-02
### Schema Cache Resilience: Fix de Colunas Inexistentes
**Resumo:** Correção definitiva para o erro de "schema cache" que ocorria após alterações no banco.
- **API Robustness:** Melhoria no tratamento de erros de coluna para garantir que o salvamento básico (nome/preço) sempre funcione.
- **Cache Refresh:** Adicionado comando de notificação para o Supabase atualizar o esquema de tabelas imediatamente.

### BuyPix Production Ready: Sincronização & Estabilidade
**Resumo:** Versão final da integração BuyPix com banco de dados sincronizado e API resiliente.
- **Resiliência:** API de produtos atualizada para evitar erros de esquema mesmo em transições de banco de dados.
- **Produção:** Deployment final com todas as colunas de Gateway e SaaS validadas.
- **PWA Icons:** Ícones de alta resolução da SharkPay aplicados permanentemente para iOS/Android.

### Sidebar Sync: Contagem de Gateways Corrigida
**Resumo:** Correção da lógica de exibição no sidebar para refletir o novo gateway BuyPix.
- **UI Sync:** Atualização do contador de gateways disponíveis (Total: 4).
- **Hook useIntegrations:** Inclusão do ID `buypix` na verificação de gateways ativos para garantir atualização dinâmica do badge.

### BuyPix Integration: Gateway de Pagamento Instantâneo
**Resumo:** Integração completa do gateway BuyPix para processamento de Pix com confirmação automática e alta conversão.
- **Gateway BuyPix:** Implementação do fluxo completo de depósito, geração de QR Code e Verificação de Status via Webhook seguro (HMAC-SHA256).
- **Gestão por Produto:** Seletor de gateway no cadastro de produtos, permitindo habilitar BuyPix individualmente para cada oferta.
- **Visual Premium:** Demonstração visual dos gateways ativos nos cards de produtos seguindo a identidade visual SharkPay.
- **Custom Icons:** Sincronização dos ícones de favicons e telas iniciais (PWA) utilizando as referências da marca.


## [v1.8.0] - 2027-02-27
### Otimização Mobile Premium & Sidebar Responsiva
**Resumo:** Otimização completa da experiência mobile em todo o ecossistema (Checkout e Admin).
- **Mobile UX:** Implementação de tipografia fluida, teclados numéricos inteligentes (CPF/Tel) e prevenção de zoom indesejado no mobile.
- **Sidebar Admin:** Novo sistema de hover para desktop e trigger/header fixo para mobile, garantindo funcionalidade total em qualquer tela.
- **Performance:** Refestelamento de lazy loading e otimização de renderização crítica no index.html.

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
