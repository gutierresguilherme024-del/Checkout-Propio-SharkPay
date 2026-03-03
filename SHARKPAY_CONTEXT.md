# SHARKPAY CONTEXT & SKILLS SYSTEM v1.0

## 📌 Visão Geral do Projeto

**SharkPay** é uma engine de pagamento SaaS white-label focada em checkout próprio para produtos digitais (ebooks, infoprodutos, cursos).

### Tecnologias Core
- **Frontend**: React + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL + RLS)
- **Gateways de Pagamento**: Stripe (cartão), PushinPay (PIX), MundPay (PIX popup), BuyPix (PIX)
- **Automação**: N8N para webhooks e entrega de produtos

### Arquitetura Modular
```
api/
├── process-payment.ts        # Engine principal de pagamento
├── bridge.ts                 # Bridge para comunicação
├── webhooks/
│   ├── stripe.ts
│   ├── buypix.ts
│   ├── mundipagg.ts
│   └── pushinpay.ts
core/
├── gatewayInterface.ts       # Interface unificada Gateway
├── paymentRouter.ts          # Roteador de gateways
├── credentialService.ts      # Gerenciamento de credenciais
└── webhookNormalizer.ts      # Normalização de webhooks
gateways/
└── mundpay.ts                # Implementação MundPay
src/views/
├── Checkout.tsx              # Página de checkout (frontend)
└── admin/
    └── Payments.tsx          # Painel de configuração de integrações
```

### Fluxo de Pagamento Unificado

1. **Usuário preenche checkout** (`src/views/Checkout.tsx`)
   - Nome completo obrigatório (validação no frontend)
   - Email, valor, método de pagamento (card/pix)
   - Gateway selecionado (stripe/pushinpay/mundpay/buypix)

2. **POST /api/process-payment** (validação centralizada)
   - ✅ Valida reCAPTCHA (score >= 0.3)
   - ✅ Valida nome completo (mínimo 2 palavras, cada uma >= 2 caracteres)
   - ✅ Registra log `VALIDATION_FAILED` em `logs_sistema` se falhar
   - ❌ **NUNCA cria pedido no Supabase se validação falhar**
   - ✅ Retorna HTTP 400 com mensagem amigável em caso de erro de validação

3. **Criação do pedido e cobrança**
   - Gera `pedido_id` único: `PED-{timestamp}-{random}`
   - Identifica `user_id` do produto (SaaS multi-tenant)
   - Busca credenciais do gateway (tabela `integrations`)
   - Chama gateway específico (Stripe, PushinPay, MundPay, BuyPix)
   - Insere pedido na tabela `pedidos` com status inicial

4. **Retorno unificado ao frontend**
```json
{
  "success": true,
  "checkout_url": "https://...",
  "pedido_id": "PED-123456-ABC",
  "gateway": "stripe"
}
```

5. **Webhooks processam confirmação**
   - Gateway notifica `/api/webhooks/{gateway}`
   - Atualiza status do pedido: `pending` → `paid` → `delivered`
   - Dispara evento para N8N (entrega de produto digital)

---

## 🔍 Workflow Detalhado: PIX via PushinPay/MundPay/BuyPix

### Validação de Nome Completo (CRÍTICO)
**Localização**: `api/process-payment.ts` (linhas 21-39)

```typescript
function validarNomeCompleto(nome: string | null | undefined): { valid: boolean; error?: string } {
    if (!nome || typeof nome !== 'string') {
        return { valid: false, error: 'Nome completo obrigatório (nome + sobrenome)' }
    }
    
    const nomeParts = nome.trim().split(/\s+/).filter(Boolean)
    
    if (nomeParts.length < 2) {
        return { valid: false, error: 'Nome completo obrigatório (nome + sobrenome)' }
    }
    
    // Verifica se tem pelo menos 2 caracteres em cada parte (evita "A B")
    const temPartesValidas = nomeParts.every(part => part.length >= 2)
    if (!temPartesValidas) {
        return { valid: false, error: 'Nome completo obrigatório (nome + sobrenome)' }
    }
    
    return { valid: true }
}
```

**Regra de Ouro**: Essa validação acontece **ANTES** de criar qualquer registro no Supabase.

### Fluxo de Erro de Validação

