import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ImageIcon,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  CreditCard,
  QrCode,
} from "lucide-react";

import { integrationService } from "@/lib/integrations";

// ─── Integrações disponíveis de Pagamento ────────────────────────────────────
const PAYMENT_INTEGRATIONS = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Cartão de crédito e débito com cobertura global.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-full w-full">
        <rect width="40" height="40" rx="10" fill="#635BFF" />
        <text
          x="50%"
          y="55%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fill="white"
          fontFamily="monospace"
        >
          S
        </text>
      </svg>
    ),
    fields: [
      { key: "pubKey", label: "Public Key", placeholder: "pk_live_...", secret: false },
      { key: "secKey", label: "Secret Key", placeholder: "sk_live_...", secret: true },
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_...", secret: true },
    ],
  },
  {
    id: "pushinpay",
    name: "PushinPay",
    description: "Pix dinâmico com confirmação via webhook.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-full w-full">
        <rect width="40" height="40" rx="10" fill="url(#push-grad)" />
        <QrCode
          x={10}
          y={10}
          width={20}
          height={20}
          color="white"
          className="text-white"
        />
        <defs>
          <linearGradient id="push-grad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#5D5FEF" />
            <stop offset="100%" stopColor="#9B5CFA" />
          </linearGradient>
        </defs>
      </svg>
    ),
    fields: [
      { key: "apiToken", label: "API Token", placeholder: "pp_...", secret: true },
      { key: "webhookToken", label: "Webhook Token", placeholder: "ppwh_...", secret: true },
    ],
  },
  {
    id: "mundpay",
    name: "MundPay",
    description: "Automação inteligente de Pix via scraping no checkout oficial MundPay.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-full w-full">
        <rect width="40" height="40" rx="10" fill="#000" />
        <text
          x="50%"
          y="55%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill="white"
          fontFamily="sans-serif"
        >
          MP
        </text>
      </svg>
    ),
    fields: [
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_...", secret: true },
    ],
  },
] as const;

type Integration = (typeof PAYMENT_INTEGRATIONS)[number];

