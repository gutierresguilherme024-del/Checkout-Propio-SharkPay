# Regras de Limitações de Integrações - SharkPay

Este documento define as regras de negócio para a exibição e funcionamento das integrações no sistema. A IA deve seguir estas limitações ao analisar o status das conexões.

## 1. Regras Globais de Status
- **Conectado (Ativo)**: Quando a integração possui todas as chaves obrigatórias preenchidas E o switch "Ativo" está ligado.
- **Inativo**: Quando o usuário desliga manualmente o switch "Ativo", independentemente das chaves estarem preenchidas.
- **Pendente (Configuração Incompleta)**: Quando o switch está ligado mas faltam chaves obrigatórias.

## 2. Limitações por Categoria
### Pagamentos
- **Stripe**: Requer `pubKey` e `secKey`. Sem estas chaves, o checkout não deve permitir processamento de cartão.
- **PushinPay**: Requer `apiToken`. Sem este token, o checkout não deve exibir a opção de Pix Dinâmico.
- **MundPay**: Requer `apiToken` e `webhookSecret`. Utilizado como alternativa global para produtos digitais.
- **Limite**: Atualmente o sistema suporta até 1 gateway de Cartão (Stripe ou MundPay) e 1 gateway de Pix simultaneamente no Checkout.

### Rastreamento
- **UTMify**: Requer `apiKey`. O `pixelId` é opcional mas recomendado.
- **Impacto**: Se inativo, o sistema não deve disparar eventos para o n8n ou outros webhooks de rastreio.

### Automação (n8n)
- **Status**: Considerado "Ativo" se houver pelo menos um webhook de recebimento de eventos configurado e habilitado.

## 3. Exibição no Front-end (Sidebar/Dashboard)
- O Sidebar deve exibir badges dinâmicos refletindo o número de integrações *reais* conectadas.
- **Gateway de Pagamento**: Se nenhum estiver conectado, exibir badge de aviso crítico.
26: 
## 4. Design e Layout
- **Carrosséis na Home**: Está terminantemente PROIBIDO o uso de carrosséis de imagens ou integrações com navegação por setas e pontos (estilo `IntegrationCarousel` ou `HeroCarousel`) na página inicial. O design deve ser estático e direto.
- **Seletor de Temas**: O seletor de tema (Claro/Escuro) deve estar SEMPRE visível no rodapé da barra lateral administrativa para garantir acessibilidade e consistência visual.

- **Logos**: Está PROIBIDO exibir a logo SharkPay (ícone + texto) acima ou sobre a imagem do produto no Checkout. A imagem do produto deve ser o elemento visual de maior destaque no topo do resumo de compra para maximizar a conversão.
- **Otimização Mobile**: Em dispositivos móveis, a imagem do produto deve aparecer imediatamente no topo, garantindo que o lead identifique o produto sem distrações de Branding da plataforma.
