import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgenteLLM } from "@/hooks/useAgenteLLM";
import { healthCheckWebhooks, enviarSolicitacaoParaAntigravity } from "@/lib/agente-integracoes";

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
    MessageSquare,
    Image as ImageIcon,
    Camera,
    X
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
    const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [historicoRespostas, setHistoricoRespostas] = useState<
        Array<{ role: 'user' | 'assistant'; content: string; timestamp: string; isDiagnostic?: boolean; image?: string; synced?: boolean }>
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
            loading: '📡 Analisando integridade do sistema...',
            success: (data) => {
                const total = data?.length || 0;
                const errors = data?.filter(d => d.diagnostico.status === 'error').length || 0;

                setHistoricoRespostas(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: `Diagnóstico concluído no núcleo. ${total} subsistemas verificados. ${errors > 0 ? `Detectados ${errors} desvios críticos.` : 'Todos os parâmetros operacionais.'}`,
                        timestamp: new Date().toLocaleTimeString("pt-BR"),
                        isDiagnostic: true
                    }
                ]);
                return "Dados de diagnóstico recebidos.";
            },
            error: 'Falha na varredura local.'
        });
    };

    const handlePerguntar = async () => {
        if ((!perguntaTexto.trim() && !imagemSelecionada) || carregando) return;

        const q = perguntaTexto;
        const img = imagemSelecionada;
        setPerguntaTexto("");
        setImagemSelecionada(null);

        setHistoricoRespostas(prev => [
            ...prev,
            {
                role: 'user',
                content: q || (img ? "📸 Arquivo visual anexado para processamento." : ""),
                timestamp: new Date().toLocaleTimeString("pt-BR"),
                image: img || undefined
            }
        ]);

        const resposta = await perguntar(q, img || undefined);
        if (resposta) {
            setHistoricoRespostas(prev => [
                ...prev,
                { role: 'assistant', content: resposta, timestamp: new Date().toLocaleTimeString("pt-BR") }
            ]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Volume de dados excedido (>5MB).");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagemSelecionada(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGerarRelatorio = async () => {
        const res = await gerarRelatorio();
        if (res) {
            setHistoricoRespostas(prev => [
                ...prev,
                { role: 'assistant', content: res, timestamp: new Date().toLocaleTimeString("pt-BR") }
            ]);
            toast.success("Relatório de saúde compilado.");
        }
    };

    const handleEnviarAntigravity = async (briefing: any, index: number) => {
        toast.promise(enviarSolicitacaoParaAntigravity(briefing), {
            loading: '📡 Estabelecendo link com Antigravity...',
            success: () => {
                setHistoricoRespostas(prev => prev.map((msg, i) => i === index ? { ...msg, synced: true } : msg));
                return 'Briefing injetado no IDE com sucesso!';
            },
            error: 'Falha na conexão de uplink.'
        });
    };

    const handleHealthCheckWebhooks = async () => {
        setIsChecking(true);
        toast.info("Varrendo endpoints de transmissão...");
        try {
            const resultado = await healthCheckWebhooks();
            const mensagem = `STATUS DE COMUNICAÇÃO (WEBHOOKS):\n\n` +
                `• N8N: ${resultado.n8n}\n` +
                `• PushinPay: ${resultado.pushinpay}\n` +
                `• Stripe: ${resultado.stripe}`;

            setHistoricoRespostas(prev => [
                ...prev,
                { role: 'assistant', content: mensagem, timestamp: new Date().toLocaleTimeString("pt-BR") }
            ]);
            toast.success("Varredura de rede finalizada.");
        } catch (e: any) {
            toast.error("Erro na varredura: " + e.message);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#000000] text-white flex flex-col font-sans overflow-hidden z-[50]">
            {/* Native Mobile Header */}
            <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black/80 backdrop-blur-2xl z-[60] shrink-0 safe-top">
                <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                        <Sparkles className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-[13px] font-black tracking-[0.1em] flex items-center gap-2">
                            TRINITY <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-500 font-mono">v4.0.0</span>
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`size-1.5 rounded-full ${disponivel ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500"}`} />
                            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.05em] leading-none">
                                {disponivel ? "Antigravity MCP Ativo" : "Link Interrompido"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 rounded-full hover:bg-white/5 text-zinc-400 active:scale-90 transition-transform"
                        onClick={handleHealthCheckWebhooks}
                        disabled={isChecking}
                    >
                        <RefreshCw className={`size-5 ${isChecking ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>

            {/* Content Area - Optimized for Native Scroll */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scroll-smooth antialiased"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {historicoRespostas.length === 0 ? (
                    <div className="min-h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-10 py-12">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="size-28 rounded-[2.5rem] bg-zinc-950 flex items-center justify-center border border-white/5 relative group"
                        >
                            <div className="absolute inset-0 rounded-[2.5rem] bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-all opacity-40" />
                            <Bot className="size-14 text-zinc-500 relative z-10" />
                        </motion.div>

                        <div className="space-y-4">
                            <h3 className="text-2xl font-black tracking-tighter text-white">READY TO BUILD.</h3>
                            <p className="text-[13px] text-zinc-500 leading-relaxed px-4 font-medium">
                                Operando via Protocolo Antigravity. Envie diagnósticos,
                                capturas de tela ou comandos estruturais.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full px-6">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-4 h-16 rounded-2xl border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition-all"
                                onClick={handleDiagnostico}
                            >
                                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                                    <Search className="size-4 text-primary" />
                                </div>
                                <span>Deep Scan</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-4 h-16 rounded-2xl border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition-all"
                                onClick={handleGerarRelatorio}
                            >
                                <div className="size-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
                                    <FileText className="size-4 text-blue-400" />
                                </div>
                                <span>Health Brief</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 pb-40">
                        {historicoRespostas.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex flex-col gap-2 max-w-[92%] sm:max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`mt-0.5 size-8 rounded-xl flex items-center justify-center border shrink-0 ${msg.role === 'user'
                                            ? 'bg-primary/10 border-primary/20 text-primary'
                                            : 'bg-zinc-900 border-white/10 text-zinc-500'
                                            }`}>
                                            {msg.role === 'user' ? <Terminal className="size-4" /> : <Bot className="size-4" />}
                                        </div>
                                        <div className={`space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-3.5 rounded-2xl text-[14.5px] leading-relaxed relative ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10'
                                                : 'text-zinc-200 bg-zinc-900/30 border border-white/5 backdrop-blur-sm'
                                                }`}>

                                                {msg.image && (
                                                    <div className="mb-4 overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                                                        <img src={msg.image} alt="Visual context" className="w-full h-auto object-cover" />
                                                    </div>
                                                )}

                                                {msg.isDiagnostic ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-emerald-400">
                                                            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                                                <CheckCircle2 className="size-4" />
                                                            </div>
                                                            <span className="font-black uppercase tracking-[0.2em] text-[10px]">Security Integrity OK</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-zinc-300">{msg.content}</p>
                                                        {diagnosticos && (
                                                            <div className="grid grid-cols-1 gap-2 pt-2">
                                                                {diagnosticos.map((d, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/5">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-lg">{d.icone}</span>
                                                                            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-wider">{d.nome}</span>
                                                                        </div>
                                                                        <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${d.diagnostico.status === 'ok' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                                            d.diagnostico.status === 'warning' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                                            }`}>
                                                                            {d.diagnostico.status}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="whitespace-pre-wrap font-medium kerning-none tracking-tight">
                                                        {msg.content}
                                                    </div>
                                                )}

                                                {msg.role === 'assistant' && (
                                                    <div className="mt-5">
                                                        <Button
                                                            variant="outline"
                                                            disabled={msg.synced}
                                                            className={`w-full transition-all rounded-xl h-14 text-[11px] font-black uppercase tracking-[0.2em] ${msg.synced
                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                : 'bg-white text-black hover:bg-white/90 border-transparent shadow-xl active:scale-95'
                                                                }`}
                                                            onClick={() => handleEnviarAntigravity({
                                                                origem: "Trinity Uplink",
                                                                conteudo: msg.content,
                                                                diagnostico: msg.isDiagnostic ? diagnosticos : null
                                                            }, i)}
                                                        >
                                                            {msg.synced ? (
                                                                <><CheckCircle2 className="size-4 mr-2" /> Synced to IDE</>
                                                            ) : (
                                                                <><Zap className="size-4 mr-2 fill-current" /> Sync to Antigravity</>
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-zinc-700 font-black tracking-widest px-1 uppercase opacity-50">{msg.timestamp}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
                {carregando && (
                    <div className="flex justify-start px-2">
                        <div className="flex gap-2 p-4 bg-zinc-900/20 rounded-2xl border border-white/5">
                            <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                            <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                            <span className="size-1.5 rounded-full bg-primary/40 animate-bounce" />
                        </div>
                    </div>
                )}
            </div>

            {/* Native-Style Floating Input Overlay */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-[70] pb-safe">
                <div className="max-w-xl mx-auto">
                    <div className="relative group bg-zinc-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        {/* Status Badges - Top of Input */}
                        <div className="absolute -top-3.5 left-8 flex gap-2">
                            <div className="px-2.5 py-1 rounded-full bg-zinc-950 border border-white/10 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1.5">
                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                MCP Active
                            </div>
                            <div className="px-2.5 py-1 rounded-full bg-zinc-950 border border-white/10 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500">
                                Neural-V
                            </div>
                        </div>

                        {/* Image Preview Overlay */}
                        <AnimatePresence>
                            {imagemSelecionada && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="absolute bottom-full mb-4 left-2 right-2 bg-zinc-900 border border-white/10 rounded-3xl p-3 flex items-center gap-4 shadow-2xl backdrop-blur-3xl"
                                >
                                    <div className="relative group/img">
                                        <img src={imagemSelecionada} className="size-14 rounded-2xl object-cover border border-white/10 shadow-xl" />
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="absolute -top-2 -right-2 size-6 rounded-full scale-0 group-hover/img:scale-100 transition-transform shadow-xl"
                                            onClick={() => setImagemSelecionada(null)}
                                        >
                                            <X className="size-3" />
                                        </Button>
                                    </div>
                                    <div className="flex-1">
                                        <span className="block text-[10px] font-black text-zinc-400 font-mono uppercase tracking-widest">Vision Context Loaded</span>
                                        <span className="block text-[9px] text-zinc-600 font-bold uppercase mt-0.5">Ready for deep analysis</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-end gap-1 p-2">
                            <div className="flex-1 min-h-[56px] flex items-center pl-4 py-3">
                                <Textarea
                                    value={perguntaTexto}
                                    onChange={(e) => setPerguntaTexto(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePerguntar();
                                        }
                                    }}
                                    placeholder="Execute command..."
                                    className="w-full bg-transparent border-none focus:ring-0 focus-visible:ring-0 resize-none max-h-[160px] p-0 text-[15px] font-medium leading-relaxed text-white placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 p-1.5">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-11 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera className="size-5" />
                                </Button>
                                <Button
                                    size="icon"
                                    className={`size-11 rounded-full transition-all duration-300 ${(perguntaTexto.trim() || imagemSelecionada) && !carregando
                                        ? 'bg-white text-black hover:bg-zinc-200 scale-100 shadow-xl shadow-white/10'
                                        : 'bg-zinc-800/50 text-zinc-600 scale-90'
                                        }`}
                                    onClick={handlePerguntar}
                                    disabled={carregando || (!perguntaTexto.trim() && !imagemSelecionada)}
                                >
                                    <Send className="size-5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-center items-center gap-6 opacity-30 select-none pointer-events-none">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-zinc-800" />
                        <span className="text-[10px] font-black text-zinc-600 tracking-[0.4em] uppercase">
                            Secure Field Protocol v4.0
                        </span>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-zinc-800" />
                    </div>
                </div>
            </div>
        </div>
    );
}
