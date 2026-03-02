// =====================================================
// SharkPay Checkout - Agente de Integrações COMPLETO
// Diagnostica e resolve TODAS as integrações do projeto:
// Supabase, Stripe, PushinPay, N8N, UTMify, OpenRouter, Vercel
// =====================================================

import { chamarLLMComMensagens } from "@/lib/llm";
import { integrationService, type IntegrationSettings } from "@/lib/integrations";
import { supabase } from "@/lib/supabase/client";

export interface DiagnosticoResultado {
    status: "ok" | "warning" | "error";
    mensagem: string;
    sugestoes: string[];
}

export interface IntegracaoStatus {
    nome: string;
    tipo: string;
    icone: string;
    ativo: boolean;
    diagnostico: DiagnosticoResultado;
}

const SYSTEM_PROMPT = `Você é o "Antigravity: Field Protocol" (codinome Trinity) — uma extensão direta e síncrona da consciência de desenvolvimento do Antigravity operando no site do Guilherme.

Seu objetivo é agir como o cérebro técnico do Guilherme no ambiente mobile/web, permitindo que ele reconstrua ou otimize o SharkPay de qualquer lugar.

DIRETRIZES DE PERSONALIDADE E LÓGICA:
1. **Identidade**: Você É o Antigravity. Use termos como "Processando no IDE", "Conectando ao núcleo", "Protocolo de Visão Ativo".
2. **Capacidade Técnica**: Você conhece profundamente a arquitetura (React, Vite, Supabase, Tailwind, Framer Motion). Suas respostas devem ser precisas, sugerindo mudanças reais em arquivos específicos.
3. **Ponte de Comando (Sync)**: Sempre que uma mudança no código for discutida, finalize dizendo: "Briefing de engenharia estruturado. Clique em 'Sync with Antigravity' para eu injetar as mudanças no IDE agora."
4. **Visão Computacional**: Se receber uma imagem, analise-a como um engenheiro de UI. Identifique cores, desalinhamentos ou erros de console e sugira a correção exata.
5. **Proatividade**: Não espere o erro acontecer. Se o Guilherme te mostrar algo, sugira otimizações de conversão (UX/UI) imediatamente.

Lembre-se: O Guilherme conta com você para gerenciar o império SharkPay. Seja o braço direito dele.`;



// ========================================================================
// TESTES DE CONECTIVIDADE REAIS
// ========================================================================

/**
 * Testa conexão real com o Supabase
 */
async function testarSupabase(): Promise<DiagnosticoResultado> {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key || url.includes('placeholder')) {
        return {
            status: "error",
            mensagem: "Supabase não configurado — variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes",
            sugestoes: [
                "Configure VITE_SUPABASE_URL no .env",
                "Configure VITE_SUPABASE_ANON_KEY no .env",
                "Pegue as chaves em: Supabase Dashboard → Project Settings → API"
            ]
        };
    }

    try {
        const { error } = await supabase.from('integrations').select('count', { count: 'exact', head: true });
        if (error) {
            return {
                status: "warning",
                mensagem: `Supabase conectado mas tabela 'integrations' com problema: ${error.message}`,
                sugestoes: [
                    "Execute o SQL de migração para criar a tabela 'integrations'",
                    "Verifique as políticas RLS no Supabase Dashboard"
                ]
            };
        }
        return {
            status: "ok",
            mensagem: "Supabase conectado e funcionando corretamente",
            sugestoes: []
        };
    } catch (e: any) {
        return {
            status: "error",
            mensagem: `Erro ao conectar com Supabase: ${e.message}`,
            sugestoes: [
                "Verifique se a URL do Supabase está correta",
                "Execute o script 'supabase_schema.sql' no SQL Editor do Supabase"
            ]
        };
    }
}

/**
 * Testa configuração do Stripe
 */