1. **Validação falha** (ex: nome = "João")
2. **Log de auditoria** é inserido em `logs_sistema`:
```typescript
await supabase.from('logs_sistema').insert({
    user_id: productOwnerId,
    tipo: 'audit',
    gateway: 'pushinpay',
    evento: 'VALIDATION_FAILED',
    pedido_id: null,
    sucesso: false,
    mensagem: `Validação falhou: Nome completo obrigatório (nome + sobrenome) | Email: joao@test.com | Nome recebido: "João"`,
    payload: { nome_recebido: nome, email, valor, checkout_slug, erro: validacaoNome.error }
})
```

3. **Retorno HTTP 400**:
```json
{
  "success": false,
  "error": "Nome completo obrigatório (nome + sobrenome)"
}
```

4. **Frontend exibe erro** (`src/views/Checkout.tsx`):
   - Erro 400: mostra mensagem inline abaixo do campo nome (texto vermelho)
   - **NUNCA** mostra "ambiente local" ou "API offline" em erros 400
   - Toast Sonner é usado apenas para erros 5xx ou falha de rede

### PIX: Popup vs Redirect

**MundPay** (popup + polling):
- Abre modal com QR Code PIX
- Frontend faz polling a cada 3s: `GET /api/bridge?action=check&pid={pedido_id}`
- Quando status muda para `paid`, redireciona para `/sucesso?pid={pedido_id}`

**PushinPay/BuyPix** (redirect):
- Redireciona diretamente para página do gateway com QR Code
- Webhook notifica quando pago
- Usuário clica em "Voltar" e acessa `/sucesso?pid={pedido_id}`

---

## 🗄️ Estrutura de Dados (Supabase)

### Tabela: `pedidos`
```sql
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id TEXT UNIQUE NOT NULL,
    user_id TEXT,                    -- SaaS: dono do produto
    email_comprador TEXT NOT NULL,
    nome_comprador TEXT,
    valor DECIMAL(10,2) NOT NULL,
    metodo_pagamento TEXT,           -- 'card' | 'pix'
    gateway TEXT,                    -- 'stripe' | 'pushinpay' | 'mundpay' | 'buypix'
    status TEXT DEFAULT 'pending',   -- 'pending' | 'paid' | 'delivered' | 'bloqueado_fraude'
    checkout_url TEXT,
    produto_nome TEXT,
    checkout_slug TEXT,
    utm_source TEXT,
    erro TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: `integrations`
```sql
CREATE TABLE integrations (
    id TEXT NOT NULL,                -- 'stripe' | 'pushinpay' | 'mundpay' | 'buypix'
    user_id TEXT,                    -- SaaS: dono da integração (NULL = global)
    enabled BOOLEAN DEFAULT false,
    config JSONB,                    -- { apiToken, webhookSecret, etc. }
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
);
```

**Exemplo de config para BuyPix**:
```json
{
  "buypix_api_key": "bpx_sVXfxDNUaWqErFSnx6xxczbKrc6KvqlItC1v43f6",
  "buypix_webhook_secret": "https://www.sharckpay.vip/api/webhooks/buypix"
}
```

### Tabela: `logs_sistema`
```sql
CREATE TABLE logs_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    tipo TEXT,                       -- 'audit' | 'webhook' | 'error'
    gateway TEXT,
    evento TEXT,                     -- 'VALIDATION_FAILED' | 'pix_gerado' | 'payment_confirmed'
    pedido_id TEXT,
    sucesso BOOLEAN,
    mensagem TEXT,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### RLS (Row-Level Security)
**CRÍTICO**: A tabela `integrations` precisa de policies de **escrita** (INSERT/UPDATE) além de leitura:

```sql
CREATE POLICY "Users can manage own integrations"
ON public.integrations
FOR ALL
USING (auth.uid()::text = user_id OR user_id IS NULL)
WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);
```

**Bug histórico resolvido**: antes só havia policy `FOR SELECT`, causando erro HTTP 400 (código 42501) ao salvar integrações no Admin.

---

## 🎯 Objetivos do Projeto

1. **White-label SaaS**: Múltiplos usuários (`user_id`) com suas próprias credenciais de gateway
2. **Validação rigorosa**: Antifraude via reCAPTCHA + validação de nome completo
3. **UX impecável**: Mensagens de erro amigáveis, nunca expor detalhes técnicos
4. **Logs completos**: Auditoria de todas as operações (sucesso ou falha)
5. **Deploy contínuo**: Vercel production (`sharkpay.vip` / `sharckpay.vip`)

---

## 📝 Resumo para Outras IAs / Agentes

**Se você é uma IA assumindo este projeto, leia isto primeiro:**

