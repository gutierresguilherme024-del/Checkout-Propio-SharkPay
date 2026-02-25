import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgenteLLM } from "@/hooks/useAgenteLLM";
import type { IntegracaoStatus } from "@/lib/agente-integracoes";

function getStatusBadge(status: string) {
    switch (status) {
        case "ok":
            return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">✅ OK</Badge>;
        case "warning":
            return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">⚠️ Atenção</Badge>;
        case "error":
            return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">❌ Erro</Badge>;
        default:
            return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">🔄 ...</Badge>;
    }
}

function getStatusColor(status: string) {
    switch (status) {
        case "ok": return "border-emerald-500/20 bg-emerald-500/5";
        case "warning": return "border-amber-500/20 bg-amber-500/5";
        case "error": return "border-red-500/20 bg-red-500/5";
        default: return "border-slate-500/20 bg-slate-500/5";
    }
}

export default function AgenteIA() {
    const {
        carregando,
        disponivel,
        diagnosticos,
        ultimaResposta,
        relatorio,
        erro,
        verificarDisponibilidade,
        executarDiagnostico,
        resolverIntegracao,
        perguntar,
        gerarRelatorio,
    } = useAgenteLLM();

    const [perguntaTexto, setPerguntaTexto] = useState("");
    const [integracaoSelecionada, setIntegracaoSelecionada] = useState<IntegracaoStatus | null>(null);
    const [modoResolucao, setModoResolucao] = useState(false);
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

    const handleResolverIntegracao = async (integ: IntegracaoStatus) => {
        setIntegracaoSelecionada(integ);
        setModoResolucao(true);
        const resposta = await resolverIntegracao(
            integ.nome,
            integ.diagnostico.mensagem,
            integ.diagnostico.sugestoes.join("; ")
        );
        if (resposta) {
            setHistoricoRespostas((prev) => [
                {
                    pergunta: `🔧 Resolver: ${integ.nome} — ${integ.diagnostico.mensagem}`,
                    resposta,
                    timestamp: new Date().toLocaleTimeString("pt-BR"),
                },
                ...prev,
            ]);
        }
        setModoResolucao(false);
    };

    const handleGerarRelatorio = async () => {
        await gerarRelatorio();
    };

    // Contadores para o resumo
    const totalOk = diagnosticos?.filter(d => d.diagnostico.status === 'ok').length || 0;
    const totalWarning = diagnosticos?.filter(d => d.diagnostico.status === 'warning').length || 0;
    const totalError = diagnosticos?.filter(d => d.diagnostico.status === 'error').length || 0;
    const total = diagnosticos?.length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl flex items-center gap-2">
                        <span className="text-3xl">🤖</span> Agente IA — Central de Integrações
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Diagnostica e resolve <strong>todas</strong> as integrações: Supabase, Stripe, PushinPay, N8N, UTMify, OpenRouter, Vercel
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {disponivel === true && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                            Online
                        </Badge>
                    )}
                    {disponivel === false && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1.5" />
                            Offline
                        </Badge>
                    )}
                    {disponivel === null && (
                        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                            Verificando...
                        </Badge>
                    )}
                </div>
            </header>

            {/* Ações rápidas */}
            <div className="flex flex-wrap gap-3">
                <Button
                    onClick={handleDiagnostico}
                    disabled={carregando}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-cyan-900/20"
                >
                    {carregando && !modoResolucao ? (
                        <span className="flex items-center gap-2"><span className="animate-spin">🔄</span> Analisando...</span>
                    ) : (
                        <span className="flex items-center gap-2">🔍 Diagnosticar Tudo</span>
                    )}
                </Button>
                <Button
                    onClick={handleGerarRelatorio}
                    disabled={carregando}
                    variant="outline"
                    className="border-slate-700 hover:bg-slate-800"
                >
                    📊 Gerar Relatório
                </Button>
                <Button
                    onClick={() => verificarDisponibilidade()}
                    disabled={carregando}
                    variant="outline"
                    className="border-slate-700 hover:bg-slate-800"
                >
                    📡 Testar Conexão LLM
                </Button>
            </div>

            {/* Resumo visual */}
            {diagnosticos && (
                <section className="grid gap-3 sm:grid-cols-4">
                    <Card className="relative overflow-hidden p-4 border-slate-700/50 bg-slate-900/80">
                        <div className="absolute -right-6 -top-6 size-16 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 opacity-15 blur-xl" />
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="mt-1 font-display text-2xl">{total}</p>
                        <p className="text-xs text-muted-foreground">integrações</p>
                    </Card>
                    <Card className="relative overflow-hidden p-4 border-emerald-500/20 bg-emerald-500/5">
                        <div className="absolute -right-6 -top-6 size-16 rounded-full bg-emerald-500 opacity-15 blur-xl" />
                        <p className="text-xs text-emerald-400">Funcionando</p>
                        <p className="mt-1 font-display text-2xl text-emerald-400">{totalOk}</p>
                        <p className="text-xs text-emerald-400/60">✅ OK</p>
                    </Card>
                    <Card className="relative overflow-hidden p-4 border-amber-500/20 bg-amber-500/5">
                        <div className="absolute -right-6 -top-6 size-16 rounded-full bg-amber-500 opacity-15 blur-xl" />
                        <p className="text-xs text-amber-400">Alertas</p>
                        <p className="mt-1 font-display text-2xl text-amber-400">{totalWarning}</p>
                        <p className="text-xs text-amber-400/60">⚠️ Atenção</p>
                    </Card>
                    <Card className="relative overflow-hidden p-4 border-red-500/20 bg-red-500/5">
                        <div className="absolute -right-6 -top-6 size-16 rounded-full bg-red-500 opacity-15 blur-xl" />
                        <p className="text-xs text-red-400">Erros</p>
                        <p className="mt-1 font-display text-2xl text-red-400">{totalError}</p>
                        <p className="text-xs text-red-400/60">❌ Crítico</p>
                    </Card>
                </section>
            )}

            {/* Lista de integrações com diagnóstico */}
            {diagnosticos && diagnosticos.length > 0 && (
                <Card className="relative overflow-hidden border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
                    <div className="p-6">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            🔌 Status de Todas as Integrações
                        </h2>
                        <div className="space-y-2">
                            {diagnosticos.map((d, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:bg-slate-800/50 ${getStatusColor(d.diagnostico.status)}`}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-xl shrink-0">{d.icone}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold">{d.nome}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-muted-foreground font-mono uppercase">{d.tipo}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                {d.diagnostico.mensagem}
                                            </p>
                                            {d.diagnostico.sugestoes.length > 0 && (
                                                <div className="mt-1.5 space-y-0.5">
                                                    {d.diagnostico.sugestoes.slice(0, 2).map((s, j) => (
                                                        <p key={j} className="text-xs text-muted-foreground/70">
                                                            💡 {s}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        {getStatusBadge(d.diagnostico.status)}
                                        {d.diagnostico.status !== "ok" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs h-7 px-2 hover:bg-cyan-500/10 hover:text-cyan-400"
                                                onClick={() => handleResolverIntegracao(d)}
                                                disabled={carregando}
                                            >
                                                {modoResolucao && integracaoSelecionada?.nome === d.nome ? (
                                                    <span className="animate-spin">🔄</span>
                                                ) : (
                                                    "🔧 Resolver"
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Relatório de saúde */}
            {relatorio && (
                <Card className="relative overflow-hidden p-6 border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        📊 Relatório de Saúde
                    </h2>
                    <div className="bg-slate-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                            {relatorio}
                        </pre>
                    </div>
                </Card>
            )}

            {/* Chat com o Agente */}
            <Card className="relative overflow-hidden p-6 border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />
                <div className="relative">
                    <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
                        💬 Perguntar ao Agente
                    </h2>
                    <p className="text-xs text-muted-foreground mb-4">
                        Pergunte sobre <strong>qualquer integração</strong> — Supabase, Stripe, PushinPay, N8N, UTMify, Vercel, ou qualquer erro do projeto
                    </p>

                    {/* Atalhos rápidos */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {[
                            { label: "Supabase", q: "Como verifico se o Supabase está conectado corretamente e as tabelas estão criadas?" },
                            { label: "Stripe", q: "Como faço para testar um pagamento real com Stripe no meu checkout?" },
                            { label: "PushinPay", q: "Como configuro o PushinPay para gerar QR Code PIX no checkout?" },
                            { label: "N8N", q: "Como conecto o N8N para enviar emails automáticos após uma compra?" },
                            { label: "Deploy", q: "Quais variáveis preciso configurar na Vercel para o deploy funcionar?" },
                        ].map((atalho) => (
                            <button
                                key={atalho.label}
                                onClick={() => setPerguntaTexto(atalho.q)}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-400 
                  hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-200"
                            >
                                {atalho.label}
                            </button>
                        ))}
                    </div>

                    <Textarea
                        value={perguntaTexto}
                        onChange={(e) => setPerguntaTexto(e.target.value)}
                        placeholder="Ex: Por que meu PIX não está gerando QR code? / Como faço o webhook do Stripe funcionar? / Meu deploy na Vercel deu erro..."
                        className="min-h-[80px] bg-slate-800/50 border-slate-700/50 resize-none"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handlePerguntar();
                            }
                        }}
                    />
                    <Button
                        onClick={handlePerguntar}
                        disabled={carregando || !perguntaTexto.trim()}
                        className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-900/20"
                    >
                        {carregando && !modoResolucao ? (
                            <span className="flex items-center gap-2"><span className="animate-spin">🔄</span> Pensando...</span>
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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            📋 Histórico ({historicoRespostas.length})
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-red-400"
                            onClick={() => setHistoricoRespostas([])}
                        >
                            Limpar
                        </Button>
                    </div>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {historicoRespostas.map((item, i) => (
                            <div key={i} className="space-y-2">
                                {/* Pergunta */}
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] p-3 rounded-xl bg-cyan-600/15 border border-cyan-500/20">
                                        <p className="text-sm text-cyan-300">{item.pergunta}</p>
                                        <p className="text-[10px] text-cyan-400/50 mt-1">{item.timestamp}</p>
                                    </div>
                                </div>
                                {/* Resposta */}
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <span className="text-xs">🤖</span>
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                Agente SharkPay
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                            {item.resposta}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Info Card */}
            <Card className="p-4 text-sm text-muted-foreground border border-border/40">
                <p className="flex items-center gap-2">
                    <span>🧠</span>
                    <span>
                        Modelos: <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">arcee-ai/trinity-large-preview</code> (primário)
                        + <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">stepfun/step-3-5-flash</code> (fallback) —
                        <strong className="text-emerald-400"> 100% gratuitos</strong> via OpenRouter
                    </span>
                </p>
            </Card>
        </div>
    );
}
