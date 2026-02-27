---
description: Deploy instantâneo do projeto SharkPay Checkout para produção na Vercel
---

// turbo-all

## Deploy Instantâneo — SharkPay Checkout

Execute esta sequência sempre que precisar colocar qualquer alteração em produção.

### 1. Build de produção
```powershell
npm run build
```

### 2. Deploy na Vercel (produção)
```powershell
npx vercel --prod --yes
```

A aplicação estará disponível em:
- **Produção:** https://www.sharckpay.vip
- **Changelog:** https://www.sharckpay.vip/admin/changelog

### Regra de Ouro — Auditoria Contínua
Antes de rodar o deploy, certificar-se de:
1. Incrementar a versão no array `versions[]` em `src/views/admin/AdminChangelog.tsx`
2. Atualizar o `AUDIT_LOG.md` na raiz com a nova entrada
3. Definir o `status` correto da versão (`concluido`, `em_andamento` ou `falhou`)
