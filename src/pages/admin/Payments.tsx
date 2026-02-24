import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AdminPayments() {
  const [stripeActive, setStripeActive] = useState(true);
  const [pushActive, setPushActive] = useState(true);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Pagamentos</h1>
          <p className="text-sm text-muted-foreground">Gateways (Stripe + PushinPay) — UI do MVP</p>
        </div>
        <Badge variant="secondary">sem backend</Badge>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Stripe — Cartão</p>
              <p className="text-xs text-muted-foreground">As chaves devem ficar criptografadas no backend (fase 2)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ativo</span>
              <Switch checked={stripeActive} onCheckedChange={setStripeActive} />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <Field label="Public Key" placeholder="pk_live_..." />
            <Field label="Secret Key" placeholder="sk_live_..." secret />
            <Field label="Webhook Secret" placeholder="whsec_..." secret />
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="hero" onClick={() => toast("Configurações Stripe salvas (mock)")}>Salvar</Button>
            <Button variant="soft" onClick={() => toast("Teste de conexão (mock)")}>Testar</Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">PushinPay — Pix</p>
              <p className="text-xs text-muted-foreground">Pix sempre dinâmico + webhook confirmado (fase 2)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ativo</span>
              <Switch checked={pushActive} onCheckedChange={setPushActive} />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <Field label="API Token" placeholder="pp_..." secret />
            <Field label="Webhook Token" placeholder="ppwh_..." secret />
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="hero" onClick={() => toast("Configurações PushinPay salvas (mock)")}>Salvar</Button>
            <Button variant="soft" onClick={() => toast("Teste de webhook (mock)")}>Testar</Button>
          </div>
        </Card>
      </div>

      <Card className="p-4 text-sm text-muted-foreground">
        Regras de negócio obrigatórias (idempotência, validação de assinatura, liberação só após paid) entram no backend.
      </Card>
    </div>
  );
}

function Field({
  label,
  placeholder,
  secret,
}: {
  label: string;
  placeholder: string;
  secret?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