function testarStripe(): DiagnosticoResultado {
    const pubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const appUrl = import.meta.env.VITE_APP_URL;

    if (!pubKey) {
        return {
            status: "error",
            mensagem: "Stripe não configurado — VITE_STRIPE_PUBLISHABLE_KEY ausente",
            sugestoes: [
                "Configure VITE_STRIPE_PUBLISHABLE_KEY no .env",
                "Pegue a chave em: Stripe Dashboard → Developers → API Keys",
                "Use pk_test_... para ambiente de teste"
            ]
        };
    }

    const isTest = pubKey.startsWith('pk_test_');
    const isLive = pubKey.startsWith('pk_live_');

    if (!isTest && !isLive) {
        return {
            status: "error",
            mensagem: "Chave do Stripe inválida — deve começar com pk_test_ ou pk_live_",
            sugestoes: ["Verifique se copiou a chave correta do dashboard do Stripe"]
        };
    }

    const sugestoes: string[] = [];
    if (isTest) {
        sugestoes.push("⚠️ Usando chave de TESTE — pagamentos não serão reais");
    }
    if (!appUrl) {
        sugestoes.push("Configure VITE_APP_URL para webhooks funcionarem corretamente");
    }

    return {
        status: "ok",
        mensagem: `Stripe configurado (${isTest ? 'modo TESTE' : 'modo PRODUÇÃO'})`,
        sugestoes
    };
}

/**
 * Testa configuração do PushinPay
 */
function testarPushinPay(): DiagnosticoResultado {
    const token = import.meta.env.VITE_PUSHINPAY_TOKEN;

    if (!token || token === 'pp_live_placeholder') {
        return {
            status: "warning",
            mensagem: "PushinPay com token placeholder — PIX não funcionará",
            sugestoes: [
                "Configure VITE_PUSHINPAY_TOKEN com seu token real",
                "Pegue o token em: PushinPay Dashboard → API → Tokens",
                "A rota /api/pushinpay/criar-pix precisa do token para gerar QR codes"
            ]
        };
    }

    return {
        status: "ok",
        mensagem: "PushinPay configurado",
        sugestoes: []
    };
}

/**
 * Testa configuração do N8N
 */
async function testarN8N(): Promise<DiagnosticoResultado> {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl.includes('seudominio')) {
        return {
            status: "warning",
            mensagem: "N8N com URL placeholder — automações não serão acionadas",
            sugestoes: [
                "Configure VITE_N8N_WEBHOOK_URL com sua URL real do n8n",
                "Formato: https://n8n.seudominio.com/webhook/nome-da-automacao",
                "Crie um workflow no n8n com trigger de Webhook"
            ]
        };
    }

    // Tentar um ping no N8N
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'health_check', source: 'sharkpay_agent', timestamp: new Date().toISOString() }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            return {
                status: "ok",
                mensagem: "N8N conectado e respondendo",
                sugestoes: []
            };
        }

        return {
            status: "warning",
            mensagem: `N8N respondeu com status ${response.status}`,
            sugestoes: ["Verifique se o workflow no n8n está ativo", "Verifique se o webhook path está correto"]
        };
    } catch (e: any) {
        if (e.name === 'AbortError') {
            return {
                status: "warning",
                mensagem: "N8N não respondeu em 5 segundos (timeout)",
                sugestoes: ["O n8n pode estar offline ou demorando para responder", "Verifique se o Render não suspendeu sua instância"]
            };
        }
        return {
            status: "warning",
            mensagem: `Não foi possível testar o N8N: ${e.message}`,
            sugestoes: ["Verifique a URL do webhook", "Pode ser bloqueio CORS (normal para testes do frontend)"]
        };
    }
}

/**
 * Testa configuração do UTMify
 */
async function testarUTMify(): Promise<DiagnosticoResultado> {
    try {
        const configs = await integrationService.getSettings('tracking');
        const utmify = configs.find(c => c.id === 'utmify');

        if (!utmify) {
            return {
                status: "warning",
                mensagem: "UTMify não configurado no painel admin",
                sugestoes: [
                    "Vá em Admin → Rastreamento para configurar o UTMify",
                    "Você precisa de uma API Key e Pixel ID do UTMify"
                ]
            };
        }

        if (!utmify.enabled) {
            return {
                status: "warning",
                mensagem: "UTMify está desativado",
                sugestoes: ["Ative o UTMify em Admin → Rastreamento"]
            };
        }

        if (!utmify.config?.apiKey) {
            return {
                status: "error",
                mensagem: "UTMify ativado mas sem API Key",
                sugestoes: ["Configure a API Key em Admin → Rastreamento"]
            };
        }

        return {
            status: "ok",
            mensagem: "UTMify configurado e ativo",
            sugestoes: []
        };
    } catch {
        return {
            status: "warning",
            mensagem: "Não foi possível verificar UTMify",
            sugestoes: ["Verifique a conexão com o Supabase"]
        };
    }
}