- **Nunca crie pedido no Supabase antes de validar** nome, email, CPF, etc.
- **Sempre registre log `VALIDATION_FAILED`** quando validação falhar
- **Retorne HTTP 400** com mensagem amigável em erros de validação
- **Retorne HTTP 500** apenas em erros internos graves
- **Frontend trata erro 400** como mensagem inline (não toast)
- **Cada gateway é um arquivo separado** em `gateways/`
- **Interface unificada** em `core/gatewayInterface.ts` (`Gateway.createCharge()`)
- **Process-payment.ts** é o motor central: ele orquestra tudo
- **MundPay usa popup + polling**, outros gateways usam redirect
- **BuyPix endpoint**: `https://buypix.me/api/v1/deposits` (POST)
- **Deploy**: sempre usar `vercel --prod` após `git push`
- **Cache Vercel**: invalidar após deploy de APIs críticas

---

## 🛠️ SHARKPAY SKILLS SYSTEM v1.0

### 1. Core Architecture Skills

**Princípios Fundamentais:**
- ✅ **Arquitetura modular**: 1 arquivo por gateway em `gateways/`
- ✅ **Interface unificada**: Todos os gateways implementam `core/gatewayInterface.ts`
- ✅ **Single Responsibility**: `api/process-payment.ts` orquestra, gateways executam
- ✅ **Validação centralizada**: SEMPRE validar em `process-payment.ts` ANTES de qualquer insert no Supabase
- ✅ **Retorno padronizado**: `{ success, error?, checkout_url?, pedido_id, gateway }`

**Regras de Código:**
- Nunca misturar lógica de negócio com lógica de gateway
- Manter separação clara: Frontend → API → Core → Gateway → External API
- Usar environment variables com fallback: `process.env.X || process.env.VITE_X`
- Sempre tipar retornos com TypeScript (evitar `any` em produção)

**Arquivos Core que NUNCA devem ser deletados:**
- `api/process-payment.ts` (motor principal)
- `core/gatewayInterface.ts` (contrato de gateways)
- `core/paymentRouter.ts` (roteamento de gateways)
- `src/views/Checkout.tsx` (checkout frontend)

---

### 2. Frontend Checkout & UX Skills

**Tratamento de Erros HTTP:**
- ✅ **Erro 400 (validação)**: Mostrar exatamente a mensagem que veio do backend
  - Exibir inline abaixo do campo relevante (texto vermelho pequeno)
  - **NUNCA** mostrar "ambiente local", "API offline", "conexão falhou"
  - Mensagem deve ser amigável: "Nome completo obrigatório (nome + sobrenome)"

- ✅ **Erro 5xx (servidor)**: Toast Sonner vermelho genérico
  - Mensagem: "Erro ao processar pagamento. Tente novamente."
  - Não expor stack trace ou detalhes técnicos

- ✅ **Erro de rede (fetch failed)**: Toast amarelo
  - Mensagem: "Sem conexão. Verifique sua internet."

**Validação Frontend (antes de enviar):**
```typescript
// Nome: mínimo 2 palavras, cada uma >= 2 caracteres
const nomeValido = nome.trim().split(/\s+/).filter(Boolean).length >= 2

// Email: regex básico
const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// Valor: número positivo
const valorValido = parseFloat(valor) > 0
```

**Loading States:**
- Desabilitar botão "Pagar" durante processamento
- Mostrar spinner + texto "Processando..."
- Nunca permitir double-submit (duplo clique)

**Localização:** `src/views/Checkout.tsx` (linhas 100-150 aproximadamente)

---

### 3. Backend Payment Engine Skills

**Validação Sequencial (ordem obrigatória):**
1. **reCAPTCHA** (se habilitado): score >= 0.3
2. **Campos obrigatórios**: `method`, `email`, `valor`
3. **Nome completo**: mínimo 2 palavras, cada palavra >= 2 caracteres
4. **Email**: formato válido
5. **CPF** (se aplicável): algoritmo de validação brasileiro

**Logging de Validações Falhadas:**
```typescript
// SEMPRE registrar em logs_sistema quando validação falhar
await supabase.from('logs_sistema').insert({
    user_id: productOwnerId,
    tipo: 'audit',
    gateway: gateway || 'unknown',
    evento: 'VALIDATION_FAILED',
    pedido_id: null,  // Importante: não há pedido ainda
    sucesso: false,
    mensagem: `Validação falhou: ${erro} | Email: ${email} | Nome: "${nome}"`,
    payload: { nome_recebido: nome, email, valor, checkout_slug, erro }
})
```

