// =====================================================
// SharkPay Checkout - Hook do Agente LLM
// Permite usar o agente de integrações nos componentes
// =====================================================

import { useState, useCallback } from "react";
import {
    diagnosticarIntegracoes,
    pedirCorrecaoErro,
    perguntarAoAgente,
} from "@/lib/agente-integracoes";
import { verificarLLMDisponivel, limparCacheLLM } from "@/lib/llm";

interface AgenteState {
    carregando: boolean;
    disponivel: boolean | null;
    erro: string | null;
    ultimaResposta: string | null;
    diagnosticos: any[] | null;
}

export function useAgenteLLM() {
    const [state, setState] = useState<AgenteState>({
        carregando: false,
        disponivel: null,
        erro: null,
        ultimaResposta: null,
        diagnosticos: null,
    });

    const verificarDisponibilidade = useCallback(async () => {
        setState((prev) => ({ ...prev, carregando: true, erro: null }));
        try {
            const disponivel = await verificarLLMDisponivel();
            setState((prev) => ({
                ...prev,
                carregando: false,
                disponivel,
            }));
            return disponivel;
        } catch (e) {
            setState((prev) => ({
                ...prev,
                carregando: false,
                disponivel: false,
                erro: "Não foi possível verificar o agente LLM",
            }));
            return false;
        }
    }, []);

    const executarDiagnostico = useCallback(async () => {
        setState((prev) => ({ ...prev, carregando: true, erro: null }));
        try {
            const resultados = await diagnosticarIntegracoes();
            setState((prev) => ({
                ...prev,
                carregando: false,
                diagnosticos: resultados,
            }));
            return resultados;
        } catch (e: any) {
            setState((prev) => ({
                ...prev,
                carregando: false,
                erro: e.message || "Erro ao executar diagnóstico",
            }));
            return null;
        }
    }, []);

    const corrigirErro = useCallback(
        async (erro: string, contexto?: string) => {
            setState((prev) => ({ ...prev, carregando: true, erro: null }));
            try {
                const resposta = await pedirCorrecaoErro(erro, contexto);
                setState((prev) => ({
                    ...prev,
                    carregando: false,
                    ultimaResposta: resposta,
                }));
                return resposta;
            } catch (e: any) {
                setState((prev) => ({
                    ...prev,
                    carregando: false,
                    erro: e.message || "Erro ao consultar agente",
                }));
                return null;
            }
        },
        []
    );

    const perguntar = useCallback(async (pergunta: string) => {
        setState((prev) => ({ ...prev, carregando: true, erro: null }));
        try {
            const resposta = await perguntarAoAgente(pergunta);
            setState((prev) => ({
                ...prev,
                carregando: false,
                ultimaResposta: resposta,
            }));
            return resposta;
        } catch (e: any) {
            setState((prev) => ({
                ...prev,
                carregando: false,
                erro: e.message || "Erro ao consultar agente",
            }));
            return null;
        }
    }, []);

    const limparCache = useCallback(() => {
        limparCacheLLM();
    }, []);

    return {
        ...state,
        verificarDisponibilidade,
        executarDiagnostico,
        corrigirErro,
        perguntar,
        limparCache,
    };
}
