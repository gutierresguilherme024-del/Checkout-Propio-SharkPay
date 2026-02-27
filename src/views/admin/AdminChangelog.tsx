import { motion, AnimatePresence } from "framer-motion";
import { History, Sparkles, Wrench, Zap, Rocket, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { HeroGlow } from "@/components/brand/HeroGlow";

// ─── TIPOS ──────────────────────────────────────────────────
interface Version {
    version: string;
    name: string;
    keywords: string[];
    type: 'funcionalidade' | 'correcao' | 'performance' | 'lancamento';
    // status: 'concluido' → exibição padrão
    // status: 'em_andamento' → exibe badge pulsante "Em Andamento" no card Funcionalidades
    // status: 'falhou' → exibe mensagem de falha no card Correções
    status?: 'concluido' | 'em_andamento' | 'falhou';
    failReason?: string; // motivo da falha, para exibir no card Correções
}

// ─── ARRAY DE VERSÕES (mais recente no topo) ────────────────
// >>> REGRA: Toda atualização significativa DEVE adicionar uma nova entrada aqui <<<
// >>> Se status='em_andamento', o card "Funcionalidades" exibe "Processando" <<<
// >>> Se status='falhou', o card "Correções" exibe o motivo + failReason <<<
const versions: Version[] = [
    {
        version: '1.7.0',
        name: 'Personalização Mobile: Ícones PWA & Favicons',
        keywords: ['PWA', 'Favicon', 'Mobile-UX', 'Home-Screen'],
        type: 'funcionalidade',
        status: 'concluido',
    },
    {
        version: '1.6.1',
        name: 'Check de Confiabilidade: UTMify 100% Tracking',
        keywords: ['Validação', 'Tracking', 'InitiateCheckout', 'Purchase'],
        type: 'performance',
        status: 'concluido',
    },
    {
        version: '1.6.0',
        name: 'Rastreamento Avançado: UTMify Full-Funnel',
        keywords: ['InitiateCheckout', 'Purchase', 'Automação'],
        type: 'funcionalidade',
        status: 'concluido',
    },
    {
        version: '1.5.0',
        name: 'Simplificação UTMify & Feedback Visual',
        keywords: ['UX', 'Sidebar-Status', 'Config-Simple'],
        type: 'performance',
        status: 'concluido',
    },
    {
        version: '1.4.0',
        name: 'Integração Nativa: UTMify Tracking',
        keywords: ['Pixel', 'Script-Injection', 'Tracking'],
        type: 'funcionalidade',
        status: 'concluido',
    },
    {
        version: '1.3.3',
        name: 'Persistência Global: Editor de Checkout SaaS',
        keywords: ['SaaS-Isolation', 'Conversão', 'GlobalSettings'],
        type: 'funcionalidade',
        status: 'concluido',
    },
    {
        version: '1.3.2',
        name: 'Localização Completa: Dashboard em Português',
        keywords: ['UI/UX', 'Português', 'AjusteFino'],
        type: 'performance',
        status: 'concluido',
    },
    {
        version: '1.3.1',
        name: 'Correção Crítica: Isolamento SaaS & Gateway Sync',
        keywords: ['BugFix', 'Multi-tenancy', 'MundPay-Sync'],
        type: 'correcao',
        status: 'concluido',
    },
    {
        version: '1.2.0',
        name: 'Performance Ultra & Responsividade Total',
        keywords: ['Instantâneo', 'Responsivo', 'SmartSlug'],
        type: 'performance',
        status: 'concluido',
    },
    {
        version: '1.1.3',
        name: 'SaaS Multi-tenancy & Carregamento Instantâneo',
        keywords: ['SaaS', 'PGRST116', 'FastLoad'],
        type: 'funcionalidade',
        status: 'concluido',
    },
    {
        version: '1.1.2',
        name: 'Interface em Português & Deploy Automático',
        keywords: ['Português', 'DeployInstantâneo', 'WF-Deploy'],
        type: 'funcionalidade',
        status: 'concluido',
    },
    {
        version: '1.1.1',
        name: 'Visual Premium no Changelog',
        keywords: ['HeroGlow', 'UI/UX', 'Estética'],
        type: 'performance',
        status: 'concluido',
    },
    {
        version: '1.1.0',
        name: 'Turbo Performance & Auditoria',
        keywords: ['LazyLoading', 'CodeSplitting', 'AuditoriaContinua'],
        type: 'funcionalidade',
        status: 'concluido',
    },
    {
        version: '1.0.0',
        name: 'Lançamento Inicial',
        keywords: ['PrimeiraVersão', 'Deploy', 'Completo'],
        type: 'lancamento',
        status: 'concluido',
    },
];

// ─── CONFIGURAÇÕES DE TIPO ──────────────────────────────────
const tipoConfig = {
    funcionalidade: {
        icon: Sparkles,
        label: '⭐ Funcionalidade',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        badgeBg: 'bg-emerald-500/20 text-emerald-400',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    },
    correcao: {
        icon: Wrench,
        label: '🔧 Correção',
        bg: 'bg-yellow-500/10 border-yellow-500/20',
        badgeBg: 'bg-yellow-500/20 text-yellow-400',
        glow: 'shadow-[0_0_20px_rgba(234,179,8,0.1)]',
    },
    performance: {
        icon: Zap,
        label: '⚡ Performance',
        bg: 'bg-cyan-500/10 border-cyan-500/20',
        badgeBg: 'bg-cyan-500/20 text-cyan-400',
        glow: 'shadow-[0_0_20px_rgba(6,182,212,0.1)]',
    },
    lancamento: {
        icon: Rocket,
        label: '🚀 Lançamento',
        bg: 'bg-purple-500/10 border-purple-500/20',
        badgeBg: 'bg-purple-500/20 text-purple-400',
        glow: 'shadow-[0_0_20px_rgba(168,85,247,0.1)]',
    },
};

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────
export default function AdminChangelog() {
    const versaoAtual = versions[0];
    const totalVersoes = versions.length;

    const emAndamento = versions.filter(v => v.type === 'funcionalidade' && v.status === 'em_andamento');
    const funcionalidades = versions.filter(v => v.type === 'funcionalidade' && v.status !== 'em_andamento');
    const correcoes = versions.filter(v => v.type === 'correcao');
    const falhas = versions.filter(v => v.status === 'falhou');
    const performance = versions.filter(v => v.type === 'performance');
    const lancamentos = versions.filter(v => v.type === 'lancamento');

    const temEmAndamento = emAndamento.length > 0;
    const temFalhas = falhas.length > 0;

    // Lógica de "Foco da Auditoria": identifica o que o usuário mais atualiza
    const counts = versions.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const focusType = (Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a, ['funcionalidade', 0])[0]) as Version['type'];
    const focusLabel = tipoConfig[focusType].label.split(' ')[1];

    return (
        <div className="min-h-full -m-4 md:-m-8 relative overflow-hidden">
            {/* ── Fundo: gradiente ciano (primary) — canto superior esquerdo, igual à Home */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `
                        radial-gradient(1100px circle at 10% 0%, hsl(190 95% 52% / 0.18), transparent 55%),
                        radial-gradient(900px circle at 90% 10%, hsl(32 95% 56% / 0.13), transparent 60%)
                    `
                }}
            />
            {/* ── Glow radial interativo ao mover o mouse — igual ao HeroGlow */}
            <HeroGlow className="absolute inset-0">{null}</HeroGlow>

            <div className="max-w-4xl mx-auto space-y-8 relative z-10 p-4 md:p-8">
                {/* ── Cabeçalho ─────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                            <History className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight font-display">Histórico de Atualizações</h1>
                            <p className="text-sm text-muted-foreground">Auditoria Contínua — SharkPay Checkout</p>
                        </div>
                    </div>

                    {/* ── Dashboard SharkPay Elite ──────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Pipeline de Versões (Histórico vs Futuro) */}
                        <div className="rounded-2xl border bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20 p-5 backdrop-blur-md relative group hover:border-indigo-500/40 transition-all duration-300">
                            <div className="absolute top-4 right-4 text-indigo-400/20 group-hover:text-indigo-400/40 transition-colors">
                                <History className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-4">Pipeline de Auditoria</p>
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <h2 className="text-3xl font-black font-display text-white/90 leading-none">{totalVersoes}</h2>
                                    <p className="text-[9px] font-black uppercase text-indigo-400/60 tracking-tighter mt-1">Criadas</p>
                                </div>
                                <div className="w-[1px] h-10 bg-white/10" />
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <h2 className="text-3xl font-black font-display text-emerald-400 leading-none">{emAndamento.length + 3}</h2>
                                        <div className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    </div>
                                    <p className="text-[9px] font-black uppercase text-emerald-600/60 tracking-tighter mt-1">Roadmap</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">Versão Atual</span>
                                <span className="text-[10px] font-black text-indigo-300/80 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">v{versaoAtual.version}</span>
                            </div>
                        </div>

                        {/* Funcionalidades */}
                        <div className="rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 p-5 backdrop-blur-md relative group hover:border-emerald-500/40 transition-all duration-300">
                            <div className="absolute top-4 right-4 text-emerald-400/20 group-hover:text-emerald-400/40 transition-colors">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Funcionalidades</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-4xl font-black font-display text-emerald-400">{funcionalidades.length + emAndamento.length}</h2>
                                <span className="text-[10px] font-black uppercase text-emerald-600/70 tracking-widest">Ativos</span>
                            </div>
                            <div className="mt-3 flex gap-1">
                                {Array.from({ length: Math.min(funcionalidades.length + emAndamento.length, 6) }).map((_, i) => (
                                    <div key={i} className="h-1 w-3 rounded-full bg-emerald-500/30" />
                                ))}
                            </div>
                        </div>

                        {/* Correções & Saúde */}
                        <div className={`rounded-2xl border p-5 backdrop-blur-md relative group transition-all duration-300 ${temFalhas
                            ? 'from-red-500/10 via-red-500/5 to-transparent border-red-500/30 hover:border-red-500/50'
                            : 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 hover:border-amber-500/40'
                            }`}>
                            <div className="absolute top-4 right-4 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors">
                                <Wrench className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Correções & Saúde</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-baseline gap-2">
                                    <h2 className={`text-4xl font-black font-display ${temFalhas ? 'text-red-400' : 'text-amber-400'}`}>{correcoes.length}</h2>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${temFalhas ? 'text-red-600/70' : 'text-amber-600/70'}`}>Ações</span>
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${temFalhas
                                    ? 'bg-red-500/20 text-red-100 border-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30'
                                    }`}>
                                    {temFalhas ? 'Falhou' : 'Estável'}
                                </div>
                            </div>
                        </div>

                        {/* Performance & Outros */}
                        <div className="rounded-2xl border bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-500/20 p-5 backdrop-blur-md relative group hover:border-cyan-500/40 transition-all duration-300">
                            <div className="absolute top-4 right-4 text-cyan-400/20 group-hover:text-cyan-400/40 transition-colors">
                                <Zap className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Performance & Lançamentos</p>
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black font-display text-cyan-400">{performance.length}</span>
                                    <span className="text-[8px] font-extrabold uppercase text-cyan-600/80 tracking-tighter">Otimizações</span>
                                </div>
                                <div className="w-[1px] h-8 bg-white/10" />
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black font-display text-purple-400">{lancamentos.length}</span>
                                    <span className="text-[8px] font-extrabold uppercase text-purple-600/80 tracking-tighter">Drops</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Alerta de Falha (se houver) ────────────────── */}
                <AnimatePresence>
                    {temFalhas && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex gap-3 items-start"
                        >
                            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-400">
                                    {falhas.length === 1 ? 'Uma atualização falhou e requer revisão' : `${falhas.length} atualizações falharam`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Verifique as entradas marcadas abaixo. Nossa equipe foi notificada e está atuando nas correções.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Lista de versões ───────────────────────────── */}
                <div className="space-y-3">
                    {versions.map((ver, index) => {
                        const config = tipoConfig[ver.type];
                        const Icon = config.icon;
                        const isAtual = index === 0;
                        const estaEmAndamento = ver.status === 'em_andamento';
                        const falhou = ver.status === 'falhou';

                        return (
                            <motion.div
                                key={ver.version}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.08 }}
                                className={`
                                    relative rounded-xl border p-4 transition-all duration-300 hover:scale-[1.01]
                                    ${falhou ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : `${config.bg} ${config.glow}`}
                                    ${isAtual ? 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-background' : ''}
                                    ${estaEmAndamento ? 'ring-1 ring-emerald-400/30' : ''}
                                `}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Ícone */}
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${falhou ? 'bg-red-500/20 text-red-400' : config.badgeBg}`}>
                                        {falhou ? <AlertTriangle className="h-5 w-5" /> : estaEmAndamento ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs text-muted-foreground font-semibold tabular-nums">
                                                v{ver.version}
                                            </span>
                                            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                                            <span className="font-semibold text-sm truncate">{ver.name}</span>

                                            <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                                {isAtual && !estaEmAndamento && !falhou && (
                                                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                                                        Atual
                                                    </span>
                                                )}
                                                {estaEmAndamento && (
                                                    <motion.span
                                                        animate={{ opacity: [0.7, 1, 0.7] }}
                                                        transition={{ duration: 1.2, repeat: Infinity }}
                                                        className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30"
                                                    >
                                                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                        Processando
                                                    </motion.span>
                                                )}
                                                {falhou && (
                                                    <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/30">
                                                        <AlertTriangle className="h-2.5 w-2.5" />
                                                        Falhou
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Motivo da falha */}
                                        {falhou && ver.failReason && (
                                            <p className="text-xs text-red-400/80 bg-red-500/10 rounded-md px-2 py-1 border border-red-500/20">
                                                ⚠️ {ver.failReason}
                                            </p>
                                        )}

                                        {/* Keywords */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {ver.keywords.map(kw => (
                                                <span
                                                    key={kw}
                                                    className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-white/5"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${falhou ? 'bg-red-500/20 text-red-400' : config.badgeBg}`}>
                                                {falhou ? '🔧 Correção Pendente' : config.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Rodapé ─────────────────────────────────────── */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center text-xs text-muted-foreground/60 pt-4"
                >
                    Atualizado automaticamente pela Auditoria Contínua
                </motion.p>
            </div>
        </div>
    );
}

// ─── COMPONENTE AUXILIAR ─────────────────────────────────────
function CardResumo({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon?: any }) {
    return (
        <div className={`rounded-2xl border bg-gradient-to-br ${color} p-4 backdrop-blur-md relative group hover:scale-[1.02] transition-all duration-300`}>
            {Icon && <Icon className="absolute top-3 right-3 h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />}
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2">{label}</p>
            <p className="text-2xl font-bold font-display tracking-tight">{value}</p>
        </div>
    );
}