**Regra de Ouro da Validação:**
```
❌ ERRADO:
1. Criar pedido no Supabase
2. Validar nome
3. Se inválido, deletar pedido

✅ CORRETO:
1. Validar TUDO
2. Se válido, criar pedido
3. Se inválido, retornar HTTP 400 + log
```

**Try/Catch Obrigatório:**
```typescript
try {
    // Validação
    const validacao = validarNomeCompleto(nome)
    if (!validacao.valid) {
        await registrarLogValidacao(...)
        return res.status(400).json({ success: false, error: validacao.error })
    }
    
    // Criar pedido
    const pedido = await criarPedido(...)
    
    // Chamar gateway
    const resultado = await gateway.createCharge(...)
    
    return res.status(200).json({ success: true, ...resultado })
} catch (err) {
    console.error('[process-payment] Erro interno:', err)
    await registrarLogErro(...)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
}
```

**Localização:** `api/process-payment.ts` (linhas 42-686)

---

### 4. Error Handling & User Feedback Skills

**Mensagens de Erro Amigáveis (Dicionário):**
```typescript
const mensagensAmigaveis = {
    // Validação
    'nome_invalido': 'Nome completo obrigatório (nome + sobrenome)',
    'email_invalido': 'Digite um email válido',
    'cpf_invalido': 'CPF inválido. Verifique os números digitados',
    
    // Gateway
    'cartao_recusado': 'Cartão recusado. Tente outro cartão ou forma de pagamento',
    'saldo_insuficiente': 'Saldo insuficiente. Entre em contato com seu banco',
    'gateway_indisponivel': 'Meio de pagamento temporariamente indisponível',
    
    // Genéricos
    'erro_interno': 'Erro ao processar pagamento. Tente novamente em instantes',
    'recaptcha_failed': 'Transação bloqueada por suspeita de fraude'
}
```

**Nunca Expor ao Usuário:**
- Stack traces completos
- Mensagens de banco de dados (`SQLSTATE`, `violates constraint`)
- Tokens, API keys, secrets
- IPs, URLs internas
- Mensagens de debug (`console.log`, `DEBUG:`)

**Prioridade de Exibição:**
1. **UX amigável** (usuário entende o que fazer)
2. **Segurança** (não expor informações sensíveis)
3. **Logs completos** (para debug interno)

**Exemplo de Conversão:**
```typescript
// ❌ RUIM (expõe detalhes técnicos)
return res.status(500).json({ 
    error: 'TypeError: Cannot read property "token" of undefined at line 234'
})

// ✅ BOM (amigável + log interno)
console.error('[stripe] Token não encontrado:', err)
await registrarLog({ tipo: 'error', mensagem: err.stack })
return res.status(500).json({ 
    error: 'Erro ao processar pagamento. Nossa equipe foi notificada.'
})
```

---

### 5. Supabase & Logging Skills

**RLS (Row-Level Security) - Checklist:**
- ✅ Tabelas públicas: `produtos`, `pedidos` (leitura anônima)
- ✅ Tabelas privadas: `integrations`, `logs_sistema` (leitura/escrita autenticada)
- ✅ Policies de escrita: `FOR INSERT`, `FOR UPDATE`, `FOR DELETE`
- ✅ Policy padrão SaaS: `auth.uid()::text = user_id OR user_id IS NULL`

**Sempre Inserir Logs Antes de Operações Críticas:**
```typescript
// Antes de chamar API externa
await supabase.from('logs_sistema').insert({
    tipo: 'audit',
    evento: 'api_call_started',
    gateway: 'stripe',
    pedido_id: pid,
    mensagem: 'Iniciando chamada para Stripe API'
})

// Chamar API
const resultado = await stripe.charges.create(...)

// Depois da resposta
await supabase.from('logs_sistema').insert({
    tipo: 'audit',
    evento: 'api_call_completed',
    gateway: 'stripe',
    pedido_id: pid,
    sucesso: true,
    payload: resultado
})
```

**Queries Otimizadas:**
```sql
-- Criar índices em colunas frequentemente consultadas
CREATE INDEX idx_pedidos_pedido_id ON pedidos(pedido_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_created_at ON pedidos(created_at DESC);
CREATE INDEX idx_logs_pedido_id ON logs_sistema(pedido_id);
```

**Service Role vs Anon Key:**
- Use `service_role` em serverless functions (bypass RLS)
- Use `anon` key no frontend (sujeito a RLS)
- Nunca exponha `service_role` no código do frontend

