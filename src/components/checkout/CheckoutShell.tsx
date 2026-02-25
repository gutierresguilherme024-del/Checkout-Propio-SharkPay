import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { integrationService } from "@/lib/integrations";
import { toast } from "sonner";
import { useIntegrations } from "@/hooks/use-integrations";
import { criarPix } from "@/lib/pushinpay";
import type { CheckoutSettings, PaymentMethod } from "./types";

/* ─── formatters ─────────────────────────────────────── */
function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

/* ─── countdown hook ─────────────────────────────────── */
function useCountdown(minutes: number, enabled: boolean) {
  const initial = minutes * 60;
  const [sec, setSec] = useState(initial);
  useEffect(() => {
    if (!enabled) return;
    setSec(initial);
    const t = window.setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [enabled, initial]);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return { mm, ss, done: enabled && sec === 0 };
}

/* ─── mini SVG icons ─────────────────────────────────── */
const Ico = {
  Lock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Shield: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  Check: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  ),
  Clock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  Copy: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Close: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Pix: () => (
    <svg width="18" height="18" viewBox="0 0 512 512" fill="#32BCAD">
      <path d="M112.57 391.19c20.056 0 38.928-7.808 53.12-22l76.693-76.692c5.344-5.345 14.667-5.337 20 0l76.992 76.992c14.192 14.192 33.064 22 53.12 22h15.232l-97.28 97.28c-29.992 29.992-78.6 29.992-108.6 0l-97.6-97.6 8.323.02zM112.57 120.81h-8.32l97.6-97.6c29.992-29.992 78.6-29.992 108.6 0l97.28 97.28h-15.232c-20.056 0-38.928 7.808-53.12 22l-76.992 76.992c-5.497 5.497-14.503 5.497-20 0L165.69 142.81c-14.192-14.192-33.064-22-53.12-22z" />
      <path d="M22.81 198.61l55.68-55.68h33.08c13.568 0 26.496 5.344 36.064 14.928l76.688 76.688c14.56 14.56 39.64 14.56 54.2 0l76.992-76.992c9.568-9.568 22.48-14.912 36.048-14.912h41.792l55.84 55.84c29.992 29.992 29.992 78.6 0 108.6l-55.84 55.84h-41.792c-13.568 0-26.48-5.344-36.048-14.912l-76.992-76.992c-7.28-7.28-16.84-10.92-26.4-10.92s-19.12 3.64-26.4 10.92l-76.688 76.688c-9.568 9.568-22.496 14.928-36.064 14.928H78.49L22.81 307.21c-29.992-29.992-29.992-78.608 0-108.6z" />
    </svg>
  ),
  Card: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <rect x="5" y="14" width="4" height="2" rx="0.5" fill="currentColor" stroke="none" opacity=".5" />
    </svg>
  ),
};

/* ─── PIX QR Modal ──────────────────────────────────── */
const MOCK_PIX = "00020126580014BR.GOV.BCB.PIX0136e464f9b4-5e73-4a81-a88d-98c76e39c52352040000530398654071234.565802BR5924SharkPay Checkout Dev60145302BR62070503***63047A8F";