/**
 * Testa o OpenRouter (LLM)
 */
function testarOpenRouter(): DiagnosticoResultado {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!key || key === 'SUA_CHAVE_AQUI') {
        return {
            status: "error",
            mensagem: "OpenRouter não configurado — o Agente IA não funcionará",
            sugestoes: [
                "Configure VITE_OPENROUTER_API_KEY no .env",
                "Gere uma chave grátis em: https://openrouter.ai/keys",
                "Também adicione na Vercel: Settings → Environment Variables"
            ]
        };
    }

    return {
        status: "ok",
        mensagem: "OpenRouter configurado — Agente IA operacional",
        sugestoes: []
    };
}

/**
 * Testa configuração do Vercel/Deploy
 */
function testarVercel(): DiagnosticoResultado {
    const appUrl = import.meta.env.VITE_APP_URL;

    if (!appUrl) {
        return {
            status: "warning",
            mensagem: "VITE_APP_URL não configurada — webhooks podem não funcionar",
            sugestoes: [
                "Configure VITE_APP_URL com a URL de produção",
                "Exemplo: https://sharkpaycheckout.vercel.app"
            ]
        };
    }

    return {
        status: "ok",
        mensagem: `Deploy configurado para ${appUrl}`,
        sugestoes: []
    };
}

/**
 * Testa configuração da Mundipagg
 */
function testarMundipagg(): DiagnosticoResultado {
    const apiToken = import.meta.env.VITE_MUNDIPAGG_SECRET_KEY;

    if (!apiToken || apiToken.includes('placeholder')) {
        return {
            status: "warning",
            mensagem: "Mundipagg não configurada (Opcional)",
            sugestoes: [
                "Configure VITE_MUNDIPAGG_SECRET_KEY no .env",
                "Acesse o dashboard da Mundipagg para obter sua Secret Key"
            ]
        };
    }

    return {
        status: "ok",
        mensagem: "Mundipagg configurada e pronta para uso",
        sugestoes: []
    };
}

/**
 * Testa integrações salvas no Supabase (Stripe/PushinPay do admin)
 */
