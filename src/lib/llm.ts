// =====================================================
// SharkPay Checkout - Agente LLM OpenRouter
// Motor de integração com modelos gratuitos
// =====================================================

interface LLMConfig {
    primary: string;
    fallback: string;
    url: string;
}

interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface LLMResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

const config: LLMConfig = {
    primary: "arcee-ai/trinity-large-preview:free",
    fallback: "stepfun/step-3-5-flash:free",
    url: "https://openrouter.ai/api/v1/chat/completions",
};

// Cache simples para evitar chamadas repetidas
const responseCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCacheKey(prompt: string, model: string): string {
    return `${model}::${prompt.slice(0, 200)}`;
}

function getFromCache(key: string): string | null {
    const cached = responseCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        responseCache.delete(key);
        return null;
    }
    return cached.data;
}

/**
 * Chama um modelo específico no OpenRouter
 */
async function chamarModelo(
    messages: LLMMessage[],
    model: string
): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey || apiKey === "SUA_CHAVE_AQUI") {
        console.warn("[LLM] Chave do OpenRouter não configurada");
        throw new Error("OPENROUTER_KEY_NOT_SET");
    }

    const response = await fetch(config.url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": import.meta.env.VITE_APP_URL || "https://sharkpaycheckout.vercel.app",
            "X-Title": "SharkPay Checkout",
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: 2048,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`[LLM] Erro ${response.status} do modelo ${model}:`, errorText);
        throw new Error(`LLM_ERROR_${response.status}`);
    }

    const data: LLMResponse = await response.json();
    return data.choices[0]?.message?.content || "";
}

/**
 * Chama o LLM gratuito com fallback automático
 * Usa cache para evitar chamadas repetidas
 */
export async function chamarLLMGratuito(prompt: string): Promise<string> {
    const messages: LLMMessage[] = [{ role: "user", content: prompt }];
    return chamarLLMComMensagens(messages);
}

/**
 * Chama o LLM com mensagens estruturadas (system + user)
 */
export async function chamarLLMComMensagens(
    messages: LLMMessage[]
): Promise<string> {
    const cacheKey = getCacheKey(
        messages.map((m) => m.content).join("|"),
        config.primary
    );
    const cached = getFromCache(cacheKey);
    if (cached) {
        console.log("[LLM] Usando resposta em cache");
        return cached;
    }

    try {
        const result = await chamarModelo(messages, config.primary);
        responseCache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`[LLM] ✅ Resposta do modelo primário (${config.primary})`);
        return result;
    } catch (erro) {
        console.warn(
            `[LLM] ⚠️ Modelo primário falhou, tentando fallback...`,
            erro
        );
        try {
            const result = await chamarModelo(messages, config.fallback);
            responseCache.set(cacheKey, { data: result, timestamp: Date.now() });
            console.log(`[LLM] ✅ Resposta do modelo fallback (${config.fallback})`);
            return result;
        } catch (erroFallback) {
            console.error("[LLM] ❌ Ambos os modelos falharam:", erroFallback);
            throw new Error("LLM_ALL_MODELS_FAILED");
        }
    }
}

/**
 * Verifica se o serviço LLM está disponível
 */
export async function verificarLLMDisponivel(): Promise<boolean> {
    try {
        const resposta = await chamarLLMGratuito("Diga apenas 'ok'.");
        return resposta.toLowerCase().includes("ok");
    } catch {
        return false;
    }
}

/**
 * Limpa o cache de respostas
 */
export function limparCacheLLM(): void {
    responseCache.clear();
    console.log("[LLM] Cache limpo");
}