export default function AdminPayments() {
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({
    stripe: true,
    pushinpay: true,
    mundpay: true
  });
  const [configValues, setConfigValues] = useState<Record<string, Record<string, string | number | boolean | null>>>({});
  const [openInteg, setOpenInteg] = useState<Integration["id"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const payments = await integrationService.getSettings('payment');

      const states: Record<string, boolean> = { ...activeStates };
      const values: Record<string, any> = {};

      // 1. Carregar valores do banco
      payments.forEach(item => {
        states[item.id] = item.enabled;
        values[item.id] = item.config;
      });

      // 2. Pre-fill com chaves do .env para o login do dono (Uso Próprio)
      let prefilled = false;
      const stripeSecret = import.meta.env.VITE_STRIPE_SECRET_KEY || "";
      const pushinpayToken = import.meta.env.VITE_PUSHINPAY_TOKEN || "";

      if (!values.stripe || !values.stripe.pubKey) {
        values.stripe = {
          pubKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
          secKey: stripeSecret,
          webhookSecret: import.meta.env.VITE_STRIPE_WEBHOOK_SECRET || ""
        };
        if (values.stripe.pubKey) prefilled = true;
      }

      if (!values.pushinpay || !values.pushinpay.apiToken) {
        const token = pushinpayToken.includes('placeholder') ? "" : pushinpayToken;
        values.pushinpay = {
          apiToken: token,
          webhookToken: ""
        };
        if (token) prefilled = true;
      }

      if (prefilled) {
        console.log("SharkPay: Integrações pré-preenchidas com dados do servidor.");
      }

      // MundPay (Fallback configurado no Agente)
      if (!values.mundpay) {
        values.mundpay = {
          webhookSecret: ""
        };
      }

      setActiveStates(states);
      setConfigValues(values);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = async (id: string) => {
    const integ = PAYMENT_INTEGRATIONS.find(i => i.id === id)!;

    await integrationService.saveSettings({
      id,
      type: 'payment',
      name: integ.name,
      enabled: activeStates[id],
      config: configValues[id] || {}
    });

    toast.success(`Configurações de ${integ.name} salvas!`);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const integ = PAYMENT_INTEGRATIONS.find(i => i.id === id)!;

    // Atualiza estado local
    setActiveStates(prev => ({ ...prev, [id]: enabled }));

    // Salva imediatamente
    await integrationService.saveSettings({
      id,
      type: 'payment',
      name: integ.name,
      enabled: enabled,
      config: configValues[id] || {}
    });

    toast.success(`${integ.name} ${enabled ? 'ativado' : 'desativado'} com sucesso!`);
  };

  const handleTest = async (id: string) => {
    const ok = activeStates[id];
    if (!ok) return toast.error("Ative a integração primeiro.");

    await integrationService.sendToN8N({
      event: 'test_payment_config',
      integration: id,
      config: configValues[id]
    });

    toast.success(`Teste de conexão de ${id} enviado ao n8n!`);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando integrações de pagamento...</div>;

  return (
    <div className="space-y-6">
      {/* ── Regra de design ── */}
      <DesignRuleBanner section="Pagamentos" />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Pagamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gateways e Webhooks de Automação
          </p>
        </div>
      </header>

      {/* ── Cards de integração no estilo da imagem de referência ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Integrações Disponíveis ({PAYMENT_INTEGRATIONS.length})
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAYMENT_INTEGRATIONS.map((integ) => (
            <IntegrationCard
              key={integ.id}
              name={integ.name}
              description={integ.description}
              icon={integ.icon}
              isActive={activeStates[integ.id]}
              onToggle={(enabled) => handleToggle(integ.id, enabled)}
              onIntegrate={() =>
                setOpenInteg((prev) => (prev === integ.id ? null : integ.id))
              }
            />
          ))}
        </div>
      </section>

      {/* ── Painel de configuração expandível ── */}
      {openInteg && (() => {
        const integ = PAYMENT_INTEGRATIONS.find((i) => i.id === openInteg)!;
        return (
          <Card
            key={integ.id}
            className="border border-border/60 bg-card p-5 shadow-sm"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-xl">{integ.icon}</div>
                <div>
                  <p className="text-sm font-semibold">{integ.name} — Configuração</p>
                  <p className="text-xs text-muted-foreground">{integ.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ativo</span>
                <Switch
                  checked={activeStates[integ.id]}
                  onCheckedChange={(v) => setActiveStates(prev => ({ ...prev, [integ.id]: v }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {integ.fields.map((f) => (
                <div key={f.key} className="grid gap-2">
                  <Label>{f.label}</Label>
                  <Input
                    type={f.secret ? "password" : "text"}
                    value={String(configValues[integ.id]?.[f.key] ?? "")}
                    onChange={(e) => setConfigValues(prev => ({
                      ...prev,
                      [integ.id]: { ...(prev[integ.id] || {}), [f.key]: e.target.value }
                    }))}
                    placeholder={f.placeholder}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="hero"
                onClick={() => handleSave(integ.id)}
              >
                Salvar
              </Button>
              <Button
                variant="soft"
                onClick={() => handleTest(integ.id)}
              >
                Testar (n8n)
              </Button>
              <Button
                variant="ghost"
                className="ml-auto"
                onClick={() => setOpenInteg(null)}
              >
                Fechar
              </Button>
            </div>
          </Card>
        );
      })()}

      <Card className="p-4 text-sm text-muted-foreground border border-border/40">
        As chaves inseridas aqui são persistidas e usadas automaticamente pelo Checkout para processar pagamentos reais.
      </Card>
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
  isActive,
  onIntegrate,
  onToggle,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  isActive: boolean;
  onIntegrate: () => void;
  onToggle: (enabled: boolean) => void;
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
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl shadow-sm">{icon}</div>
          <Switch
            checked={isActive}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
        {name === "Stripe" ? (
          (() => {
            const stripeConectado = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
            return (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${stripeConectado
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-destructive/15 text-destructive-foreground"
                  }`}
              >
                {stripeConectado ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {stripeConectado ? "Conectado" : "Não configurado"}
              </span>
            );
          })()
        ) : name === "PushinPay" ? (
          (() => {
            const pushinConectado = isActive || !!import.meta.env.VITE_PUSHINPAY_TOKEN;
            return (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${pushinConectado
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-muted text-muted-foreground"
                  }`}
              >
                {pushinConectado ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {pushinConectado ? "Conectado" : "Pendente"}
              </span>
            );
          })()
        ) : (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isActive
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-muted text-muted-foreground"
              }`}
          >
            {isActive ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {isActive ? "Configurado" : "Pendente"}
          </span>
        )}
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
          border border-border bg-muted/50 px-4 py-2.5
          text-sm font-medium text-foreground
          transition-all duration-150
          hover:bg-muted hover:border-primary/30
          group-hover:text-primary
        "
      >
        <CreditCard className="h-4 w-4" />
        Configurar
        <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Campo de configuração (Removido por que foi embutido no loop principal)
// ────────────────────────────────────────────────────────────────────────────


// ────────────────────────────────────────────────────────────────────────────
// Banner de regra de design
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