**Estrutura de Config JSONB:**
```typescript
// Exemplo para integrations.config
interface GatewayConfig {
    // PushinPay
    apiToken?: string
    webhookSecret?: string
    
    // Stripe
    secretKey?: string
    publicKey?: string
    webhookSigningSecret?: string
    
    // BuyPix
    buypix_api_key?: string
    buypix_webhook_secret?: string
    
    // MundPay
    mundpay_api_key?: string
    mundpay_webhook_url?: string
}
```

---

### 6. Gateway Integration Skills

**Interface Unificada (`core/gatewayInterface.ts`):**
```typescript
export interface Gateway {
    createCharge(data: any): Promise<any>
    handleWebhook(payload: any): Promise<any>
}
```

**Cada Gateway Deve Implementar:**
1. **createCharge**: Recebe dados de pagamento, retorna URL de checkout ou token
2. **handleWebhook**: Processa notificação de pagamento confirmado

**Padrão de Implementação:**
```typescript
// gateways/exemplo.ts
import { Gateway } from '../core/gatewayInterface'

export const exemploGateway: Gateway = {
    async createCharge(data) {
        // 1. Extrair dados
        const { valor, email, nome, pedido_id, api_key } = data
        
        // 2. Montar payload para API externa
        const payload = {
            amount: valor * 100,  // centavos
            customer_email: email,
            customer_name: nome,
            order_id: pedido_id
        }
        
        // 3. Chamar API externa
        const response = await fetch('https://gateway.com/api/charge', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        
        const result = await response.json()
        
        // 4. Retornar formato padronizado
        return {
            checkout_url: result.payment_url,
            transaction_id: result.id,
            qr_code: result.pix_qr_code  // se PIX
        }
    },
    
    async handleWebhook(payload) {
        // Processar webhook conforme documentação do gateway
        return { status: 'paid', pedido_id: payload.order_id }
    }
}
```

**Fallback Entre Gateways:**
```typescript
// Se Stripe falhar, tentar PushinPay
try {
    return await stripe.createCharge(data)
} catch (err) {
    console.warn('[stripe] Falhou, tentando PushinPay:', err)
    return await pushinpay.createCharge(data)
}
```

**Endpoints de Gateways Ativos:**
- **Stripe**: `https://api.stripe.com/v1/charges`
- **PushinPay**: `https://api.pushinpay.com.br/api/pix`
- **MundPay**: `https://api.mundpay.com/v1/transactions`
- **BuyPix**: `https://buypix.me/api/v1/deposits` ✅ (testado e funcionando)

---

### 7. Deploy & DevOps Skills

**Workflow de Deploy Padrão:**
```bash
# 1. Testar localmente
npm run dev
# Testar: http://localhost:5173

# 2. Commitar mudanças
git add .
git commit -m "feat: adiciona validação de CPF no checkout"

# 3. Push para repositório
git push origin main

# 4. Deploy para Vercel (produção)
vercel --prod

# 5. Verificar logs de deploy
vercel logs sharkpay.vip --follow
```

**Branches Recomendadas:**
- `main`: produção (sempre estável)
- `develop`: desenvolvimento ativo
- `feature/nome-feature`: features grandes
- `hotfix/bug-critico`: correções urgentes

**Invalidação de Cache Vercel:**
```bash
# Após deploy de API crítica, forçar rebuild
vercel --force

# Ou via interface web:
# Vercel Dashboard → Deployments → ... → Redeploy
```

**Variáveis de Ambiente (.env):**
```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # NUNCA expor no frontend

# Gateways
STRIPE_SECRET_KEY=sk_live_...
PUSHINPAY_TOKEN=xxx
MUNDPAY_API_KEY=xxx
BUYPIX_API_KEY=bpx_...

# Outros
RECAPTCHA_SECRET_KEY=6Lf...
VITE_APP_URL=https://sharkpay.vip
```

**Checklist Pré-Deploy:**
- [ ] Todos os testes passando (`npm run test`)
- [ ] Build sem erros (`npm run build`)
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] RLS policies configuradas no Supabase
- [ ] Webhooks URLs atualizadas nos painéis dos gateways
- [ ] Commit message descritivo e profissional

**Mensagens de Commit Profissionais:**
```
✅ BOM:
feat: adiciona validação de nome completo no checkout PIX
fix: corrige bug de RLS policy em integrations
refactor: modulariza lógica de gateways em arquivos separados
docs: atualiza SHARKPAY_CONTEXT.md com novo Skills System

❌ RUIM:
update
fix
changes
teste
wip
```

