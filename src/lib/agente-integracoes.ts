// =====================================================
// SharkPay Checkout - Agente de Integrações
// Usa LLMs gratuitos para diagnosticar e sugerir
// correções nas integrações do projeto
// =====================================================

import { chamarLLMComMensagens } from "@/lib/llm";
import { integrationService, type IntegrationSettings } from "@/lib/integrations";

interface DiagnosticoResultado {
    status: "ok" | "warning" | "error";
    mensagem: string;
    sugestoes: string[];
}

interface IntegracaoStatus {
    nome: string;
    tipo: string;
    ativo: boolean;
    diagnostico?: DiagnosticoResultado;
}

const SYSTEM_PROMPT = `Você é o agente de integrações do SharkPay Checkout. 
Sua função é analisar configurações e logs de integrações e retornar diagnósticos objetivos.

O projeto usa: React + Vite + TypeScript + Tailwind + Supabase + Stripe + PushinPay + N8N.

Regras:
- Responda SEMPRE em JSON válido
- Seja conciso e objetivo
- Foque em soluções práticas
- Nunca exponha chaves de API nas respostas
- Se uma integração parece correta, diga "ok"
- Se encontrar problemas, liste as sugestões de correção`;

/**
 * Diagnostica o status de todas as integrações
 */
export async function diagnosticarIntegracoes(): Promise<IntegracaoStatus[]> {
    const resultados: IntegracaoStatus[] = [];

    // Verificar integrações de pagamento
    try {
        const pagamentos = await integrationService.getSettings("payment");
        for (const p of pagamentos) {
            resultados.push({
                nome: p.name,
                tipo: "payment",
                ativo: p.enabled,
                diagnostico: await analisarIntegracao(p),
            });
        }
    } catch (e) {
        console.warn("[Agente] Erro ao buscar integrações de pagamento:", e);
    }

    // Verificar integrações de tracking
    try {
        const tracking = await integrationService.getSettings("tracking");
        for (const t of tracking) {
            resultados.push({
                nome: t.name,
                tipo: "tracking",
                ativo: t.enabled,
                diagnostico: await analisarIntegracao(t),
            });
        }
    } catch (e) {
        console.warn("[Agente] Erro ao buscar integrações de tracking:", e);
    }

    // Verificar N8N
    try {
        const n8n = await integrationService.getSettings("n8n");
        for (const n of n8n) {
            resultados.push({
                nome: n.name,
                tipo: "n8n",
                ativo: n.enabled,
                diagnostico: await analisarIntegracao(n),
            });
        }
    } catch (e) {
        console.warn("[Agente] Erro ao buscar integrações de n8n:", e);
    }

    // Verificar variáveis de ambiente essenciais
    const envStatus = verificarVariaveisAmbiente();
    resultados.push(envStatus);

    return resultados;
}

/**
 * Analisa uma integração específica usando o LLM
 */
async function analisarIntegracao(
    integracao: IntegrationSettings
): Promise<DiagnosticoResultado> {
    try {
        // Sanitizar config para não enviar chaves de API ao LLM
        const configSanitizada = { ...integracao.config };
        for (const key of Object.keys(configSanitizada)) {
            if (
                key.toLowerCase().includes("key") ||
                key.toLowerCase().includes("secret") ||
                key.toLowerCase().includes("token")
            ) {
                configSanitizada[key] = configSanitizada[key] ? "[CONFIGURADO]" : "[VAZIO]";
            }
        }

        const prompt = `Analise esta integração e retorne um JSON com: status ("ok", "warning", "error"), mensagem (string curta), sugestoes (array de strings).

Integração: ${integracao.name}
Tipo: ${integracao.type}
Ativa: ${integracao.enabled}
Config: ${JSON.stringify(configSanitizada)}

Retorne APENAS o JSON, sem markdown.`;

        const resposta = await chamarLLMComMensagens([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
        ]);

        // Tentar parsear o JSON da resposta
        const jsonMatch = resposta.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as DiagnosticoResultado;
        }

        return {
            status: "ok",
            mensagem: "Integração analisada sem problemas detectados",
            sugestoes: [],
        };
    } catch (e) {
        // Se o LLM falhar, retorna diagnóstico básico local
        return diagnosticoLocal(integracao);
    }
}

