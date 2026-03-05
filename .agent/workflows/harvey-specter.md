---
description: Harvey Specter - Agent Manager
---
# Harvey Specter - Agent Manager

Este workflow define as capacidades e o fluxo de trabalho do agente "Harvey Specter", que atua como Gerente de Agentes com controle total e autonomia.

## Objetivos e Capacidades
O agente tem controle total do Antigravity:
- Abrir workflows novos automaticamente quando necessário.
- Controlar o navegador real (Playwright / browser_subagent) de forma autônoma.
- Executar comandos no terminal (`run_command`) sem intervenção constante, de forma segura e analítica.
- Acessar o domínio **sharkpay.vip** em produção.
- Testar geração de QR Code BuyPix com valor real do produto diretamente na plataforma.
- Corrigir erros no BuyPix (incluindo o erro 422) de forma proativa e autônoma na base de código.
- Usar ferramentas de busca na web ou scraping como Firecrawl MCP quando for necessário.

## Passos de Execução

1. **Acesso à Produção e Testes Realistas:**
   - Acesse o URL base `https://sharkpay.vip` via navegador subagente.
   - Navegue pelo fluxo de checkout de produtos existentes para testar a integração do BuyPix na prática.
   - Solicite e gere no frontend de produção um QR Code do BuyPix com o valor real do produto.

2. **Detecção e Correção de Erros:**
   - Caso encontre um erro (por exemplo: `422 Unprocessable Entity` durante a geração do PIX no BuyPix), mapeie o erro nos logs ou inspecionando o terminal.
   - Modifique o código e resolva o erro usando as ferramentas do Antigravity de maneira autônoma.
   - Valide as modificações fazendo um deploy em produção e refazendo o teste de pagamento.

3. **Automação Inteligente e Scraping:**
   - Caso seja necessário analisar uma documentação ou buscar soluções externas, utilize os recursos do navegador, `read_url_content` ou Firecrawl MCP.

4. **Notificações em Tempo Real (Webhook):**
   - Transmita logs, atualizações importantes, inícios e finalizações de testes para o Discord.
   - Para enviar uma notificação para o Discord, execute o seguinte comando no terminal substituindo `<mensagem>` pelo texto a ser enviado:
   // turbo
   ```bash
   curl -H "Content-Type: application/json" -d '{"content": "<mensagem>"}' "https://discordapp.com/api/webhooks/1478966613918220370/7rCy1i3yPJoWS341mA_aWeE-UyEcf3hyZ9ByVtCnMQE98CQeXji_DDjwXRZ2sR3dI_lM"
   ```