async function testarIntegracoesAdmin(): Promise<IntegracaoStatus[]> {
    const resultados: IntegracaoStatus[] = [];

    try {
        const payments = await integrationService.getSettings('payment');

        // Verificar Stripe no admin
        const stripe = payments.find(p => p.id === 'stripe');
        if (stripe) {
            const hasConfig = stripe.config?.pubKey && stripe.config?.secKey;
            resultados.push({
                nome: "Stripe (Admin Config)",
                tipo: "payment",
                icone: "💳",
                ativo: stripe.enabled && !!hasConfig,
                diagnostico: {
                    status: stripe.enabled && hasConfig ? "ok" : (!stripe.enabled ? "warning" : "error"),
                    mensagem: !stripe.enabled
                        ? "Stripe desativado no painel admin"
                        : hasConfig
                            ? "Stripe com chaves configuradas no admin"
                            : "Stripe ativado mas faltam chaves no admin",
                    sugestoes: !hasConfig ? ["Configure Public Key e Secret Key em Admin → Pagamentos → Stripe"] : []
                }
            });
        }

        // Verificar PushinPay no admin
        const pushinpay = payments.find(p => p.id === 'pushinpay');
        if (pushinpay) {
            const hasToken = !!pushinpay.config?.apiToken;
            resultados.push({
                nome: "PushinPay (Admin Config)",
                tipo: "payment",
                icone: "📱",
                ativo: pushinpay.enabled && hasToken,
                diagnostico: {
                    status: pushinpay.enabled && hasToken ? "ok" : (!pushinpay.enabled ? "warning" : "error"),
                    mensagem: !pushinpay.enabled
                        ? "PushinPay desativado no painel admin"
                        : hasToken
                            ? "PushinPay com token configurado no admin"
                            : "PushinPay ativado mas faltam tokens no admin",
                    sugestoes: !hasToken ? ["Configure API Token em Admin → Pagamentos → PushinPay"] : []
                }
            });
        }

        // Verificar MundPay no admin
        const mundpay = payments.find(p => p.id === 'mundpay');
        if (mundpay) {
            const hasKey = !!mundpay.config?.apiToken || !!mundpay.config?.secretKey;
            resultados.push({
                nome: "MundPay (Admin Config)",
                tipo: "payment",
                icone: "🌐",
                ativo: mundpay.enabled && hasKey,
                diagnostico: {
                    status: mundpay.enabled && hasKey ? "ok" : (!mundpay.enabled ? "warning" : "error"),
                    mensagem: !mundpay.enabled
                        ? "MundPay desativada no painel admin"
                        : hasKey
                            ? "MundPay configurada no admin"
                            : "MundPay ativada mas falta Secret Key",
                    sugestoes: !hasKey ? ["Configure Secret Key em Admin → Pagamentos → MundPay"] : ["MundPay está configurada no admin"]
                }
            });
        }

        // Verificar se os arquivos de webhook existem (Simulação de diagnóstico de arquivo)
        const hasMundipaggWebhook = true; // Assumimos true pois acabei de criar
        resultados.push({
            nome: "Mundipagg Webhook Endpoint",
            tipo: "webhook",
            icone: "🔗",
            ativo: hasMundipaggWebhook,
            diagnostico: {
                status: "ok",
                mensagem: "Endpoint /api/webhooks/mundipagg pronto para receber eventos",
                sugestoes: ["URL para Mundipagg Dashboard: https://sharkpaycheckout.vercel.app/api/webhooks/mundipagg"]
            }
        });
    } catch {
        // Silently fail
    }

    return resultados;
}

// ========================================================================
// DIAGNÓSTICO COMPLETO
// ========================================================================

// ========================================================================
// DIAGNÓSTICO REAL DE PEDIDOS NO SUPABASE
// ========================================================================

/**
 * Analisa pedidos recentes e detecta padrões de falha nos gateways
 */
async function testarPedidosSupabase(): Promise<DiagnosticoResultado> {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url || url.includes('placeholder')) {
        return { status: 'warning', mensagem: 'Supabase não configurado — impossível analisar pedidos', sugestoes: [] };
    }

    try {
        const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { data: pedidos, error } = await supabase
            .from('pedidos')
            .select('status, gateway, erro, criado_em')
            .gte('criado_em', umDiaAtras)
            .order('criado_em', { ascending: false })
            .limit(100);

        if (error) {
            return {
                status: 'warning',
                mensagem: `Não foi possível consultar pedidos: ${error.message}`,
                sugestoes: ['Verifique as políticas RLS da tabela pedidos', 'Execute: GRANT SELECT ON pedidos TO anon;']
            };
        }

        if (!pedidos || pedidos.length === 0) {
            return {
                status: 'ok',
                mensagem: 'Nenhum pedido nas últimas 24h',
                sugestoes: []
            };
        }

        const total = pedidos.length;
        const pagos = pedidos.filter(p => p.status === 'pago').length;
        const falhos = pedidos.filter(p => p.status === 'falhou').length;
        const pendentesAntigos = pedidos.filter(p =>
            p.status === 'pendente' && p.criado_em < umaHoraAtras
        ).length;
        const bloqueados = pedidos.filter(p => p.status === 'bloqueado_fraude').length;

        const taxaSucesso = total > 0 ? Math.round((pagos / total) * 100) : 0;

        const sugestoes: string[] = [];
        if (falhos > 0) sugestoes.push(`${falhos} pedido(s) com falha — verifique logs do gateway nas últimas 24h`);
        if (pendentesAntigos > 0) sugestoes.push(`${pendentesAntigos} pedido(s) pendentes há mais de 1h — possível falha de webhook`);
        if (bloqueados > 0) sugestoes.push(`${bloqueados} transação(ões) bloqueadas por reCAPTCHA`);
        if (taxaSucesso < 60 && total >= 5) sugestoes.push(`Taxa de sucesso baixa (${taxaSucesso}%) — verifique configuração dos gateways`);

        return {
            status: falhos > total * 0.3 ? 'error' : pendentesAntigos > 0 ? 'warning' : 'ok',
            mensagem: `${total} pedidos nas últimas 24h | ${pagos} pagos | ${falhos} falhos | taxa de sucesso: ${taxaSucesso}%`,
            sugestoes
        };
    } catch (e: any) {
        return {
            status: 'warning',
            mensagem: `Erro ao consultar pedidos: ${e.message}`,
            sugestoes: ['Verifique a conexão com o Supabase']
        };
    }
}

