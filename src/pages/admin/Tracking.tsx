import { useMemo, useState, useEffect } from "react";
import { integrationService } from "@/lib/integrations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageIcon, Zap, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";

type EventLog = {
  id: string;
  name: string;
  status: "sent" | "failed";
  createdAt: string;
};

// ─── Integrações disponíveis de Rastreamento ────────────────────────────────
const TRACKING_INTEGRATIONS = [
  {
    id: "utmify",
    name: "UTMify",
    description: "Rastreamento de UTMs, pixels e conversões avançadas.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-full w-full">
        <rect width="40" height="40" rx="10" fill="url(#utm-grad)" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fontWeight="700" fill="white" fontFamily="monospace">UTM</text>
        <defs>
          <linearGradient id="utm-grad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#00C2FF" />
            <stop offset="100%" stopColor="#0047FF" />
          </linearGradient>
        </defs>
      </svg>
    ),
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "utmify_••••••", secret: true },
      { key: "pixelId", label: "Pixel ID", placeholder: "pix_123", secret: false },
    ],
    category: "Rastreamento",
  },
] as const;

export default function AdminTracking() {
  const [apiKey, setApiKey] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [logs, setLogs] = useState<EventLog[]>(() => [
    { id: "evt_1", name: "conversion", status: "sent", createdAt: "2026-02-24 10:01" },
    { id: "evt_2", name: "pageview", status: "sent", createdAt: "2026-02-24 09:58" },
  ]);

  // Carregar configurações reais
  useEffect(() => {
    async function load() {
      const configs = await integrationService.getSettings('tracking');
      const utmify = configs.find(c => c.id === 'utmify');
      if (utmify) {
        setApiKey(utmify.config.apiKey || "");
        setPixelId(utmify.config.pixelId || "");
        setEnabled(utmify.enabled);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const connection = useMemo(() => {
    if (!enabled) return { label: "Inativo", tone: "secondary" as const };
    if (apiKey && pixelId) return { label: "Conectado", tone: "default" as const };
    return { label: "Configuração incompleta", tone: "secondary" as const };
  }, [enabled, apiKey, pixelId]);

  const isConnected = connection.label === "Conectado";

  const handleSave = async () => {
    await integrationService.saveSettings({
      id: 'utmify',
      type: 'tracking',
      name: 'UTMify',
      enabled,
      config: { apiKey, pixelId }
    });
    toast.success("Configurações do UTMify salvas com sucesso!");
  };

  const testEvent = async () => {
    const ok = Boolean(apiKey && pixelId && enabled);
    const row: EventLog = {
      id: `evt_${Math.random().toString(16).slice(2, 7)}`,
      name: "test_event",
      status: ok ? "sent" : "failed",
      createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    if (ok) {
      await integrationService.sendToN8N({ event: 'test_tracking', apiKey, pixelId });
    }

    setLogs((l) => [row, ...l].slice(0, 10));
    toast(ok ? "Evento de teste enviado com sucesso!" : "Falha: Verifique se as chaves estão preenchidas.");
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando integrações...</div>;

  return (
    <div className="space-y-6">
      {/* ── Regra de design ── */}
      <DesignRuleBanner section="Rastreamento" />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Rastreamento</h1>
          <p className="text-sm text-muted-foreground">
            Integrações de rastreamento disponíveis no projeto
          </p>
        </div>
      </header>

      {/* ── Cards de integrações no estilo da imagem de referência ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Rastreamento (1)
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKING_INTEGRATIONS.map((integ) => (
            <IntegrationCard
              key={integ.id}
              name={integ.name}
              description={integ.description}
              icon={integ.icon}
              isConnected={isConnected && enabled}
              onIntegrate={() => setConfigOpen(true)}
            />
          ))}
        </div>
      </section>

      {/* ── Painel de configuração (expandível) ── */}
      {configOpen && (
        <Card className="border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-hero)] shadow-[var(--shadow-glow)]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">UTMify — Configuração</p>
                <p className="text-xs text-muted-foreground">Rastreamento de pixels e UTMs</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ativo</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="utmify_••••••"
              />
              <p className="text-xs text-muted-foreground">Chave de autenticação do UTMify.</p>
            </div>
            <div className="grid gap-2">
              <Label>Pixel ID</Label>
              <Input
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="pix_123"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="hero" onClick={handleSave}>
              Salvar Configurações
            </Button>
            <Button variant="soft" onClick={testEvent}>
              Testar Evento (n8n)
            </Button>
            <Button
              variant="ghost"
              className="ml-auto"
              onClick={() => setConfigOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </Card>
      )}


      {/* ── Log de eventos ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Log dos últimos eventos</h2>
          <p className="text-xs text-muted-foreground">Últimos 10 envios (mock)</p>
        </div>
        <Card className="overflow-hidden border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.id}</TableCell>
                  <TableCell>{l.name}</TableCell>
                  <TableCell>
                    <span
                      className={
                        l.status === "sent" ? "text-emerald-500" : "text-destructive"
                      }
                    >
                      {l.status === "sent" ? "✓ enviado" : "✗ falhou"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4 text-sm text-muted-foreground border border-border/40">
          Captura automática de UTMs no checkout público já está ativa: utm_source, utm_medium,
          utm_campaign, utm_content, utm_term.
        </Card>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Componente: card de integração (baseado no design da imagem de referência)
// ────────────────────────────────────────────────────────────────────────────
function IntegrationCard({
  name,
  description,
  icon,
  isConnected,
  onIntegrate,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  onIntegrate: () => void;
}) {
  return (
    <div
      className="
        group flex flex-col gap-3 rounded-2xl border border-border/60
        bg-card p-5 shadow-sm transition-all duration-200
        hover:border-primary/40 hover:shadow-[var(--shadow-glow)]
      "
    >
      {/* Logo */}
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 overflow-hidden rounded-xl shadow-sm">{icon}</div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isConnected
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-muted text-muted-foreground"
            }`}
        >
          {isConnected ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {isConnected ? `Integrações: 1` : `Integrações: 0`}
        </span>
      </div>

      {/* Name & description */}
      <div>
        <p className="font-semibold">{name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>

      {/* Botão Integrar */}
      <button
        onClick={onIntegrate}
        className="
          mt-auto flex w-full items-center justify-center gap-2 rounded-xl
          border border-white/10 bg-[hsl(222,28%,12%)] px-4 py-2.5
          text-sm font-medium text-foreground
          transition-all duration-150
          hover:bg-[hsl(222,28%,16%)] hover:border-primary/30
          dark:bg-[hsl(222,28%,10%)] dark:hover:bg-[hsl(222,28%,14%)]
          group-hover:text-primary
        "
      >
        <Zap className="h-4 w-4" />
        Integrar
        <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Componente: banner que exibe a regra de design visível
// ────────────────────────────────────────────────────────────────────────────
function DesignRuleBanner({ section }: { section: string }) {
  return (
    <div
      className="
        flex items-start gap-3 rounded-xl border border-primary/25
        bg-primary/5 px-4 py-3 text-sm
      "
    >
      <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <span className="font-semibold text-primary">Regra de design ativa — {section}</span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O layout dos botões de integração desta seção segue o padrão visual definido em{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            front-integrassoes/integraçoes.png
          </code>
          : cards com logo, badge de status e botão escuro "Integrar".
          Apenas as integrações disponíveis na lógica do projeto são exibidas.
        </p>
      </div>
    </div>
  );
}
