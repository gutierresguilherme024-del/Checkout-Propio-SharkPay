import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgenteLLM } from "@/hooks/useAgenteLLM";

type StatusIcon = "✅" | "⚠️" | "❌" | "🔄";

function getStatusIcon(status: string): StatusIcon {
    switch (status) {
        case "ok": return "✅";
        case "warning": return "⚠️";
        case "error": return "❌";
        default: return "🔄";
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case "ok":
            return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Funcionando</Badge>;
        case "warning":
            return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Atenção</Badge>;
        case "error":
            return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Erro</Badge>;
        default:
            return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Verificando...</Badge>;
    }
}

export default function AgenteIA() {
    const {
        carregando,
        disponivel,
        diagnosticos,
        ultimaResposta,
        erro,
        verificarDisponibilidade,
        executarDiagnostico,
        perguntar,
    } = useAgenteLLM();

    const [perguntaTexto, setPerguntaTexto] = useState("");
    const [historicoRespostas, setHistoricoRespostas] = useState<
        Array<{ pergunta: string; resposta: string; timestamp: string }>
    >([]);

    useEffect(() => {
        verificarDisponibilidade();
    }, []);

    const handleDiagnostico = async () => {
        await executarDiagnostico();
    };

    const handlePerguntar = async () => {
        if (!perguntaTexto.trim()) return;
        const resposta = await perguntar(perguntaTexto);
        if (resposta) {
            setHistoricoRespostas((prev) => [
                {
                    pergunta: perguntaTexto,
                    resposta,
                    timestamp: new Date().toLocaleTimeString("pt-BR"),
                },
                ...prev,
            ]);
            setPerguntaTexto("");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl flex items-center gap-2">
                        <span className="text-3xl">🤖</span> Agente IA
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Agente inteligente para diagnóstico e integração do projeto
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {disponivel === true && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
                            ● Online
                        </Badge>
                    )}
                    {disponivel === false && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            ● Offline
                        </Badge>
                    )}
                    {disponivel === null && (
                        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                            Verificando...
                        </Badge>
                    )}
                </div>
            </header>

            {/* Status e Diagnóstico */}
            <section className="grid gap-4 md:grid-cols-2">
                {/* Card de Status */}
                <Card className="relative overflow-hidden p-6 border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
                    <div className="absolute -right-10 -top-10 size-28 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 opacity-15 blur-2xl" />
                    <div className="relative">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <span className="text-lg">📡</span> Status do Agente
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                <span className="text-sm text-slate-300">Provider</span>
                                <span className="text-sm font-mono text-cyan-400">OpenRouter</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                <span className="text-sm text-slate-300">Modelo Primário</span>
                                <span className="text-xs font-mono text-emerald-400">arcee-ai/trinity-large</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                <span className="text-sm text-slate-300">Fallback</span>
                                <span className="text-xs font-mono text-amber-400">stepfun/step-3-5-flash</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                <span className="text-sm text-slate-300">Custo</span>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                    100% Gratuito
                                </Badge>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Card de Diagnóstico */}
                <Card className="relative overflow-hidden p-6 border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
                    <div className="absolute -left-10 -bottom-10 size-28 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 opacity-15 blur-2xl" />
                    <div className="relative">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <span className="text-lg">🔍</span> Diagnóstico de Integrações
                        </h2>
                        <Button
                            onClick={handleDiagnostico}
                            disabled={carregando}
                            className="w-full mb-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-all duration-300"
                        >
                            {carregando ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin">🔄</span> Analisando...
                                </span>
                            ) : (
                                "Executar Diagnóstico Completo"
                            )}
                        </Button>

                        {diagnosticos && diagnosticos.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {diagnosticos.map((d: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 transition-all hover:bg-slate-800/70"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{getStatusIcon(d.diagnostico?.status)}</span>
                                            <div>
                                                <span className="text-sm font-medium">{d.nome}</span>
                                                <p className="text-xs text-muted-foreground">
                                                    {d.diagnostico?.mensagem}
                                                </p>
                                            </div>
                                        </div>
                                        {d.diagnostico && getStatusBadge(d.diagnostico.status)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </section>

            {/* Chat com o Agente */}
            <Card className="relative overflow-hidden p-6 border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />
                <div className="relative">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <span className="text-lg">💬</span> Conversar com o Agente
                    </h2>
                    <p className="text-xs text-muted-foreground mb-4">
                        Pergunte sobre integrações, peça para diagnosticar erros ou sugira melhorias
                    </p>

                    <div className="flex gap-3">
                        <Textarea
                            value={perguntaTexto}
                            onChange={(e) => setPerguntaTexto(e.target.value)}
                            placeholder="Ex: Verifique se a integração com Stripe está funcionando corretamente..."
                            className="min-h-[80px] bg-slate-800/50 border-slate-700/50 resize-none"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handlePerguntar();
                                }
                            }}
                        />
                    </div>
                    <Button
                        onClick={handlePerguntar}
                        disabled={carregando || !perguntaTexto.trim()}
                        className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                    >
                        {carregando ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin">🔄</span> Pensando...
                            </span>
                        ) : (
                            "Enviar para o Agente"
                        )}
                    </Button>

                    {erro && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            ❌ {erro}
                        </div>
                    )}
                </div>
            </Card>

            {/* Histórico de Respostas */}
            {historicoRespostas.length > 0 && (
                <Card className="relative overflow-hidden p-6 border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <span className="text-lg">📋</span> Histórico
                    </h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {historicoRespostas.map((item, i) => (
                            <div key={i} className="space-y-2">
                                {/* Pergunta */}
                                <div className="flex justify-end">
                                    <div className="max-w-[80%] p-3 rounded-lg bg-cyan-600/20 border border-cyan-500/20">
                                        <p className="text-sm text-cyan-300">{item.pergunta}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {item.timestamp}
                                        </p>
                                    </div>
                                </div>
                                {/* Resposta */}
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="text-xs">🤖</span>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                Agente SharkPay
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                            {item.resposta}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