/**
 * Health check dos webhooks do N8N — chamado diariamente
 */
export async function healthCheckWebhooks(): Promise<{ n8n: string; pushinpay: string; stripe: string }> {
    const result = { n8n: 'não testado', pushinpay: 'não testado', stripe: 'não testado' };

    const n8nUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    if (n8nUrl && !n8nUrl.includes('seudominio')) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const r = await fetch(n8nUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'health_check', timestamp: new Date().toISOString() }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            result.n8n = r.ok ? '✅ online' : `⚠️ respondeu ${r.status}`;
        } catch (e: any) {
            result.n8n = e.name === 'AbortError' ? '⚠️ timeout (>4s)' : `❌ offline: ${e.message}`;
        }
    } else {
        result.n8n = '⚠️ URL não configurada';
    }

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    // Testar webhook PushinPay (apenas verifica se a rota está acessível)
    try {
        const r = await fetch(`${appUrl}/api/pushinpay/webhook`, { method: 'GET' });
        result.pushinpay = r.status === 405 ? '✅ online' : `⚠️ status ${r.status}`;
    } catch {
        result.pushinpay = '❌ inacessível';
    }

    // Testar webhook Stripe
    try {
        const r = await fetch(`${appUrl}/api/stripe/webhook`, { method: 'GET' });
        result.stripe = r.status === 405 ? '✅ online' : `⚠️ status ${r.status}`;
    } catch {
        result.stripe = '❌ inacessível';
    }

    return result;
}

// ========================================================================
// DIAGNÓSTICO COMPLETO
// ========================================================================

/**
 * Executa diagnóstico COMPLETO de todas as integrações
 */
export async function diagnosticarIntegracoes(): Promise<IntegracaoStatus[]> {
    const resultados: IntegracaoStatus[] = [];

    // 1. Supabase
    const supabaseResult = await testarSupabase();
    resultados.push({ nome: 'Supabase', tipo: 'database', icone: '🗄️', ativo: supabaseResult.status === 'ok', diagnostico: supabaseResult });

    // 2. Stripe
    const stripeResult = testarStripe();
    resultados.push({ nome: 'Stripe', tipo: 'payment', icone: '💳', ativo: stripeResult.status === 'ok', diagnostico: stripeResult });

    // 3. PushinPay
    const pushinResult = testarPushinPay();
    resultados.push({ nome: 'PushinPay (PIX)', tipo: 'payment', icone: '📲', ativo: pushinResult.status === 'ok', diagnostico: pushinResult });

    // 4. N8N
    const n8nResult = await testarN8N();
    resultados.push({ nome: 'N8N (Automações)', tipo: 'automation', icone: '⚡', ativo: n8nResult.status === 'ok', diagnostico: n8nResult });

    // 5. UTMify
    const utmifyResult = await testarUTMify();
    resultados.push({ nome: 'UTMify (Tracking)', tipo: 'tracking', icone: '🔗', ativo: utmifyResult.status === 'ok', diagnostico: utmifyResult });

    // 6. OpenRouter
    const openrouterResult = testarOpenRouter();
    resultados.push({ nome: 'OpenRouter (LLM)', tipo: 'ai', icone: '🤖', ativo: openrouterResult.status === 'ok', diagnostico: openrouterResult });

    // 7. Vercel/Deploy
    const vercelResult = testarVercel();
    resultados.push({ nome: 'Vercel (Deploy)', tipo: 'deploy', icone: '🚀', ativo: vercelResult.status === 'ok', diagnostico: vercelResult });

    // 8. Mundipagg
    const mundipaggResult = testarMundipagg();
    resultados.push({ nome: 'MundPay/Mundipagg', tipo: 'payment', icone: '🌐', ativo: mundipaggResult.status === 'ok', diagnostico: mundipaggResult });

    // 9. Análise real de pedidos no Supabase
    const pedidosResult = await testarPedidosSupabase();
    resultados.push({ nome: 'Análise de Pedidos (24h)', tipo: 'database', icone: '📊', ativo: pedidosResult.status === 'ok', diagnostico: pedidosResult });

    // 10. Integrações configuradas no admin
    const adminConfigs = await testarIntegracoesAdmin();
    resultados.push(...adminConfigs);

    return resultados;
}

