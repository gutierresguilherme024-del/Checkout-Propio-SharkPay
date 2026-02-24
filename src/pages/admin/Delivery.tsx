import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type EmailProvider = "resend" | "sendgrid" | "smtp";

type LogRow = {
  id: string;
  orderId: string;
  recipient: string;
  status: "sent" | "failed";
  sentAt: string;
};

const defaultHtml = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui; line-height:1.45">
    <h2>Seu produto chegou, {{nome}}!</h2>
    <p>Pagamento confirmado: <b>{{metodo}}</b> • <b>{{valor}}</b></p>
    <p>Order: <code>{{id_order}}</code></p>
    <p>Obrigado,</p>
    <p><b>Checkout Core</b></p>
  </body>
</html>`;

export default function AdminDelivery() {
  const [provider, setProvider] = useState<EmailProvider>("resend");
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("contato@seudominio.com");
  const [fromName, setFromName] = useState("Suporte Checkout Core");
  const [subject, setSubject] = useState("Seu produto chegou! Acesse aqui");
  const [bodyHtml, setBodyHtml] = useState(defaultHtml);
  const [enabled, setEnabled] = useState(true);
  const [pdf, setPdf] = useState<File | null>(null);

  const [testTo, setTestTo] = useState("");

  const [logs, setLogs] = useState<LogRow[]>(() => [
    { id: "log_1", orderId: "ord_123", recipient: "maria@exemplo.com", status: "sent", sentAt: "2026-02-24 10:06" },
    { id: "log_2", orderId: "ord_124", recipient: "ana@exemplo.com", status: "failed", sentAt: "2026-02-24 10:02" },
  ]);

  const canSend = useMemo(() => enabled && Boolean(apiKey) && Boolean(fromEmail), [enabled, apiKey, fromEmail]);

  const renderPreview = useMemo(() => {
    // For preview only: substitute sample variables.
    const sample = {
      nome: "Maria",
      email: "maria@exemplo.com",
      valor: "R$ 97,00",
      metodo: "Pix",
      data: "2026-02-24 10:06",
      id_order: "ord_123",
    };

    const vars: Record<string, string> = sample;
    return Object.entries(vars).reduce((acc, [key, value]) => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      return acc.replace(pattern, value);
    }, bodyHtml);
  }, [bodyHtml]);

  const save = () => {
    toast("Configurações salvas (mock)");
  };

  const sendTest = () => {
    if (!testTo) return toast("Informe um e-mail de destino");
    toast(canSend ? "E-mail de teste enviado (mock)" : "Configuração incompleta (mock)");
    setLogs((l) => [
      {
        id: `log_${Math.random().toString(16).slice(2, 7)}`,
        orderId: "ord_test",
        recipient: testTo,
        status: canSend ? "sent" : "failed",
        sentAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      },
      ...l,
    ]);
  };

  const resend = (row: LogRow) => {
    toast(`Reenvio acionado para ${row.recipient} (mock)`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Entrega de Produto</h1>
          <p className="text-sm text-muted-foreground">Envio automático de PDF por e-mail após paid (fase 3)</p>
        </div>
        <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "ativo" : "inativo"}</Badge>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">Configurações</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ativar entrega</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label>Provedor de e-mail</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as EmailProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="smtp">SMTP personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>API Key do Provedor</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••" />
              <p className="text-xs text-muted-foreground">No MVP, não persistimos nem enviamos (somente UI).</p>
            </div>

            <div className="grid gap-2">
              <Label>E-mail Remetente</Label>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="contato@seudominio.com" />
            </div>

            <div className="grid gap-2">
              <Label>Nome do Remetente</Label>
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Suporte" />
            </div>

            <div className="grid gap-2">
              <Label>Assunto do e-mail</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Corpo do e-mail (HTML)</Label>
              <Textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} className="min-h-48" />
              <p className="text-xs text-muted-foreground">
                Variáveis: {"{{nome}}"}, {"{{email}}"}, {"{{valor}}"}, {"{{metodo}}"}, {"{{data}}"}, {"{{id_order}}"}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Arquivo PDF do Produto</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Selecionado: {pdf?.name ?? "—"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="hero" onClick={save}>Salvar Configurações</Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="soft">Enviar E-mail de Teste</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar e-mail de teste</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2">
                  <Label>E-mail de destino</Label>
                  <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="voce@exemplo.com" />
                </div>
                <DialogFooter>
                  <Button variant="hero" onClick={sendTest}>Enviar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={() => toast("Abra o preview ao lado")}>Visualizar Preview</Button>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold">Preview do e-mail</p>
          <p className="text-xs text-muted-foreground">Renderizado em sandbox (apenas visual)</p>
          <div className="mt-3 overflow-hidden rounded-xl border bg-background">
            <iframe
              title="Email preview"
              sandbox=""
              className="h-[520px] w-full"
              srcDoc={renderPreview}
            />
          </div>
          <div className="mt-3 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Fluxo automático (fase 3)</p>
            <ol className="mt-1 list-decimal pl-4">
              <li>Webhook validado</li>
              <li>Order → paid</li>
              <li>Envio habilitado?</li>
              <li>E-mail com PDF</li>
              <li>Log na order + retries</li>
            </ol>
          </div>
        </Card>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Log de Entregas</h2>
          <p className="text-xs text-muted-foreground">Reenvio manual por linha (mock)</p>
        </div>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatário</TableHead>
                <TableHead>Data/hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.recipient}</TableCell>
                  <TableCell className="text-muted-foreground">{r.sentAt}</TableCell>
                  <TableCell>
                    <span className={r.status === "sent" ? "text-foreground" : "text-destructive"}>{r.status}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.orderId}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="soft" size="sm" onClick={() => resend(r)}>
                      Reenviar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
