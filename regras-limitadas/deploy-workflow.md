# Regra de Workflow: Preview → Produção

## Fluxo Obrigatório

1. Todas as edições são feitas e validadas no preview local (localhost)
2. Somente após aprovação explícita do usuário o agente executa o deploy
3. O que está em produção deve ser IDENTICO ao que foi aprovado no preview

## Regra do Agente

Quando o usuário disser "coloca em produção", "faz o deploy" ou "sobe para produção":

PASSO 1 - Rode o build local e confirme que passa sem erros:
`tsc && vite build`

PASSO 2 - Faça commit de tudo que foi alterado:
`git add .`
`git commit -m "feat: [descreva aqui o que foi melhorado]"`
`git push origin main`

PASSO 3 - Execute o deploy de produção:
`npx vercel --prod --yes`

PASSO 4 - Confirme que a URL de produção está exibindo exatamente o que foi aprovado no preview. Acesse https://sharkpaycheckout.vercel.app e descreva para o usuário o que foi publicado.

PASSO 5 - Reporte ao usuário:
- O que foi alterado
- A URL de produção
- Confirmação visual de que está igual ao preview

## Regras de Segurança

- NUNCA fazer deploy sem build local passar
- NUNCA subir chaves ou secrets no código
- NUNCA fazer deploy sem commit registrado no GitHub
- SEMPRE usar variáveis de ambiente via import.meta.env
- SEMPRE descrever o que mudou antes de confirmar o deploy

## MCPs Disponíveis

- Stripe MCP: usado para criar produtos e preços
- N8N MCP: usado para disparar workflows de entrega
- Supabase: banco de dados e autenticação
- Vercel CLI: deploy via npx vercel --prod --yes

## Comando de Deploy Completo

Quando acionado, execute sempre nessa ordem:
`tsc && vite build && git add . && git commit -m "deploy: produção aprovada pelo usuário" && git push origin main && npx vercel --prod --yes`
