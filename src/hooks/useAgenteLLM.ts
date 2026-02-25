// =====================================================
// SharkPay Checkout - Hook do Agente LLM Completo
// Cobre TODAS as integrações do projeto
// =====================================================

import { useState, useCallback } from "react";
import {
    diagnosticarIntegracoes,
    pedirCorrecaoErro,
    perguntarAoAgente,
    resolverProblemaIntegracao,
    gerarRelatorioSaude,
    type IntegracaoStatus,
} from "@/lib/agente-integracoes";
import { verificarLLMDisponivel, limparCacheLLM } from "@/lib/llm";

interface AgenteState {
    carregando: boolean;
    disponivel: boolean | null;
    erro: string | null;
    ultimaResposta: string | null;
    diagnosticos: IntegracaoStatus[] | null;
    relatorio: string | null;
}

export function useAgenteLLM() {
    const [state, setState] = useState<AgenteState>({
        carregando: false,
        disponivel: null,
        erro: null,
        ultimaResposta: null,
        diagnosticos: null,
        relatorio: null,
    });

    const verificarDisponibilidade = useCallback(async () => {
        setState((prev) => ({ ...prev, carregando: true, erro: null }));
        try {
            const disponivel = await verificarLLMDisponivel();
            setState((prev) => ({ ...prev, carregando: false, disponivel }));
            return disponivel;
        } catch {
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
            setState((prev) => ({ ...prev, carregando: false, diagnosticos: resultados }));
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

    const resolverIntegracao = useCallback(
        async (integracao: string, problema: string, contexto?: string) => {
            setState((prev) => ({ ...prev, carregando: true, erro: null }));
            try {
                const resposta = await resolverProblemaIntegracao(integracao, problema, contexto);
                setState((prev) => ({ ...prev, carregando: false, ultimaResposta: resposta }));
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

    const corrigirErro = useCallback(
        async (erro: string, contexto?: string) => {
            setState((prev) => ({ ...prev, carregando: true, erro: null }));
            try {
                const resposta = await pedirCorrecaoErro(erro, contexto);
                setState((prev) => ({ ...prev, carregando: false, ultimaResposta: resposta }));
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
            setState((prev) => ({ ...prev, carregando: false, ultimaResposta: resposta }));
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

    const gerarRelatorio = useCallback(async () => {
        setState((prev) => ({ ...prev, carregando: true, erro: null }));
        try {
            const relatorio = await gerarRelatorioSaude();
            setState((prev) => ({ ...prev, carregando: false, relatorio }));
            return relatorio;
        } catch (e: any) {
            setState((prev) => ({
                ...prev,
                carregando: false,
                erro: e.message || "Erro ao gerar relatório",
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
        resolverIntegracao,
        corrigirErro,
        perguntar,
        gerarRelatorio,
        limparCache,
    };
}
