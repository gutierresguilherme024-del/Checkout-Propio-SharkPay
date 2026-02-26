import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgenteLLM } from "@/hooks/useAgenteLLM";
import { healthCheckWebhooks } from "@/lib/agente-integracoes";
import {
    Bot,
    Search,
    FileText,
    Zap,
    CheckCircle2,
    AlertCircle,
    XCircle,
    RefreshCw,
    Send,
    Sparkles,
    ShieldCheck,
    Code2,
    Terminal,
    MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function AgenteIA() {
    const {
        carregando,
        disponivel,
        diagnosticos,
        relatorio,
        erro,
        verificarDisponibilidade,
        executarDiagnostico,
        perguntar,
        gerarRelatorio,
    } = useAgenteLLM();

    const [perguntaTexto, setPerguntaTexto] = useState("");
    const [historicoRespostas, setHistoricoRespostas] = useState<
        Array<{ role: 'user' | 'assistant'; content: string; timestamp: string; isDiagnostic?: boolean }>
    >([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        verificarDisponibilidade();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [historicoRespostas, carregando]);

    const handleDiagnostico = async () => {
        toast.promise(executarDiagnostico(), {
            loading: 'Iniciando diagnóstico profundo...',
            success: (data) => {
                const total = data?.length || 0;
                const errors = data?.filter(d => d.diagnostico.status === 'error').length || 0;

                setHistoricoRespostas(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: `Diagnóstico concluído em ${total} integrações. ${errors > 0 ? `Encontrei ${errors} problema(s) crítico(s) que precisam de atenção.` : 'Tudo parece operacional!'}`,
                        timestamp: new Date().toLocaleTimeString("pt-BR"),
                        isDiagnostic: true
                    }
                ]);
                return "Diagnóstico concluído";
            },
            error: 'Falha ao executar diagnóstico'
        });
    };

    const handlePerguntar = async () => {
        if (!perguntaTexto.trim() || carregando) return;

        const q = perguntaTexto;
        setPerguntaTexto("");

        setHistoricoRespostas(prev => [
            ...prev,
            { role: 'user', content: q, timestamp: new Date().toLocaleTimeString("pt-BR") }
        ]);

        const resposta = await perguntar(q);
        if (resposta) {
            setHistoricoRespostas(prev => [
                ...prev,
                { role: 'assistant', content: resposta, timestamp: new Date().toLocaleTimeString("pt-BR") }
            ]);
        }
    };

    const handleGerarRelatorio = async () => {
        const res = await gerarRelatorio();
        if (res) {
            setHistoricoRespostas(prev => [
                ...prev,
                { role: 'assistant', content: res, timestamp: new Date().toLocaleTimeString("pt-BR") }
            ]);
            toast.success("Relatório de saúde gerado!");
        }
    };

    const handleHealthCheckWebhooks = async () => {
        setIsChecking(true);
        toast.info("Testando endpoints de webhook...");
        try {
            const resultado = await healthCheckWebhooks();
            const mensagem = `🔍 Health Check dos Webhooks:\n\n` +
                `• N8N: ${resultado.n8n}\n` +
                `• PushinPay: ${resultado.pushinpay}\n` +
                `• Stripe: ${resultado.stripe}`;

            setHistoricoRespostas(prev => [
                ...prev,
                { role: 'assistant', content: mensagem, timestamp: new Date().toLocaleTimeString("pt-BR") }
            ]);
            toast.success("Health Check concluído!");
        } catch (e: any) {
            toast.error("Erro no health check: " + e.message);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6">
            {/* Minimalist Header */}
            <header className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <Bot className="size-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Agente SharkPay</h1>
                        <p className="text-xs text-muted-foreground">Especialista em Integrações e Infraestrutura</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <AnimatePresence>
                        {disponivel !== null && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${disponivel ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                    }`}
                            >
                                <span className={`size-1.5 rounded-full ${disponivel ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                                {disponivel ? "Agente Online" : "Agente Offline"}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Main Chat Interface */}
            <Card className="flex-1 flex flex-col overflow-hidden border-border/60 bg-slate-950/40 backdrop-blur-xl relative">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

                {/* Chat Display */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
                >
                    {historicoRespostas.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                            <div className="size-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/40 border border-primary/10">
                                <Sparkles className="size-10" />
                            </div>
                            <div className="max-w-md space-y-2">
                                <h3 className="text-xl font-semibold">Como posso ajudar hoje?</h3>
                                <p className="text-sm text-muted-foreground px-4">
                                    Sou seu especialista em Checkout. Posso diagnosticar erros, configurar webhooks,
                                    gerar relatórios de saúde ou responder dúvidas técnicas.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4 uppercase text-[10px] font-bold tracking-widest text-muted-foreground/50">
                                <div className="space-y-3">
                                    <p className="text-center">Comandos Rápidos</p>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 h-auto py-3 px-4 border-primary/10 hover:border-primary/30 hover:bg-primary/5 text-xs text-foreground group"
                                        onClick={handleDiagnostico}
                                    >
                                        <Search className="size-4 text-primary group-hover:scale-110 transition-transform" />
                                        Diagnosticar Projeto
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 h-auto py-3 px-4 border-primary/10 hover:border-primary/30 hover:bg-primary/5 text-xs text-foreground group"
                                        onClick={handleGerarRelatorio}
                                    >
                                        <FileText className="size-4 text-primary group-hover:scale-110 transition-transform" />
                                        Gerar Relatório de Saúde
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 h-auto py-3 px-4 border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-xs text-foreground group"
                                        onClick={handleHealthCheckWebhooks}
                                        disabled={isChecking}
                                    >
                                        <Zap className="size-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                        {isChecking ? 'Checando...' : 'Health Check Webhooks'}
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-center">Dúvidas Frequentes</p>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 h-auto py-3 px-4 border-primary/10 hover:border-primary/30 hover:bg-primary/5 text-xs text-foreground"
                                        onClick={() => setPerguntaTexto("Por que meu PIX não está gerando QR code?")}
                                    >
                                        <Zap className="size-4 text-amber-500" />
                                        Erro no QR Code PIX
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 h-auto py-3 px-4 border-primary/10 hover:border-primary/30 hover:bg-primary/5 text-xs text-foreground"
                                        onClick={() => setPerguntaTexto("Como configuro o webhook do Stripe?")}
                                    >
                                        <Terminal className="size-4 text-blue-500" />
                                        Configurar Webhooks
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        historicoRespostas.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`mt-1 size-8 rounded-lg flex items-center justify-center border shrink-0 ${msg.role === 'user'
                                        ? 'bg-primary/10 border-primary/20 text-primary'
                                        : 'bg-slate-800 border-slate-700 text-slate-300'
                                        }`}>
                                        {msg.role === 'user' ? <Terminal className="size-4" /> : <Bot className="size-4" />}
                                    </div>
                                    <div className={`space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                                            : 'bg-slate-900/80 border border-slate-800 rounded-tl-none text-slate-200'
                                            }`}>
                                            {msg.isDiagnostic ? (
                                                <div className="space-y-4">
                                                    <p className="font-medium text-emerald-400 flex items-center gap-2">
                                                        <CheckCircle2 className="size-4" />
                                                        Sistema Escaneado
                                                    </p>
                                                    <p>{msg.content}</p>
                                                    {diagnosticos && (
                                                        <div className="grid grid-cols-1 gap-2 mt-4">
                                                            {diagnosticos.map((d, idx) => (
                                                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-white/5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-base">{d.icone}</span>
                                                                        <span className="text-xs font-medium">{d.nome}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {d.diagnostico.status === 'ok' ? (
                                                                            <CheckCircle2 className="size-3 text-emerald-500" />
                                                                        ) : d.diagnostico.status === 'warning' ? (
                                                                            <AlertCircle className="size-3 text-amber-500" />
                                                                        ) : (
                                                                            <XCircle className="size-3 text-red-500" />
                                                                        )}
                                                                        <span className={`text-[10px] font-bold ${d.diagnostico.status === 'ok' ? 'text-emerald-500' :
                                                                            d.diagnostico.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                                                                            }`}>
                                                                            {d.diagnostico.status.toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="whitespace-pre-wrap font-sans">
                                                    {msg.content}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground px-1">{msg.timestamp}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                    {carregando && (
                        <div className="flex justify-start">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 size-8 rounded-lg flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-300">
                                    <Bot className="size-4 animate-pulse" />
                                </div>
                                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl rounded-tl-none">
                                    <div className="flex gap-1">
                                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border/40 bg-slate-950/20 backdrop-blur-md">
                    <div className="max-w-4xl mx-auto flex items-end gap-2 relative">
                        <div className="flex-1 relative group">
                            <Textarea
                                value={perguntaTexto}
                                onChange={(e) => setPerguntaTexto(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handlePerguntar();
                                    }
                                }}
                                placeholder="Descreva um problema ou peça um diagnóstico..."
                                className="min-h-[56px] max-h-[200px] w-full bg-slate-900/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-2xl pr-12 py-4 resize-none transition-all"
                            />
                            <div className="absolute left-4 -top-3 px-2 flex gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-border/40 text-[10px] text-muted-foreground">
                                    <ShieldCheck className="size-3 text-emerald-500" />
                                    <span>Seguro</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-border/40 text-[10px] text-muted-foreground">
                                    <Code2 className="size-3 text-blue-500" />
                                    <span>v2.4</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            className="h-[56px] w-[56px] rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0"
                            onClick={handlePerguntar}
                            disabled={carregando || !perguntaTexto.trim()}
                        >
                            <Send className="size-5" />
                        </Button>
                    </div>
                </div>

                {/* Side Actions Overlay (Responsive) */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-3 group">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-xl shadow-xl border border-white/10 hover:scale-110 active:scale-95 transition-all"
                        onClick={handleDiagnostico}
                        title="Diagnosticar Tudo"
                    >
                        <Search className="size-5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-xl shadow-xl border border-white/10 hover:scale-110 active:scale-95 transition-all"
                        onClick={handleGerarRelatorio}
                        title="Relatório de Saúde"
                    >
                        <FileText className="size-5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-xl shadow-xl border border-white/10 hover:scale-110 active:scale-95 transition-all"
                        onClick={() => {
                            verificarDisponibilidade();
                            toast.info("Status do agente atualizado");
                        }}
                        title="Testar Conexão"
                    >
                        <RefreshCw className="size-5" />
                    </Button>
                </div>
            </Card>

            {/* AI Model Footer */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/60 font-mono uppercase tracking-[0.2em] mb-4">
                <span>Trinity v1.2</span>
                <span className="size-1 rounded-full bg-border" />
                <span>SharkPay Neural Engine</span>
                <span className="size-1 rounded-full bg-border" />
                <span>OpenRouter Cloud</span>
            </div>
        </div>
    );
}
