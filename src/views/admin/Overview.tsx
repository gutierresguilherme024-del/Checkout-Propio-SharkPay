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
  // Campos reais do Supabase
  email_comprador?: string;
  nome_comprador?: string;
  metodo_pagamento?: string;
  // Aliases legados
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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('user_id', user.id)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setRealOrders(data || []);
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Falha ao carregar dados reais do Supabase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Inscrição em tempo real para novos pedidos
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  // Cálculos de Métricas Reais
  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const pagos = realOrders.filter(o => o.status === 'pago');
    const receitaTotal = pagos.reduce((acc, o) => acc + Number(o.valor), 0);

    const receitaHoje = pagos
      .filter(o => o.pago_em && new Date(o.pago_em) >= hoje)
      .reduce((acc, o) => acc + Number(o.valor), 0);

    const receitaMes = pagos
      .filter(o => o.pago_em && new Date(o.pago_em) >= inicioMes)
      .reduce((acc, o) => acc + Number(o.valor), 0);

    const pixCount = pagos.filter(o => getMetodo(o) === 'pix').length;
    const cartaoCount = pagos.filter(o => ['card', 'cartao'].includes(getMetodo(o))).length;

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

  // Vendas por dia nos últimos 30 dias
  const salesByDay = useMemo(() => {
    const days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      d.setHours(0, 0, 0, 0);
      return {
        date: d,
        display: d.getDate(),
        value: 0
      };
    });

    realOrders.filter(o => o.status === 'pago' && o.pago_em).forEach(o => {
      const orderDate = new Date(o.pago_em!);
      orderDate.setHours(0, 0, 0, 0);
      const dayIndex = days.findIndex(d => d.date.getTime() === orderDate.getTime());
      if (dayIndex !== -1) {
        days[dayIndex].value += Number(o.valor);
      }
    });

    const maxValue = Math.max(...days.map(d => d.value), 1);
    return days.map(d => ({
      ...d,
      percent: (d.value / maxValue) * 100
    }));
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
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading} className="gap-2">
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
            <h2 className="text-base font-semibold">Tabela de Pedidos</h2>
            <p className="text-xs text-muted-foreground">Listagem completa em tempo real</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E-mail ou Nome"
              className="w-56 bg-card/50 border-border"
            />
            <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as "all" | "pix" | "cartao")}>
              <SelectTrigger className="w-32 bg-card/50 border-border">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | OrderStatus)}>
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
              {loading && realOrders.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Conectando ao Supabase...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground">
                  Nenhum pedido encontrado.
                </div>
              ) : (
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
                      {filteredOrders.map((o) => (
                        <TableRow key={o.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{getNome(o)}</span>
                              <span className="text-xs text-muted-foreground">{getEmail(o)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{getMetodo(o)}</TableCell>
                          <TableCell className="font-medium">{money(o.valor)}</TableCell>
                          <TableCell>
                            <StatusPill status={o.status} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(getCreatedAt(o)).toLocaleString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
          <TabsContent value="logs" className="mt-3">
            <Card className="p-8 text-center text-sm text-muted-foreground border-white/5 bg-slate-900/50">
              Os webhooks e logs de auditoria serão exibidos aqui em breve.
              O sistema já está registrando transações em tempo real.
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