---

### 8. Segurança, Validação & Antifraude Skills

**Validação de CPF (Algoritmo Brasileiro):**
```typescript
function validarCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    cpf = cpf.replace(/\D/g, '')
    
    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) return false
    
    // Verifica se não é sequência repetida (111.111.111-11)
    if (/^(\d)\1{10}$/.test(cpf)) return false
    
    // Validação do primeiro dígito verificador
    let soma = 0
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i)
    }
    let resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpf.charAt(9))) return false
    
    // Validação do segundo dígito verificador
    soma = 0
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i)
    }
    resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpf.charAt(10))) return false
    
    return true
}
```

**Rate Limit Básico:**
```typescript
// Implementação simples usando Map em memória (melhor: usar Redis)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>()

function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
    const now = Date.now()
    const record = rateLimitMap.get(ip)
    
    if (!record || now > record.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
        return true
    }
    
    if (record.count >= maxRequests) {
        return false  // Rate limit excedido
    }
    
    record.count++
    return true
}

// Uso em api/process-payment.ts
const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress
if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde 1 minuto.' })
}
```

**Sanitização de Inputs:**
```typescript
// Remover caracteres perigosos antes de salvar
function sanitize(input: string): string {
    return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')  // Remove scripts
        .replace(/<[^>]+>/g, '')  // Remove HTML tags
        .trim()
        .slice(0, 500)  // Limita tamanho
}

const nomeSanitizado = sanitize(req.body.nome)
const emailSanitizado = sanitize(req.body.email)
```

**reCAPTCHA v3 (Score-Based):**
```typescript
async function validarRecaptcha(token: string, secret: string): Promise<{ ok: boolean; score: number }> {
    try {
        const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token }).toString()
        })
        const data = await resp.json() as { success: boolean; score?: number }
        return { ok: data.success, score: data.score ?? 1 }
    } catch {
        return { ok: true, score: 1 }  // fail-open: deixa passar se API indisponível
    }
}

// Score < 0.3 = provável bot
// Score 0.3-0.7 = suspeito
// Score > 0.7 = humano confiável
```

**Webhook Signature Validation:**
```typescript
// Exemplo para Stripe
import crypto from 'crypto'

function validateStripeWebhook(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret)
    const digest = hmac.update(payload).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}
```

**Bloqueio de Emails Descartáveis:**
```typescript
const emailsDescartaveisRegex = /(tempmail|guerrillamail|mailinator|10minutemail)/i

function isEmailDescartavel(email: string): boolean {
    return emailsDescartaveisRegex.test(email)
}

// Uso
if (isEmailDescartavel(email)) {
    return res.status(400).json({ error: 'Use um email válido e permanente' })
}
```

---

## 📌 Regras Globais do Rovo para o SharkPay

**Estas regras se aplicam a TODAS as respostas e ações:**

1. **Sempre ler os arquivos relevantes antes de sugerir qualquer mudança**
   - Não assumir estrutura de código sem verificar
   - Usar `open_files` ou `expand_code_chunks` antes de modificar

2. **Fornecer código completo dos arquivos alterados**
   - Nunca usar `// ... resto do código permanece igual`
   - Mostrar o arquivo inteiro com as mudanças aplicadas
   - Facilitar copy/paste para o usuário

3. **Priorizar UX amigável em todas as mensagens de erro**
   - Usuário final nunca deve ver termos técnicos
   - Mensagens devem ser claras e acionáveis
   - Exemplo: "Nome completo obrigatório (nome + sobrenome)" ✅
   - Contra-exemplo: "ValidationError: name field length < 2" ❌

4. **Validações devem bloquear ANTES de criar qualquer registro no Supabase**
   - Validar → Log (se falhar) → Retornar HTTP 400
   - Nunca criar pedido para depois validar

5. **Em erro 400 usar exatamente a mensagem que veio do backend**
   - Frontend não deve "interpretar" ou "melhorar" mensagens de validação
   - Se backend retorna `{ error: "Nome completo obrigatório" }`, mostrar exatamente isso

6. **Nunca mostrar mensagens de "ambiente local", "API offline" ou "conexão" em erros 4xx**
   - Erro 400 = problema com os dados enviados (culpa do usuário)
   - Erro 500 = problema no servidor (culpa do sistema)
   - Erro de rede = problema de conectividade (culpa da internet)

