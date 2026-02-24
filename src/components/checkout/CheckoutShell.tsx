import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { CheckoutSettings, PaymentMethod } from "./types";

function formatMoneyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function useCountdown(minutes: number, enabled: boolean) {
  const initial = minutes * 60;
  const [seconds, setSeconds] = useState(initial);

  useEffect(() => {
    if (!enabled) return;
    setSeconds(initial);
    const t = window.setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [enabled, initial]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return { mm, ss, done: enabled && seconds === 0 };
}

export type CheckoutShellProps = {
  settings: CheckoutSettings;
  mode?: "public" | "preview";
  onCaptureUtm?: (utms: Record<string, string>) => void;
};

export function CheckoutShell({ settings, mode = "public", onCaptureUtm }: CheckoutShellProps) {
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);

  const amount = 97;
  const countdown = useCountdown(settings.timerDurationMinutes, settings.timerEnabled);

  const brandStyle = useMemo(() => {
    // HSL: keep saturation/contrast consistent, only hue changes.
    const h = settings.primaryHue;
    return {
      "--brand": `${h} 95% 48%`,
      "--brand-2": `${(h + 24) % 360} 95% 56%`,
      "--brand-ink": `${h} 92% 12%`,
    } as React.CSSProperties;
  }, [settings.primaryHue]);

  useEffect(() => {
    if (mode !== "public") return;
    const params = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const utms: Record<string, string> = {};
    for (const k of keys) {
      const v = params.get(k);
      if (v) utms[k] = v;
    }
    if (Object.keys(utms).length) {
      sessionStorage.setItem("checkoutcore:utms", JSON.stringify(utms));
      onCaptureUtm?.(utms);
    }
  }, [mode, onCaptureUtm]);

  const onPay = () => {
    // MVP UI-only: no gateway calls yet.
    // In fase 2, este botão cria a order e inicia o gateway.
    // eslint-disable-next-line no-alert
    alert(
      `MVP (UI):\n\nNome: ${name || "—"}\nEmail: ${email || "—"}\nMétodo: ${method}\nValor: ${formatMoneyBRL(amount)}`,
    );
  };

  return (
    <div
      style={brandStyle}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-elev)]",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[image:var(--gradient-surface)] before:opacity-70",
      )}
    >
      <div className="relative">
        {(settings.urgencyBarText || settings.timerEnabled) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-[image:var(--gradient-hero)] px-4 py-3 text-primary-foreground">
            <p className="text-xs font-medium tracking-wide">{settings.urgencyBarText}</p>
            {settings.timerEnabled && (
              <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs">
                <span className="opacity-80">Expira em</span>
                <span className="font-semibold tabular-nums">{countdown.mm}:{countdown.ss}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 p-5 md:grid-cols-[1.15fr_0.85fr] md:p-8">
          <div className="space-y-4">
            <header className="space-y-2">
              <h1 className="text-balance font-display text-3xl leading-tight md:text-4xl">{settings.headline}</h1>
              <p className="text-pretty text-sm text-muted-foreground md:text-base">{settings.subheadline}</p>
            </header>

            {settings.socialProofEnabled && (
              <div className="rounded-xl border bg-background/60 p-3 text-sm shadow-sm">
                <p className="font-medium">Prova social</p>
                <p className="text-muted-foreground">{settings.socialProofText}</p>
              </div>
            )}

            <div className="rounded-xl border bg-background/60 p-3 text-sm shadow-sm">
              <p className="font-medium">O que você recebe</p>
              <ul className="mt-2 grid gap-2 text-muted-foreground">
                <li>• PDF do produto digital (entrega automática)</li>
                <li>• Acesso imediato após confirmação</li>
                <li>• Suporte por e-mail</li>
              </ul>
            </div>
          </div>

          <Card className="relative overflow-hidden border bg-background/70 p-4 shadow-sm">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-[image:var(--gradient-hero)] opacity-20 blur-2xl" />

            <div className="relative space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-display text-3xl">{formatMoneyBRL(amount)}</p>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Método de pagamento</Label>
                <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="grid gap-2">
                  <label className="flex items-center gap-3 rounded-lg border bg-background/70 px-3 py-2">
                    <RadioGroupItem value="pix" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Pix</p>
                      <p className="text-xs text-muted-foreground">QR Code + copia e cola</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border bg-background/70 px-3 py-2">
                    <RadioGroupItem value="card" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Cartão</p>
                      <p className="text-xs text-muted-foreground">Stripe Elements (fase 2)</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {method === "pix" ? (
                <div className="rounded-xl border bg-background/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Aguardando pagamento</p>
                      <p className="text-xs text-muted-foreground">Pix é gerado dinamicamente (fase 2)</p>
                    </div>
                    <div className="grid size-16 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">QR</div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs">Código copia e cola</Label>
                    <div className="mt-1 rounded-lg border bg-muted p-2 font-mono text-xs text-muted-foreground">
                      00020126...MVP
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border bg-background/70 p-3">
                  <p className="text-sm font-medium">Cartão (mock)</p>
                  <p className="text-xs text-muted-foreground">Na fase 2, aqui entra o Stripe Elements.</p>
                  <div className="mt-3 grid gap-2">
                    <Input placeholder="Número do cartão" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Validade" />
                      <Input placeholder="CVV" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Receber comunicações</p>
                  <p className="text-xs text-muted-foreground">Atualizações e suporte do produto</p>
                </div>
                <Switch checked={consent} onCheckedChange={setConsent} />
              </div>

              <Button variant="hero" className="w-full" onClick={onPay}>
                Finalizar pagamento
              </Button>

              <p className="text-center text-xs text-muted-foreground">{settings.guaranteeText}</p>
            </div>
          </Card>
        </div>

        {settings.floatingMessageEnabled && (
          <div className="pointer-events-none absolute bottom-4 left-4 hidden md:block">
            <div className="animate-float rounded-full border bg-background/80 px-4 py-2 text-xs shadow-sm backdrop-blur">
              {settings.floatingMessageText}
            </div>
          </div>
        )}

        {countdown.done && settings.timerEnabled && (
          <div className="absolute inset-x-0 bottom-0 border-t bg-destructive/10 px-4 py-3 text-center text-xs text-destructive">
            O temporizador terminou (MVP). Na produção, a oferta pode ser encerrada automaticamente.
          </div>
        )}
      </div>
    </div>
  );
}