function PixModal({
  amount,
  onClose,
  qrCode,
  qrCodeText,
  expiresAt
}: {
  amount: number;
  onClose: () => void;
  qrCode?: string;
  qrCodeText?: string;
  expiresAt?: string;
}) {
  const [copied, setCopied] = useState(false);
  const pixValue = qrCodeText || MOCK_PIX;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  const doCopy = async () => {
    try { await navigator.clipboard.writeText(pixValue); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="pix-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal>
      <div className="pix-panel">
        {/* header */}
        <div className="pix-panel-hd">
          <span className="pix-panel-title">
            <span className="pix-dot" />
            Pagamento via Pix
          </span>
          <button onClick={onClose} className="pix-close" aria-label="Fechar"><Ico.Close /></button>
        </div>

        {/* amount */}
        <div className="pix-amount-row">
          <span>Valor a pagar</span>
          <strong>{fmtBRL(amount)}</strong>
        </div>

        {/* QR */}
        <div className="pix-qr-wrap">
          <div className="pix-qr-box">
            {qrCode ? (
              <img src={`data:image/png;base64,${qrCode}`} className="w-full h-full object-contain" alt="QR Code Pix" />
            ) : (
              <svg width="148" height="148" viewBox="0 0 148 148" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Finder pattern TL */}
                <rect x="8" y="8" width="42" height="42" rx="5" fill="currentColor" />
                <rect x="14" y="14" width="30" height="30" rx="3" fill="white" />
                <rect x="20" y="20" width="18" height="18" rx="1.5" fill="currentColor" />
                {/* Finder pattern TR */}
                <rect x="98" y="8" width="42" height="42" rx="5" fill="currentColor" />
                <rect x="104" y="14" width="30" height="30" rx="3" fill="white" />
                <rect x="110" y="20" width="18" height="18" rx="1.5" fill="currentColor" />
                {/* Finder pattern BL */}
                <rect x="8" y="98" width="42" height="42" rx="5" fill="currentColor" />
                <rect x="14" y="104" width="30" height="30" rx="3" fill="white" />
                <rect x="20" y="110" width="18" height="18" rx="1.5" fill="currentColor" />
                {/* Data modules */}
                {[60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135].flatMap((x, i) =>
                  [8, 13, 18, 23, 28, 33, 38, 43, 48, 55].map((y, j) =>
                    (i + j) % 3 !== 0 ? <rect key={`${i}-${j}`} x={x} y={y} width="4" height="4" rx="0.8" fill="currentColor" opacity={(i * j) % 5 === 0 ? 0.3 : 1} /> : null
                  )
                )}
                {[8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86, 92, 98, 104, 110, 116, 122, 128].flatMap((y, i) =>
                  [60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135].map((x, j) =>
                    (i + j) % 4 !== 1 ? <rect key={`d-${i}-${j}`} x={x} y={y} width="4" height="4" rx="0.8" fill="currentColor" opacity={(i + j) % 7 === 0 ? 0.2 : 0.85} /> : null
                  )
                )}
                {/* center logo */}
                <rect x="56" y="56" width="36" height="36" rx="6" fill="white" />
                <text x="74" y="79" textAnchor="middle" fill="#32BCAD" fontSize="13" fontWeight="800" fontFamily="system-ui">PIX</text>
              </svg>
            )}
          </div>
          <p className="pix-qr-hint">Escaneie com o app do seu banco</p>
        </div>

        {/* steps */}
        <ol className="pix-steps">
          {["Abra o app do seu banco", "Selecione Pix → Pagar", "Escaneie ou use o código abaixo"].map((s, i) => (
            <li key={i}><span className="pix-step-n">{i + 1}</span>{s}</li>
          ))}
        </ol>

        {/* copy */}
        <div className="pix-copy-block">
          <div className="pix-copy-label">Pix copia e cola</div>
          <div className="pix-copy-row">
            <code className="pix-copy-code">{pixValue.slice(0, 42)}…</code>
            <button onClick={doCopy} className={cn("pix-copy-btn", copied && "pix-copy-btn--ok")}>
              {copied ? <Ico.Check /> : <Ico.Copy />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>

        {/* expiry */}
        <div className="pix-expiry">
          <Ico.Clock />
          QR expira em <strong>{expiresAt ? new Date(expiresAt).toLocaleTimeString() : '30 minutos'}</strong>
        </div>

        {/* footer */}
        <div className="pix-panel-ft">
          <Ico.Shield />
          Transação processada com segurança pelo SharkPay
        </div>
      </div>
    </div>
  );
}

/* ─── Card brand badges ───────────────────────────────── */
function Brands() {
  return (
    <div className="sco-brands">
      {[["VISA", "#1a1f71", "#fff"], ["MC", "#eb001b", "#fff"], ["ELO", "#ffcb05", "#000"], ["AMEX", "#016fd0", "#fff"]].map(([n, bg, c]) => (
        <span key={n} className="sco-brand" style={{ background: bg, color: c }}>{n}</span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */

export type CheckoutShellProps = {
  settings: CheckoutSettings;
  product?: {
    name: string;
    price: number;
    delivery_content: string;
  } | null;
  mode?: "public" | "preview";
  onCaptureUtm?: (u: Record<string, string>) => void;
  onPaySuccess?: (data: any) => void;
};

export function CheckoutShell({
  settings,
  product,
  mode = "public",
  onCaptureUtm,
  onPaySuccess
}: CheckoutShellProps) {
  /* integration status */
  const { payments, tracking, getStatus, loading } = useIntegrations();

  const isStripeActive = useMemo(() => getStatus(payments, 'stripe') === 'active', [payments, getStatus]);
  const isPushinPayActive = useMemo(() => {
    return getStatus(payments, 'pushinpay') === 'active' || !!import.meta.env.VITE_PUSHINPAY_TOKEN;
  }, [payments, getStatus]);

  const [isGeneratingPix, setIsGeneratingPix] = useState(false);

  /* product display data */
  const displayProduct = useMemo(() => {
    if (product) return product;

    // Fallback apenas para preview do editor se nenhum produto for passado
    return {
      name: settings.headline || "Produto SharkPay",
      price: 97,
      delivery_content: "Obrigado por sua compra!"
    };
  }, [product, settings.headline]);

  /* state */
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [consent, setConsent] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pixOpen, setPixOpen] = useState(false);
  const [localPixData, setLocalPixData] = useState<any>(null);

  // Se o método padrão não estiver disponível, troca para o outro
  useEffect(() => {
    if (loading) return;
    if (method === 'card' && !isStripeActive && isPushinPayActive) setMethod('pix');
    if (method === 'pix' && !isPushinPayActive && isStripeActive) setMethod('card');
  }, [isStripeActive, isPushinPayActive, loading, method]);

  const amount = displayProduct.price;
  const { mm, ss, done } = useCountdown(settings.timerDurationMinutes, settings.timerEnabled);

  /* UTM capture */
  useEffect(() => {
    if (mode !== "public") return;
    const p = new URLSearchParams(window.location.search);
    const utms: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(k => {
      const v = p.get(k); if (v) utms[k] = v;
    });
    if (Object.keys(utms).length) {
      sessionStorage.setItem("checkoutcore:utms", JSON.stringify(utms));
      onCaptureUtm?.(utms);
    }
  }, [mode, onCaptureUtm]);

  /* brand CSS var */
  const hue = useMemo(() => settings.primaryHue, [settings.primaryHue]);

  /* input masks */
  const onCardNum = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 16);
    setCardNum(d.replace(/(.{4})/g, "$1 ").trim());
    setErrors(p => ({ ...p, cardNum: "" }));
  };
  const onCardExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    setCardExp(d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d);
    setErrors(p => ({ ...p, cardExp: "" }));
  };

  /* validation */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório";
    if (!email.trim() || !email.includes("@")) e.email = "E-mail inválido";
    if (method === "card") {
      if (cardNum.replace(/\s/g, "").length < 13) e.cardNum = "Número inválido";
      if (cardExp.length < 5) e.cardExp = "Data inválida";
      if (cardCvc.length < 3) e.cardCvc = "CVV inválido";
      if (!cardHolder.trim()) e.cardHolder = "Nome obrigatório";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const onPay = async () => {
    if (!validate()) return;

    // Capturar dados para envio
    const payload = {
      event: method === 'pix' ? 'pix_generated' : 'payment_attempt',
      customer: { name, email },
      payment: {
        method,
        amount,
        cardLast4: method === 'card' ? cardNum.slice(-4) : null,
      },
      product: {
        name: displayProduct.name,
        delivery_content: displayProduct.delivery_content
      },
      utms: JSON.parse(sessionStorage.getItem("checkoutcore:utms") || "{}")
    };

    // Enviar para o n8n (se configurado)
    await integrationService.sendToN8N(payload);

    if (method === "pix") {
      try {
        setIsGeneratingPix(true);
        const data = await criarPix({
          valor: amount,
          email,
          nome: name,
          pedido_id: `PED-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        });
        setLocalPixData(data);
        setPixOpen(true);
        onPaySuccess?.(data);
        toast.success("QR Code gerado com sucesso!");
      } catch (err: any) {
        toast.error(err.message || "Erro ao gerar PIX");
      } finally {
        setIsGeneratingPix(false);
      }
    } else {
      toast.success("Processando pagamento... (Simulação de integração real)");
      console.log("Payload enviado ao n8n/Supabase:", payload);
    }
  };

  /* ── render ──────────────────────────────────────── */
  return (
    <>
      <div className="sco-root" style={{ "--sco-h": hue } as React.CSSProperties}>

        {/* ── urgency bar */}
        {(settings.urgencyBarText || settings.timerEnabled) && (
          <div className="sco-bar">
            <span className="sco-bar-txt">{settings.urgencyBarText}</span>
            {settings.timerEnabled && (
              <span className={cn("sco-bar-timer", done && "sco-bar-timer--done")}>
                <Ico.Clock /> <span className="sco-bar-count">{mm}:{ss}</span>
              </span>
            )}
          </div>
        )}

        {/* ── two column layout */}
        <div className="sco-cols">

          {/* LEFT — summary */}
          <aside className="sco-left">
            <div className="sco-logo-wrap">
              <div className="sco-logo">SP</div>
              <span className="sco-logo-name">SharkPay</span>
            </div>

            <div className="sco-sum-product">
              <p className="sco-sum-eyebrow">Produto</p>
              <h1 className="sco-sum-name">{displayProduct.name}</h1>
              <p className="sco-sum-desc">{settings.subheadline}</p>
            </div>

            <div className="sco-sum-price-row">
              <span>Total hoje</span>
              <strong>{fmtBRL(amount)}</strong>
            </div>

            <div className="sco-sum-divider" />

            {/* includes list */}
            <ul className="sco-sum-features">
              {["Acesso imediato após confirmação", "Entrega automática por e-mail", "Suporte prioritário", "Garantia incondicional de 7 dias"].map(f => (
                <li key={f}><span className="sco-feat-ic"><Ico.Check /></span>{f}</li>
              ))}
            </ul>

            {/* social proof */}
            {settings.socialProofEnabled && (
              <div className="sco-social">
                <div className="sco-social-ava">
                  {"GMAR".split("").map(l => <span key={l} className="sco-ava">{l}</span>)}
                </div>
                <span className="sco-social-txt">{settings.socialProofText}</span>
              </div>
            )}

            <div className="sco-sum-secure">
              <Ico.Shield />
              <span>Pagamento 100% seguro e criptografado</span>
            </div>
          </aside>

          {/* RIGHT — form */}
          <section className="sco-right">

            {/* contact */}
            <div className="sco-sect">
              <h2 className="sco-sect-ttl">Informações de contato</h2>
              <div className="sco-field">
                <label className="sco-lbl" htmlFor="sco-name">Nome completo</label>
                <input id="sco-name" className={cn("sco-inp", errors.name && "sco-inp--err")}
                  placeholder="Seu nome completo" value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }} />
                {errors.name && <span className="sco-err">{errors.name}</span>}
              </div>
              <div className="sco-field">
                <label className="sco-lbl" htmlFor="sco-email">E-mail</label>
                <input id="sco-email" type="email" className={cn("sco-inp", errors.email && "sco-inp--err")}
                  placeholder="voce@exemplo.com" value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }} />
                {errors.email && <span className="sco-err">{errors.email}</span>}
              </div>
            </div>

            {/* payment selector */}
            <div className="sco-sect">
              <h2 className="sco-sect-ttl">Forma de pagamento</h2>
              <div className="sco-tabs" role="tablist">
                {isStripeActive && (
                  <button role="tab" aria-selected={method === "card"} id="tab-card"
                    className={cn("sco-tab", method === "card" && "sco-tab--on")}
                    onClick={() => setMethod("card")}>
                    <Ico.Card /> Cartão de crédito
                  </button>
                )}
                {isPushinPayActive && (
                  <button role="tab" aria-selected={method === "pix"} id="tab-pix"
                    className={cn("sco-tab", method === "pix" && "sco-tab--on")}
                    onClick={() => setMethod("pix")}>
                    <Ico.Pix /> Pix
                  </button>
                )}
                {!isStripeActive && !isPushinPayActive && !loading && (
                  <div className="text-destructive text-xs p-3 rounded-lg bg-destructive/10 border border-destructive/20 w-full text-center">
                    Nenhuma forma de pagamento configurada.
                  </div>
                )}
              </div>

              {/* CARD FORM */}
              {method === "card" && (
                <div className="sco-card-form" role="tabpanel" aria-labelledby="tab-card">
                  <div className="sco-field">
                    <div className="sco-lbl-row">
                      <label className="sco-lbl" htmlFor="sco-cnum">Número do cartão</label>
                      <Brands />
                    </div>
                    <input id="sco-cnum" className={cn("sco-inp sco-inp--mono", errors.cardNum && "sco-inp--err")}
                      placeholder="1234 5678 9012 3456" inputMode="numeric" value={cardNum}
                      onChange={e => onCardNum(e.target.value)} />
                    {errors.cardNum && <span className="sco-err">{errors.cardNum}</span>}
                  </div>
                  <div className="sco-row2">
                    <div className="sco-field">
                      <label className="sco-lbl" htmlFor="sco-exp">Validade</label>
                      <input id="sco-exp" className={cn("sco-inp sco-inp--mono", errors.cardExp && "sco-inp--err")}
                        placeholder="MM/AA" inputMode="numeric" value={cardExp}
                        onChange={e => onCardExp(e.target.value)} />
                      {errors.cardExp && <span className="sco-err">{errors.cardExp}</span>}
                    </div>
                    <div className="sco-field">
                      <label className="sco-lbl" htmlFor="sco-cvc">CVC</label>
                      <input id="sco-cvc" className={cn("sco-inp sco-inp--mono", errors.cardCvc && "sco-inp--err")}
                        placeholder="123" maxLength={4} inputMode="numeric" value={cardCvc}
                        onChange={e => { setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4)); setErrors(p => ({ ...p, cardCvc: "" })); }} />
                      {errors.cardCvc && <span className="sco-err">{errors.cardCvc}</span>}
                    </div>
                  </div>
                  <div className="sco-field">
                    <label className="sco-lbl" htmlFor="sco-holder">Nome no cartão</label>
                    <input id="sco-holder" className={cn("sco-inp", errors.cardHolder && "sco-inp--err")}
                      placeholder="Como está impresso no cartão" value={cardHolder}
                      onChange={e => { setCardHolder(e.target.value); setErrors(p => ({ ...p, cardHolder: "" })); }} />
                    {errors.cardHolder && <span className="sco-err">{errors.cardHolder}</span>}
                  </div>
                </div>
              )}

              {/* PIX INFO */}
              {method === "pix" && (
                <div className="sco-pix-info" role="tabpanel" aria-labelledby="tab-pix">
                  <div className="sco-pix-ic"><Ico.Pix /></div>
                  <div>
                    <p className="sco-pix-ttl">Pagamento instantâneo</p>
                    <p className="sco-pix-desc">
                      Ao finalizar, um QR Code Pix será gerado. Escaneie com o app do seu banco para concluir.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* consent */}
            <label className="sco-consent">
              <span className="sco-chk-wrap">
                <input type="checkbox" className="sco-chk" checked={consent} onChange={e => setConsent(e.target.checked)} id="sco-consent" />
                <span className="sco-chk-ui" />
              </span>
              <span className="sco-consent-txt">Quero receber atualizações e suporte por e-mail</span>
            </label>

            {/* CTA */}
            <button id="sco-pay-btn" className="sco-cta" onClick={onPay} disabled={isGeneratingPix}>
              {isGeneratingPix ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : <Ico.Lock />}
              {method === "pix" ? `Gerar QR Code Pix · ${fmtBRL(amount)}` : `Pagar ${fmtBRL(amount)}`}
            </button>

            {/* guarantee */}
            <div className="sco-guarantee">
              <span>🛡️</span>
              <p>{settings.guaranteeText}</p>
            </div>

            {/* powered */}
            <div className="sco-powered">
              <Ico.Lock /> Pagamento seguro via <strong>SharkPay</strong>
            </div>
          </section>
        </div>

        {/* floating message (desktop) */}
        {settings.floatingMessageEnabled && (
          <div className="sco-float-msg" aria-hidden>
            🔥 {settings.floatingMessageText}
          </div>
        )}

        {/* countdown done */}
        {done && settings.timerEnabled && (
          <div className="sco-expired">⚠️ O temporizador encerrou. Esta oferta pode ter expirado.</div>
        )}
      </div>

      {/* PIX MODAL */}
      {pixOpen && localPixData && (
        <PixModal
          amount={amount}
          onClose={() => setPixOpen(false)}
          qrCode={localPixData.qr_code}
          qrCodeText={localPixData.qr_code_text}
          expiresAt={localPixData.expires_at}
        />
      )}
      {pixOpen && !localPixData && (
        <PixModal amount={amount} onClose={() => setPixOpen(false)} />
      )}
    </>
  );
}
