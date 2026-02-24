import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type OrderStatus = "pending" | "paid" | "failed";

type Order = {
  email: string;
  method: "Pix" | "Cartão";
  value: number;
  status: OrderStatus;
  utmSource: string;
  date: string;
};

function money(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const mockOrders: Order[] = [
  { email: "maria@exemplo.com", method: "Pix", value: 97, status: "paid", utmSource: "ig", date: "2026-02-24 10:12" },
  { email: "joao@exemplo.com", method: "Cartão", value: 97, status: "paid", utmSource: "yt", date: "2026-02-24 09:46" },
  { email: "ana@exemplo.com", method: "Pix", value: 97, status: "pending", utmSource: "tt", date: "2026-02-24 09:12" },
  { email: "bruno@exemplo.com", method: "Cartão", value: 97, status: "failed", utmSource: "direct", date: "2026-02-23 18:05" },
];

export default function AdminOverview() {
  const [methodFilter, setMethodFilter] = useState<"all" | "Pix" | "Cartão">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");

  const orders = useMemo(() => {
    return mockOrders.filter((o) => {
      if (methodFilter !== "all" && o.method !== methodFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (query && !o.email.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [methodFilter, statusFilter, query]);

  const receitaHoje = 194;
  const receitaMes = 2891;
  const totalVendas = 38;
  const ticketMedio = receitaMes / totalVendas;

  const salesByDay = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        day: i + 1,
        value: Math.max(0, Math.round(40 + 30 * Math.sin(i / 4) + (i % 3) * 8)),
      })),
    [],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Desempenho de vendas (mock)</p>
        </div>
        <Badge variant="secondary">MVP</Badge>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Receita Hoje" value={money(receitaHoje)} hint="Últimas 24h" />
        <MetricCard title="Receita do Mês" value={money(receitaMes)} hint="Mês atual" />
        <MetricCard title="Total de Vendas" value={String(totalVendas)} hint="Pagas + pendentes" />
        <MetricCard title="Ticket Médio" value={money(ticketMedio)} hint="Receita / vendas" />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm font-medium">Métricas por método</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MiniStat title="Pix" value="22" />
            <MiniStat title="Cartão" value="16" />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium">Vendas por dia (30 dias)</p>
          <div className="mt-4 grid grid-cols-30 items-end gap-1">
            {salesByDay.map((d) => (
              <div
                key={d.day}
                className="rounded-sm bg-[image:var(--gradient-hero)] opacity-80"
                style={{ height: `${d.value}%` }}
                title={`Dia ${d.day}: ${d.value}`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Visual simples (sem Recharts) para manter leve.</p>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Tabela de Vendas</h2>
            <p className="text-xs text-muted-foreground">Filtros por método, status e e-mail (mock)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por e-mail" className="w-56" />
            <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Cartão">Cartão</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList>
            <TabsTrigger value="orders">Vendas</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-3">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>UTM Source</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.email + o.date}>
                      <TableCell className="font-medium">{o.email}</TableCell>
                      <TableCell>{o.method}</TableCell>
                      <TableCell>{money(o.value)}</TableCell>
                      <TableCell>
                        <StatusPill status={o.status} />
                      </TableCell>
                      <TableCell>{o.utmSource}</TableCell>
                      <TableCell className="text-muted-foreground">{o.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
          <TabsContent value="notes" className="mt-3">
            <Card className="p-4 text-sm text-muted-foreground">
              Quando o backend entrar (fases 2–3), esta tela passa a consumir orders reais e atualiza em tempo real.
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute -right-10 -top-10 size-28 rounded-full bg-[image:var(--gradient-hero)] opacity-15 blur-2xl" />
      <div className="relative">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-2 font-display text-2xl">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </Card>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">Total via {title}</p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    paid: { label: "paid", cls: "bg-[image:var(--gradient-hero)] text-primary-foreground" },
    pending: { label: "pending", cls: "bg-secondary text-secondary-foreground" },
    failed: { label: "failed", cls: "bg-destructive text-destructive-foreground" },
  };

  const v = map[status];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${v.cls}`}>{v.label}</span>;
}
