# Fluxo de Trabalho da IA - SharkPay

Este documento estabelece as regras para a IA (Antigravity) ao realizar edições e deploys no projeto.

## 1. Local de Edições
- Todas as novas regras e logs de mudanças críticas devem ser registrados nesta pasta `regras-limitadas`.
- Antes de cada grande mudança, a IA deve consultar o arquivo `limitaçoes.md` para garantir que as regras de negócio de integração sejam respeitadas.

## 2. Funcionamento do Preview
- A aplicação deve ser resiliente. Erros de configuração (como chaves de API ausentes) não devem causar o travamento total da aplicação (Tela Branca).
- Em caso de falha de conexão, exibir estados de "fallback" ou avisos no console em vez de interromper o fluxo de renderização.

## 3. Deployment
- O deployment para Vercel em produção só deve ser realizado sob comando explícito do usuário.
- Antes do deploy, a IA deve garantir que o `npm run build` está passando sem erros de TypeScript ou Lint.

## 4. Estética Visual
- Manter o padrão visual de alta performance, utilizando as cores da marca (Azul Primary, Dark Background) e as animações definidas nos componentes base.
