import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { Loader2, RefreshCcw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type OrderStatus = "pendente" | "pago" | "falhou" | "bloqueado_fraude" | "cancelado";

type Order = {
  id: string;
  email_comprador?: string;
  nome_comprador?: string;
  metodo_pagamento?: string;
  email?: string;
  nome?: string;
  metodo?: string;
  valor: number;
  status: OrderStatus;
  created_at?: string;
  criado_em?: string;
  pago_em?: string;
  utm_source?: string;
  gateway?: string;
};

type Log = {
  id: string;
  tipo: 'webhook' | 'gateway' | 'audit' | 'debug';
  gateway?: string;
  evento?: string;
  pedido_id?: string;
  mensagem: string;
  payload?: any;
  sucesso: boolean;
  criado_em: string;
};

// Helpers para acessar dados com fallback
function getEmail(o: Order) { return o.email_comprador || o.email || ''; }
function getNome(o: Order) { return o.nome_comprador || o.nome || 'Cliente'; }
function getMetodo(o: Order) { return (o.metodo_pagamento || o.metodo || 'desconhecido') as string; }
function getCreatedAt(o: Order) { return o.created_at || o.criado_em || new Date().toISOString(); }

function money(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function AdminOverview() {
  const [methodFilter, setMethodFilter] = useState<"all" | "pix" | "cartao">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setRealOrders(data || []);
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
      toast.error("Falha ao carregar dados reais do Supabase");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('logs_sistema')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchLogs();

    const ordersChannel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchOrders();
      })
      .subscribe();

    const logsChannel = supabase
      .channel('logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs_sistema' }, (payload) => {
        setLogs(prev => [payload.new as Log, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(logsChannel);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    return realOrders.filter((o) => {
      const metodoVal = getMetodo(o);
      const isPix = metodoVal === 'pix' || metodoVal.includes('pix');
      const isCartao = metodoVal === 'card' || metodoVal === 'cartao' || metodoVal.includes('card');
      if (methodFilter === 'pix' && !isPix) return false;
      if (methodFilter === 'cartao' && !isCartao) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      const emailVal = getEmail(o).toLowerCase();
      const nomeVal = getNome(o).toLowerCase();
      if (query && !emailVal.includes(query.toLowerCase()) && !nomeVal.includes(query.toLowerCase())) return false;
      return true;
    });
  }, [realOrders, methodFilter, statusFilter, query]);

  const stats = useMemo(() => {
    const agora = new Date();
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);

    const isPago = (s: string) => ['pago', 'paid', 'approved', 'succeeded', 'aprovado'].includes(s?.toLowerCase());

    const pagos = realOrders.filter(o => isPago(o.status));
    const receitaTotal = pagos.reduce((acc, o) => acc + Number(o.valor), 0);

    const receitaHoje = pagos
      .filter(o => {
        const dataStr = o.pago_em || o.criado_em || o.created_at;
        if (!dataStr) return false;
        const dataPagamento = new Date(dataStr);
        return dataPagamento >= hojeInicio;
      })
      .reduce((acc, o) => acc + Number(o.valor), 0);

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const receitaMes = pagos
      .filter(o => {
        const dataStr = o.pago_em || o.criado_em || o.created_at;
        if (!dataStr) return false;
        return new Date(dataStr) >= inicioMes;
      })
      .reduce((acc, o) => acc + Number(o.valor), 0);

    const pixCount = pagos.filter(o => {
      const m = (o.metodo_pagamento || o.metodo || '').toLowerCase();
      return m === 'pix' || m.includes('pix');
    }).length;

    const cartaoCount = pagos.filter(o => {
      const m = (o.metodo_pagamento || o.metodo || '').toLowerCase();
      return ['card', 'cartao', 'credit_card'].some(k => m.includes(k));
    }).length;

    return {
      receitaHoje,
      receitaMes,
      totalVendas: pagos.length,
      ticketMedio: pagos.length > 0 ? receitaTotal / pagos.length : 0,
      pixCount,
      cartaoCount,
      receitaTotal
    };
  }, [realOrders]);

  const salesByDay = useMemo(() => {
    const days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      d.setHours(0, 0, 0, 0);
      return { date: d, display: d.getDate(), value: 0 };
    });
    realOrders.filter(o => o.status === 'pago' && o.pago_em).forEach(o => {
      const orderDate = new Date(o.pago_em!);
      orderDate.setHours(0, 0, 0, 0);
      const dayIndex = days.findIndex(d => d.date.getTime() === orderDate.getTime());
      if (dayIndex !== -1) days[dayIndex].value += Number(o.valor);
    });
    const maxValue = Math.max(...days.map(d => d.value), 1);
    return days.map(d => ({ ...d, percent: (d.value / maxValue) * 100 }));
  }, [realOrders]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-3 rounded-2xl border border-primary/10">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl">Dashboard de Vendas</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Monitorando dados reais do Supabase em tempo real
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchOrders(); fetchLogs(); }} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Sincronizar
          </Button>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">PRODUÇÃO</Badge>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Receita Hoje" value={money(stats.receitaHoje)} hint="Últimas 24h" />
        <MetricCard title="Receita do Mês" value={money(stats.receitaMes)} hint="Mês atual" />
        <MetricCard title="Vendas Pagas" value={String(stats.totalVendas)} hint="Transações aprovadas" />
        <MetricCard title="Ticket Médio" value={money(stats.ticketMedio)} hint="Receita / vendas" />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="p-4 border-border bg-card/50 backdrop-blur-xl">
          <p className="text-sm font-medium mb-4">Métricas por método (Vendas Pagas)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat title="Pix" value={String(stats.pixCount)} color="text-emerald-400" />
            <MiniStat title="Cartão" value={String(stats.cartaoCount)} color="text-cyan-400" />
          </div>
        </Card>
        <Card className="p-4 border-white/5 bg-slate-900/50 backdrop-blur-xl">
          <p className="text-sm font-medium mb-4">Volume Financeiro (Últimos 30 dias)</p>
          <div className="h-[80px] flex items-end gap-1 px-1">
            {salesByDay.map((d, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/40 to-primary transition-all duration-500"
                style={{ height: `${Math.max(d.percent, 5)}%` }}
                title={`Dia ${d.display}: ${money(d.value)}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[10px] text-muted-foreground">30 dias atrás</span>
            <span className="text-[10px] text-muted-foreground">Hoje</span>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Listagem de Dados</h2>
            <p className="text-xs text-muted-foreground">Histórico de pedidos e logs técnicos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E-mail ou Nome"
              className="w-56 bg-card/50 border-border"
            />
            <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as any)}>
              <SelectTrigger className="w-32 bg-card/50 border-border">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-white/10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="falhou">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="bg-card/50 border-border">
            <TabsTrigger value="orders">Transações</TabsTrigger>
            <TabsTrigger value="logs">Logs do Sistema</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-3">
            <Card className="overflow-hidden border-border bg-card/50">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && realOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center">Carregando...</TableCell></TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhum pedido.</TableCell></TableRow>
                    ) : (
                      filteredOrders.map((o) => (
                        <TableRow key={o.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{getNome(o)}</span>
                              <span className="text-xs text-muted-foreground">{getEmail(o)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{getMetodo(o)}</TableCell>
                          <TableCell className="font-medium">{money(o.valor)}</TableCell>
                          <TableCell><StatusPill status={o.status} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(getCreatedAt(o)).toLocaleString('pt-BR')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="logs" className="mt-3">
            <Card className="overflow-hidden border-border bg-card/50">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow>
                      <TableHead className="w-[180px]">Data</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs && logs.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center">Carregando logs...</TableCell></TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum log.</TableCell></TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-xs font-mono text-muted-foreground">{new Date(log.criado_em).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-bold uppercase ${log.tipo === 'webhook' ? 'text-indigo-400 bg-indigo-500/10' :
                              log.tipo === 'gateway' ? 'text-emerald-400 bg-emerald-500/10' :
                                'text-slate-400 bg-slate-500/10'
                              }`}>
                              {log.evento || log.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium capitalize">{log.gateway || '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-primary/70">{log.pedido_id || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[300px] truncate" title={log.mensagem}>{log.mensagem}</TableCell>
                          <TableCell className="text-right">
                            <span className={`w-2 h-2 rounded-full inline-block ${log.sucesso ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="relative overflow-hidden p-4 border-border bg-card/50 backdrop-blur-xl">
      <div className="absolute -right-10 -top-10 size-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-2 font-display text-2xl text-foreground font-bold">{value}</p>
        <p className="mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{hint}</p>
      </div>
    </Card>
  );
}

function MiniStat({ title, value, color }: { title: string; value: string, color: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">Total via {title}</p>
      <p className={`mt-1 font-display text-xl ${color}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const map: Record<string, { label: string; cls: string }> = {
    pago: { label: "Aprovado", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    pendente: { label: "Pendente", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    falhou: { label: "Falhou", cls: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
    bloqueado_fraude: { label: "Fraude", cls: "bg-red-800/20 text-red-400 border-red-800/30" },
    cancelado: { label: "Cancelado", cls: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  };
  const v = map[status] || { label: status, cls: "bg-slate-500/20 text-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${v.cls}`}>
      {v.label}
    </span>
  );
}