/**
 * Diagnóstico local sem depender do LLM (fallback)
 */
function diagnosticoLocal(integracao: IntegrationSettings): DiagnosticoResultado {
    if (!integracao.enabled) {
        return {
            status: "warning",
            mensagem: `${integracao.name} está desativada`,
            sugestoes: ["Ative a integração no painel admin para começar a usar"],
        };
    }

    const config = integracao.config || {};
    const hasEmptyValues = Object.values(config).some(
        (v) => v === "" || v === null || v === undefined || v === "placeholder"
    );

    if (hasEmptyValues) {
        return {
            status: "error",
            mensagem: `${integracao.name} tem campos de configuração vazios`,
            sugestoes: [
                "Preencha todos os campos obrigatórios na configuração",
                "Verifique se as chaves de API estão corretas",
            ],
        };
    }

    return {
        status: "ok",
        mensagem: `${integracao.name} configurada corretamente`,
        sugestoes: [],
    };
}

/**
 * Verifica variáveis de ambiente essenciais
 */
function verificarVariaveisAmbiente(): IntegracaoStatus {
    const vars = {
        SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
        STRIPE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
        N8N_WEBHOOK: import.meta.env.VITE_N8N_WEBHOOK_URL,
        APP_URL: import.meta.env.VITE_APP_URL,
        OPENROUTER_KEY: import.meta.env.VITE_OPENROUTER_API_KEY,
    };

    const ausentes: string[] = [];
    const placeholders: string[] = [];

    for (const [nome, valor] of Object.entries(vars)) {
        if (!valor) {
            ausentes.push(nome);
        } else if (
            valor.includes("placeholder") ||
            valor.includes("SUA_CHAVE") ||
            valor === "undefined"
        ) {
            placeholders.push(nome);
        }
    }

    let status: "ok" | "warning" | "error" = "ok";
    let mensagem = "Todas as variáveis de ambiente estão configuradas";
    const sugestoes: string[] = [];

    if (ausentes.length > 0) {
        status = "error";
        mensagem = `${ausentes.length} variável(is) de ambiente ausente(s)`;
        sugestoes.push(`Configure: ${ausentes.join(", ")}`);
    }

    if (placeholders.length > 0) {
        status = status === "error" ? "error" : "warning";
        mensagem += placeholders.length > 0
            ? ` | ${placeholders.length} com placeholder`
            : "";
        sugestoes.push(`Substitua os placeholders: ${placeholders.join(", ")}`);
    }

    return {
        nome: "Variáveis de Ambiente",
        tipo: "config",
        ativo: ausentes.length === 0,
        diagnostico: { status, mensagem, sugestoes },
    };
}

/**
 * Pede ao agente para sugerir correção de um erro específico
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
                content: `Erro encontrado no projeto SharkPay Checkout:

Erro: ${erro}
${contexto ? `Contexto: ${contexto}` : ""}

Me dê uma solução prática e direta para corrigir esse erro. Responda em português.`,
            },
        ]);
        return resposta;
    } catch {
        return `Não foi possível consultar o agente LLM. Verifique se a chave do OpenRouter está configurada corretamente no .env (VITE_OPENROUTER_API_KEY).`;
    }
}

/**
 * Perguntar ao agente algo genérico sobre o projeto
 */
export async function perguntarAoAgente(pergunta: string): Promise<string> {
    try {
        const resposta = await chamarLLMComMensagens([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: pergunta },
        ]);
        return resposta;
    } catch {
        return "Agente indisponível no momento. Verifique a configuração do OpenRouter.";
    }
}
