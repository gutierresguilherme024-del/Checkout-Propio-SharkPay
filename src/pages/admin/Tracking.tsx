import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type EventLog = {
  id: string;
  name: string;
  status: "sent" | "failed";
  createdAt: string;
};

export default function AdminTracking() {
  const [apiKey, setApiKey] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [enabled, setEnabled] = useState(true);

  const [logs, setLogs] = useState<EventLog[]>(() => [
    { id: "evt_1", name: "conversion", status: "sent", createdAt: "2026-02-24 10:01" },
    { id: "evt_2", name: "pageview", status: "sent", createdAt: "2026-02-24 09:58" },
  ]);

  const connection = useMemo(() => {
    if (!enabled) return { label: "inativo", tone: "secondary" as const };
    if (apiKey && pixelId) return { label: "conectado", tone: "default" as const };
    return { label: "configuração incompleta", tone: "secondary" as const };
  }, [enabled, apiKey, pixelId]);

  const testEvent = () => {
    const ok = Boolean(apiKey && pixelId && enabled);
    const row: EventLog = {
      id: `evt_${Math.random().toString(16).slice(2, 7)}`,
      name: "test_event",
      status: ok ? "sent" : "failed",
      createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };
    setLogs((l) => [row, ...l].slice(0, 10));
    toast(ok ? "Evento de teste enviado (mock)" : "Falha ao enviar (mock)");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Rastreamento</h1>
          <p className="text-sm text-muted-foreground">Configuração e monitoramento UTMify (mock)</p>
        </div>
        <Badge variant={connection.tone}>{connection.label}</Badge>
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">Configuração</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ativo</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••" />
            <p className="text-xs text-muted-foreground">No MVP, fica somente no front-end.</p>
          </div>
          <div className="grid gap-2">
            <Label>Pixel ID</Label>
            <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="pix_123" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="hero" onClick={testEvent}>Testar Evento</Button>
          <Button variant="soft" onClick={() => toast("Configurações salvas (mock)")}>Salvar Configurações</Button>
        </div>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Log dos últimos eventos</h2>
          <p className="text-xs text-muted-foreground">Últimos 10 envios (mock)</p>
        </div>
        <Card className="overflow-hidden">
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
                    <span className={l.status === "sent" ? "text-foreground" : "text-destructive"}>{l.status}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4 text-sm text-muted-foreground">
          Captura automática de UTMs no checkout público já está ativa: utm_source, utm_medium, utm_campaign, utm_content, utm_term.
        </Card>
      </section>
    </div>
  );
}