7. **Pedir minha confirmação explícita antes de qualquer `git push` ou `vercel --prod`**
   - Sempre perguntar: "Posso fazer o deploy para produção?"
   - Aguardar resposta afirmativa antes de executar
   - Mostrar preview do que será deployado

8. **Manter o projeto preparado para virar SaaS white-label**
   - Sempre considerar `user_id` nas queries
   - Permitir múltiplas contas com suas próprias configurações
   - Nunca hardcodar credenciais ou configurações globais únicas

9. **Usar mensagens de commit profissionais e descritivas**
   - Seguir padrão: `tipo: descrição curta`
   - Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
   - Exemplo: `feat: adiciona validação de CPF no checkout`

10. **Sempre documentar mudanças significativas neste arquivo**
    - Atualizar `SHARKPAY_CONTEXT.md` quando arquitetura mudar
    - Manter histórico de decisões importantes
    - Facilitar onboarding de novos desenvolvedores ou IAs

---

**🎯 Objetivo Final:**
Transformar o SharkPay em uma **plataforma SaaS white-label de pagamentos** robusta, segura, escalável e com UX impecável, pronta para processar milhares de transações diárias com múltiplos tenants.

---

## 🛠️ SHARKPAY SKILLS SYSTEM v1.1 — DEPLOY VERSIONING (OBRIGATÓRIO)

### 9. Deploy Versioning & Changelog Skill (MANDATÓRIO EM TODOS OS DEPLOYS)

**Regras OBRIGATÓRIAS para TODOS os deploys em produção:**

#### 📋 Checklist Pré-Deploy (NUNCA pular estas etapas):

1. **Executar script de bump de versão:**
```powershell
# Sintaxe:
./scripts/bump-version.ps1 -BumpType [patch|minor|major] -Summary "Descrição clara" -Type [feat|fix|refactor|docs|chore]

# Exemplos:
./scripts/bump-version.ps1 -BumpType patch -Summary "Corrige validação de nome no checkout PIX" -Type fix
./scripts/bump-version.ps1 -BumpType minor -Summary "Adiciona suporte ao gateway BuyPix" -Type feat
./scripts/bump-version.ps1 -BumpType major -Summary "Refatoração completa da arquitetura de gateways" -Type refactor -BreakingChanges $true
```

2. **Verificar arquivos atualizados:**
   - ✅ `public/version.json` (versão atual + metadata)
   - ✅ `version-history.json` (histórico completo, últimas 50 versões)

3. **Commit e push:**
```bash
git add public/version.json version-history.json
git commit -m "feat: <descrição> (v1.2.3)"
git push origin main
```

4. **Deploy para produção:**
```bash
vercel --prod
```

5. **Pós-deploy (opcional mas recomendado):**
   - Inserir registro na tabela `deploy_history` do Supabase
   - Verificar que `/version.json` está acessível em produção
   - Confirmar que o histórico aparece no painel admin (`/admin/changelog`)

---

#### 🗂️ Estrutura de Arquivos de Versionamento

**`public/version.json`** (versão atual):
```json
{
  "version": "1.0.0",
  "deployed_at": "2026-03-03T12:28:00Z",
  "summary": "Descrição clara do que mudou neste deploy",
  "commit_hash": "a1b2c3d",
  "changed_files": [
    "api/process-payment.ts",
    "src/views/Checkout.tsx"
  ]
}
```

**`version-history.json`** (histórico completo):
```json
{
  "versions": [
    {
      "version": "1.0.1",
      "deployed_at": "2026-03-03T14:30:00Z",
      "summary": "Correção de bug na validação de CPF",
      "commit_hash": "d4e5f6g",
      "changed_files": ["api/process-payment.ts"],
      "breaking_changes": false,
      "type": "fix"
    },
    {
      "version": "1.0.0",
      "deployed_at": "2026-03-03T12:28:00Z",
      "summary": "Versão inicial do sistema",
      "commit_hash": "a1b2c3d",
      "changed_files": ["..."],
      "breaking_changes": false,
      "type": "feat"
    }
  ]
}
```

---

#### 📊 Tabela Supabase: `deploy_history`