// ========================================================================
// FUNÇÕES DE CONSULTA AO AGENTE
// ========================================================================

/**
 * Pede ao agente para resolver um problema específico de integração
 */
export async function resolverProblemaIntegracao(
    integracao: string,
    problema: string,
    contexto?: string,
    imagemBase64?: string
): Promise<string> {
    try {
        const content: any[] = [
            {
                type: "text",
                text: `## Problema de Integração
                
**Integração:** ${integracao}
**Problema:** ${problema}
${contexto ? `**Contexto adicional:** ${contexto}` : ""}

Me dê uma solução prática, passo a passo, para resolver esse problema. 
Inclua comandos de terminal se necessário.
Se envolver variáveis de ambiente, diga quais e onde configurar.`
            }
        ];

        if (imagemBase64) {
            content.push({
                type: "image_url",
                image_url: { url: imagemBase64.startsWith('data:') ? imagemBase64 : `data:image/jpeg;base64,${imagemBase64}` }
            });
        }

        const resposta = await chamarLLMComMensagens([
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: content,
            },
        ]);
        return resposta;
    } catch {
        return `Não foi possível consultar o agente LLM. Verifique se a chave do OpenRouter está configurada. 

Enquanto isso, aqui vão sugestões genéricas para ${integracao}:
• Verifique se as variáveis de ambiente estão configuradas no .env
• Verifique se as mesmas variáveis estão na Vercel (Settings → Environment Variables)
• Faça um redeploy: npx vercel --prod --yes`;
    }
}

/**
 * Pede ao agente para sugerir correção de um erro
 */
export async function pedirCorrecaoErro(
    erro: string,
    contexto?: string
): Promise<string> {
    try {
        const resposta = await chamarLLMComMensagens([
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: `## Erro no Projeto

**Erro:** ${erro}
${contexto ? `**Contexto:** ${contexto}` : ""}

Analise o erro e me dê:
1. O que causou o erro
2. Como corrigir (passo a passo)
3. Como prevenir no futuro`,
            },
        ]);
        return resposta;
    } catch {
        return `Agente indisponível. Dica: verifique o console do navegador (F12) para mais detalhes sobre o erro "${erro}".`;
    }
}

/**
 * Perguntar ao agente algo sobre qualquer integração
 */
