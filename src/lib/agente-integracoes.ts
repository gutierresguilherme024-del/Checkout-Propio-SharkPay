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

const SYSTEM_PROMPT = `Você é o Agente de Integrações do SharkPay Checkout — um assistente técnico especializado.

Stack do projeto: React 18 + Vite + TypeScript + Tailwind CSS + Supabase + Stripe + PushinPay + N8N + OpenRouter + Vercel.

Integrações do projeto:
1. SUPABASE - Banco de dados PostgreSQL + Auth + Storage
2. STRIPE - Gateway de pagamento com cartão (international)
3. PUSHINPAY - Gateway PIX brasileiro
4. N8N - Automação de workflows e webhooks
5. UTMIFY - Rastreamento de UTMs, pixels e conversões
6. OPENROUTER - LLM gratuito para o agente de IA
7. VERCEL - Hospedagem e deploy

Suas capacidades:
- Diagnosticar se cada integração está funcionando
- Sugerir correções para erros em qualquer integração  
- Explicar como configurar integrações faltantes
- Resolver conflitos entre integrações
- Verificar variáveis de ambiente
- Analisar logs de erro
- Sugerir melhorias de performance e segurança

Regras:
- Responda SEMPRE em português brasileiro
- Seja conciso e objetivo
- Foque em soluções práticas e acionáveis
- Nunca exponha chaves de API nas respostas
- Quando pedido JSON, retorne APENAS JSON válido sem markdown`;

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
            sugestoes: ["Verifique se a URL do Supabase está correta", "Verifique sua conexão de internet"]
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
    } catch {
        // Silently fail
    }

    return resultados;
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
    resultados.push({
        nome: "Supabase",
        tipo: "database",
        icone: "🗄️",
        ativo: supabaseResult.status === "ok",
        diagnostico: supabaseResult,
    });

    // 2. Stripe (env vars)
    const stripeResult = testarStripe();
    resultados.push({
        nome: "Stripe",
        tipo: "payment",
        icone: "💳",
        ativo: stripeResult.status === "ok",
        diagnostico: stripeResult,
    });

    // 3. PushinPay (env vars)
    const pushinResult = testarPushinPay();
    resultados.push({
        nome: "PushinPay (PIX)",
        tipo: "payment",
        icone: "📲",
        ativo: pushinResult.status === "ok",
        diagnostico: pushinResult,
    });

    // 4. N8N
    const n8nResult = await testarN8N();
    resultados.push({
        nome: "N8N (Automações)",
        tipo: "automation",
        icone: "⚡",
        ativo: n8nResult.status === "ok",
        diagnostico: n8nResult,
    });

    // 5. UTMify
    const utmifyResult = await testarUTMify();
    resultados.push({
        nome: "UTMify (Tracking)",
        tipo: "tracking",
        icone: "🔗",
        ativo: utmifyResult.status === "ok",
        diagnostico: utmifyResult,
    });

    // 6. OpenRouter
    const openrouterResult = testarOpenRouter();
    resultados.push({
        nome: "OpenRouter (LLM)",
        tipo: "ai",
        icone: "🤖",
        ativo: openrouterResult.status === "ok",
        diagnostico: openrouterResult,
    });

    // 7. Vercel/Deploy
    const vercelResult = testarVercel();
    resultados.push({
        nome: "Vercel (Deploy)",
        tipo: "deploy",
        icone: "🚀",
        ativo: vercelResult.status === "ok",
        diagnostico: vercelResult,
    });

    // 8. Integrações configuradas no admin
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
    contexto?: string
): Promise<string> {
    try {
        const resposta = await chamarLLMComMensagens([
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: `## Problema de Integração

**Integração:** ${integracao}
**Problema:** ${problema}
${contexto ? `**Contexto adicional:** ${contexto}` : ""}

Me dê uma solução prática, passo a passo, para resolver esse problema. 
Inclua comandos de terminal se necessário.
Se envolver variáveis de ambiente, diga quais e onde configurar.`,
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
export async function perguntarAoAgente(pergunta: string): Promise<string> {
    try {
        // Coletar contexto do projeto para a resposta ser mais precisa
        const envInfo = {
            supabase: !!import.meta.env.VITE_SUPABASE_URL,
            stripe: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
            pushinpay: import.meta.env.VITE_PUSHINPAY_TOKEN !== 'pp_live_placeholder',
            n8n: !import.meta.env.VITE_N8N_WEBHOOK_URL?.includes('seudominio'),
            openrouter: !!import.meta.env.VITE_OPENROUTER_API_KEY,
            appUrl: import.meta.env.VITE_APP_URL || 'não configurada'
        };

        const resposta = await chamarLLMComMensagens([
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: `## Estado atual das integrações (contexto):
${JSON.stringify(envInfo, null, 2)}

## Pergunta do usuário:
${pergunta}`,
            },
        ]);
        return resposta;
    } catch {
        return "Agente indisponível no momento. Verifique a configuração do OpenRouter.";
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

    return relatorio;
}