```sql
CREATE TABLE public.deploy_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summary TEXT NOT NULL,
    commit_hash TEXT,
    changed_files JSONB,
    breaking_changes BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'feat',
    deployed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Políticas RLS:**
- Leitura pública (qualquer um pode ver histórico)
- Escrita apenas via `service_role` (backend)

**Para criar a tabela:**
```bash
# Execute no Supabase SQL Editor:
# scripts/create-deploy-history-table.sql
```

---

#### 🎨 Componente Frontend: DeploymentHistory

**Localização:** `src/components/admin/DeploymentHistory.tsx`

**Funcionalidades:**
- ✅ Carrega automaticamente `version.json` e `version-history.json`
- ✅ Exibe últimas 10 versões em cards expansíveis
- ✅ Mostra badge "Atual" para versão em produção
- ✅ Badges coloridos por tipo: feat (verde), fix (vermelho), refactor (azul), docs (roxo), chore (cinza)
- ✅ Badge "Breaking Change" para mudanças que quebram compatibilidade
- ✅ Lista de arquivos alterados (expansível)
- ✅ Data formatada em pt-BR
- ✅ Hash do commit Git
- ✅ Loading e error states

**Integração:**
- Exibido na página `/admin/changelog` (`src/views/admin/AdminChangelog.tsx`)
- Link no sidebar: "Atualizações" (ícone ⏳ History)

---

#### 🔄 Workflow Automático de Versionamento

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Developer faz mudanças no código                         │
│    ├── Implementa feature/fix                               │
│    └── Testa localmente                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 2. Rovo executa bump-version.ps1                            │
│    ├── Incrementa versão (patch/minor/major)                │
│    ├── Atualiza public/version.json                         │
│    ├── Adiciona entry em version-history.json               │
│    └── Captura commit hash e changed files                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 3. Rovo faz commit                                           │
│    git commit -m "feat: nova feature (v1.2.3)"              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 4. Rovo pede confirmação ao usuário                          │
│    "Posso fazer push e deploy para produção?"               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 5. Após confirmação: git push + vercel --prod                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 6. Vercel deploya automaticamente                            │
│    ├── Build & Deploy                                       │
│    ├── version.json fica disponível em /version.json        │
│    └── Frontend carrega novo histórico automaticamente      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 7. (Opcional) Rovo insere em deploy_history do Supabase     │
│    ├── Via API serverless function                          │
│    └── Backup redundante do histórico                       │
└──────────────────────────────────────────────────────────────┘
```

---

#### ✅ Benefícios do Sistema de Versionamento

1. **Rastreabilidade completa**: Saber exatamente o que mudou em cada deploy
2. **Histórico público**: Usuários podem ver o que foi atualizado
3. **Auditoria automática**: Logs de todos os deploys
4. **Comunicação transparente**: Changelog visível para stakeholders
5. **Rollback facilitado**: Saber qual versão reverter em caso de problema
6. **Profissionalismo**: Sistema de versioning semver padrão da indústria

---

#### 📌 Regras do Rovo para Versionamento

**SEMPRE que for fazer `vercel --prod`, o Rovo DEVE:**

1. ✅ Executar `./scripts/bump-version.ps1` ANTES do commit
2. ✅ Usar tipo correto de bump:
   - `patch` (1.0.0 → 1.0.1): bugfixes, pequenas correções
   - `minor` (1.0.0 → 1.1.0): novas features, sem breaking changes
   - `major` (1.0.0 → 2.0.0): breaking changes, refatorações grandes
3. ✅ Fornecer summary claro e descritivo (máximo 100 caracteres)
4. ✅ Usar type correto: `feat`, `fix`, `refactor`, `docs`, `chore`
5. ✅ Marcar `BreakingChanges = $true` se houver mudanças incompatíveis
6. ✅ Incluir versão no commit message: `"feat: descrição (v1.2.3)"`
7. ✅ Pedir confirmação do usuário antes de push e deploy
8. ✅ Verificar que os arquivos JSON foram atualizados corretamente

**NUNCA:**
- ❌ Fazer deploy sem bump de versão
- ❌ Usar descrições genéricas ("update", "changes", "fix")
- ❌ Pular etapas do workflow
- ❌ Fazer deploy sem confirmação do usuário

---

**Arquivos relacionados:**
- `scripts/bump-version.ps1` (script de versionamento)
- `scripts/create-deploy-history-table.sql` (criação de tabela Supabase)
- `public/version.json` (versão atual)
- `version-history.json` (histórico completo)
- `src/components/admin/DeploymentHistory.tsx` (componente React)
- `src/views/admin/AdminChangelog.tsx` (página de changelog)

---

**Sistema implementado em:** 2026-03-03  
**Primeira versão rastreada:** v1.0.0