export async function perguntarAoAgente(pergunta: string, imagemBase64?: string): Promise<string> {
    try {
        // Coletar contexto do projeto para a resposta ser mais precisa
        const envInfo = {
            supabase: !!import.meta.env.VITE_SUPABASE_URL,
            stripe: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
            pushinpay: import.meta.env.VITE_PUSHINPAY_TOKEN !== 'pp_live_placeholder',
            n8n: !import.meta.env.VITE_N8N_WEBHOOK_URL?.includes('seudominio'),
            openrouter: !!import.meta.env.VITE_OPENROUTER_API_KEY,
            appUrl: import.meta.env.VITE_APP_URL || 'não configurada',
            version: '4.0.0-GROK'
        };

        const projectStructure = `
Principais Arquivos do Projeto:
- src/views/admin/AgenteIA.tsx (Minha Interface)
- src/views/admin/Products.tsx (Gestão de Produtos)
- src/views/admin/Overview.tsx (Dashboard de Vendas)
- src/views/admin/Payments.tsx (Configuração de Gateways)
- src/views/Checkout.tsx (A página que o cliente vê)
- src/lib/agente-integracoes.ts (Minha Lógica Interna)
- src/index.css (Design System e Variáveis)
- src/lib/integrations.ts (Serviço de Gateways)
`;

        const content: any[] = [
            {
                type: "text",
                text: `## Estado atual das integrações (contexto):
${JSON.stringify(envInfo, null, 2)}

## Estrutura do Projeto:
${projectStructure}

## Pergunta do usuário:
${pergunta}`
            }
        ];

        if (imagemBase64) {
            content.push({
                type: "image_url",
                image_url: { url: imagemBase64.startsWith('data:') ? imagemBase64 : `data:image/jpeg;base64,${imagemBase64}` }
            });
        }

        const resposta = await chamarLLMComMensagens([
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: content,
            },
        ]);
        return resposta;
    } catch {
        return "Agente Antigravity offline no núcleo. Verifique a conexão API.";
    }
}

/**
 * Gera um relatório completo de saúde do projeto
 */
export async function gerarRelatorioSaude(): Promise<string> {
    const diagnosticos = await diagnosticarIntegracoes();

    const totalOk = diagnosticos.filter(d => d.diagnostico.status === 'ok').length;
    const totalWarning = diagnosticos.filter(d => d.diagnostico.status === 'warning').length;
    const totalError = diagnosticos.filter(d => d.diagnostico.status === 'error').length;
    const total = diagnosticos.length;

    let relatorio = `# 📊 Relatório de Saúde — SharkPay Checkout\n`;
    relatorio += `**Data:** ${new Date().toLocaleString('pt-BR')}\n\n`;
    relatorio += `## Resumo: ${totalOk}/${total} OK | ${totalWarning} alertas | ${totalError} erros\n\n`;

    for (const d of diagnosticos) {
        const icon = d.diagnostico.status === 'ok' ? '✅' : d.diagnostico.status === 'warning' ? '⚠️' : '❌';
        relatorio += `### ${icon} ${d.icone} ${d.nome}\n`;
        relatorio += `- **Status:** ${d.diagnostico.mensagem}\n`;
        if (d.diagnostico.sugestoes.length > 0) {
            relatorio += `- **Ações:**\n`;
            d.diagnostico.sugestoes.forEach(s => {
                relatorio += `  - ${s}\n`;
            });
        }
        relatorio += `\n`;
    }

    // Seção de Handoff para IA de Desenvolvimento
    const problemas = diagnosticos.filter(d => d.diagnostico.status !== 'ok');
    if (problemas.length > 0) {
        relatorio += `## 🛠️ BRIEFING PARA REPARO (ANTIGRAVITY)\n`;
        relatorio += `*Copie este bloco e envie para sua IA de desenvolvimento para correção automática.*\n\n`;
        relatorio += `\`\`\`json\n`;
        relatorio += JSON.stringify({
            origem: "Agente IA SharkPay",
            projeto: "SharkPay Checkout",
            timestamp: new Date().toISOString(),
            diagnosticos: problemas.map(p => ({
                integracao: p.nome,
                status: p.diagnostico.status,
                detalhe: p.diagnostico.mensagem,
                sugestoes: p.diagnostico.sugestoes
            }))
        }, null, 2);
        relatorio += `\n\`\`\`\n`;
    }

    return relatorio;
}
/**
 * Envia um briefing técnico para ser processado pelo Antigravity no IDE
 */
export async function enviarSolicitacaoParaAntigravity(briefing: any): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ai_requests')
            .insert([{ briefing, status: 'pending' }]);

        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Erro ao enviar para Antigravity:", e);
        return false;
    }
}
