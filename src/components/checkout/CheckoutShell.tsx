import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn, normalizeImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { integrationService } from "@/lib/integrations";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useIntegrations } from "@/hooks/use-integrations";
import type { CheckoutSettings, PaymentMethod } from "./types";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Helper: chama a API unificada de pagamento
async function processarPagamento(payload: Record<string, unknown>) {
  const res = await fetch('/api/process-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.erro || 'Erro no servidor de pagamentos');
  return data;
}

// Helper: obter token reCAPTCHA v3 (se disponível)
async function getRecaptchaToken(action = 'checkout'): Promise<string | null> {
  try {
    const siteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY;
    if (!siteKey || !(window as any).grecaptcha) return null;
    return await (window as any).grecaptcha.execute(siteKey, { action });
  } catch {
    return null;
  }
}

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

const MOCK_PIX = "00020126580014BR.GOV.BCB.PIX0136e464f9b4-5e73-4a81-a88d-98c76e39c52352040000530398654071234.565802BR5924SharkPay Checkout Dev60145302BR62070503***63047A8F";

/* ─── Stripe Card Form Component ──────────────────── */
function StripeCardForm({
  onSuccess,
  amount,
  payload,
  isProcessing,
  setIsProcessing
}: {
  onSuccess: () => void;
  amount: number;
  payload: any;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || isProcessing) return;

    if (!payload.nome || !payload.email) {
      toast.error("Preencha seu nome e e-mail primeiro.");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Processando pagamento...");

    try {
      const data = await processarPagamento(payload);

      if (!data.clientSecret) {
        throw new Error(data.error || "Falha ao obter segredo de pagamento");
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: payload.nome,
            email: payload.email,
          }
        }
      });

      if (error) throw new Error(error.message);

      if (paymentIntent.status === 'succeeded') {
        toast.success("Pagamento confirmado!", { id: toastId });
        onSuccess();
      } else {
        throw new Error("Pagamento não concluído. Status: " + paymentIntent.status);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar cartão", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-1">
      <div className="sco-field mb-4">
        <label className="sco-lbl mb-2">Dados do cartão</label>
        <div className="sco-inp-stripe">
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
                fontFamily: 'Inter, sans-serif',
                "::placeholder": {
                  color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#aab7c4'
                }
              }
            }
          }} />
        </div>
      </div>

      <button type="submit" className="sco-cta" disabled={isProcessing || !stripe}>
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ico.Lock />}
        Pagar {fmtBRL(amount)}
      </button>

      <style dangerouslySetInnerHTML={{
        __html: `
        .sco-inp-stripe {
          padding: 0.75rem 0.8rem;
          border-radius: 0.55rem;
          border: 1.5px solid hsl(var(--border));
          background: hsl(var(--background));
          min-height: 2.6rem;
          display: flex;
          align-items: center;
        }
        .sco-inp-stripe .StripeElement { width: 100%; }
      `}} />
    </form>
  );
}

/* ─── Pix Modal Component ─────────────────────────── */
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
    try {
      await navigator.clipboard.writeText(pixValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success("Código Pix copiado!");
    } catch (err) {
      console.warn("Erro ao copiar PIX:", err);
    }
  };

  return (
    <div className="pix-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal>
      <div className="pix-panel">
        <div className="pix-panel-hd">
          <span className="pix-panel-title">
            <span className="pix-dot" />
            Pagamento via Pix
          </span>
          <button onClick={onClose} className="pix-close" aria-label="Fechar"><Ico.Close /></button>
        </div>

        <div className="pix-amount-row">
          <span>Valor a pagar</span>
          <strong>{fmtBRL(amount)}</strong>
        </div>

        <div className="pix-qr-wrap">
          <div className="pix-qr-box">
            {qrCode ? (
              <img
                src={qrCode.startsWith('http') || qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                className="w-full h-full object-contain"
                alt="QR Code Pix"
              />
            ) : (
              <svg width="148" height="148" viewBox="0 0 148 148" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="42" height="42" rx="5" fill="currentColor" />
                <rect x="14" y="14" width="30" height="30" rx="3" fill="white" />
                <rect x="20" y="20" width="18" height="18" rx="1.5" fill="currentColor" />
                <rect x="98" y="8" width="42" height="42" rx="5" fill="currentColor" />
                <rect x="104" y="14" width="30" height="30" rx="3" fill="white" />
                <rect x="110" y="20" width="18" height="18" rx="1.5" fill="currentColor" />
                <rect x="8" y="98" width="42" height="42" rx="5" fill="currentColor" />
                <rect x="14" y="104" width="30" height="30" rx="3" fill="white" />
                <rect x="20" y="110" width="18" height="18" rx="1.5" fill="currentColor" />
                {[60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135].flatMap((x, i) =>
                  [8, 13, 18, 23, 28, 33, 38, 43, 48, 55].map((y, j) =>
                    (i + j) % 3 !== 0 ? <rect key={`${i}-${j}`} x={x} y={y} width="4" height="4" rx="0.8" fill="currentColor" /> : null
                  )
                )}
                <rect x="56" y="56" width="36" height="36" rx="6" fill="white" />
                <text x="74" y="79" textAnchor="middle" fill="#32BCAD" fontSize="13" fontWeight="800" fontFamily="system-ui">PIX</text>
              </svg>
            )}
          </div>
          <p className="pix-qr-hint">Escaneie com o app do seu banco</p>
        </div>

        <ol className="pix-steps">
          {["Abra o app do seu banco", "Selecione Pix → Pagar", "Escaneie ou use o código abaixo"].map((s, i) => (
            <li key={i}><span className="pix-step-n">{i + 1}</span>{s}</li>
          ))}
        </ol>

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

        <div className="pix-expiry">
          <Ico.Clock />
          QR expira em <strong>{expiresAt ? new Date(expiresAt).toLocaleTimeString() : '30 minutos'}</strong>
        </div>

        <div className="pix-panel-ft">
          <Ico.Shield />
          Transação processada com segurança pelo SharkPay
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */

export type CheckoutShellProps = {
  settings: CheckoutSettings;
  product?: {
    name: string;
    price: number;
    image_url?: string | null;
    delivery_content: string;
    mundpay_url?: string | null;
    stripe_enabled?: boolean | null;
    pushinpay_enabled?: boolean | null;
    mundpay_enabled?: boolean | null;
  } | null;
  mode?: "public" | "preview";
  onCaptureUtm?: (u: Record<string, string>) => void;
  onPaySuccess?: (data: { qr_code?: string; qr_code_text?: string; id?: string }) => void;
};

export function CheckoutShell({
  settings,
  product,
  mode = "public",
  onCaptureUtm,
  onPaySuccess
}: CheckoutShellProps) {
  const { payments, tracking, getStatus, loading } = useIntegrations();
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [stripePromise, setStripePromise] = useState<any>(null);

  const isStripeActive = useMemo(() => {
    if (product && product.stripe_enabled === false) return false;
    return getStatus(payments, 'stripe') === 'active';
  }, [payments, getStatus, product?.stripe_enabled]);

  const isPushinPayActive = useMemo(() => {
    if (product && product.pushinpay_enabled === false) return false;
    const status = getStatus(payments, 'pushinpay');
    if (status === 'inactive') return false;
    if (status === 'active') return true;
    const token = import.meta.env.VITE_PUSHINPAY_TOKEN;
    return !!token && token.length > 20 && !token.includes('placeholder');
  }, [payments, getStatus, product?.pushinpay_enabled]);

  const isMundPayActive = useMemo(() => {
    if (product && product.mundpay_enabled === false) return false;
    // Se o produto tem uma URL MundPay, forçamos como ativo para este checkout
    if (product?.mundpay_url) return true;

    const status = getStatus(payments, 'mundpay');
    if (status === 'inactive') return false;
    if (status === 'active') return true;
    const token = import.meta.env.VITE_MUNDPAY_API_TOKEN;
    return !!token && token.length > 10 && !token.includes('placeholder');
  }, [payments, getStatus, product?.mundpay_url, product?.mundpay_enabled]);

  useEffect(() => {
    const pk = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (pk && pk !== 'pk_live_placeholder' && isStripeActive) {
      setStripePromise(loadStripe(pk));
    }
  }, [isStripeActive]);

  const displayProduct = useMemo(() => {
    let img = product?.image_url;
    const imgResolved = normalizeImageUrl(img);
    if (product) return { ...product, image_url: imgResolved };
    return {
      name: settings.headline || "Produto SharkPay",
      price: 97,
      image_url: null,
      delivery_content: "Obrigado por sua compra!"
    };
  }, [product, settings.headline]);

  const [method, setMethod] = useState<PaymentMethod>("card");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pixOpen, setPixOpen] = useState(false);
  const [localPixData, setLocalPixData] = useState<{ qr_code?: string; qr_code_text?: string; expires_at?: string } | null>(null);

  // MundPay — popup + polling
  const [mundpayPending, setMundpayPending] = useState(false);
  const [mundpayPedidoId, setMundpayPedidoId] = useState<string | null>(null);
  const [mundpayCheckoutUrl, setMundpayCheckoutUrl] = useState<string | null>(null);
  const [mundpayPago, setMundpayPago] = useState(false);

  // Polling do status do pedido MundPay no Supabase
  useEffect(() => {
    if (!mundpayPedidoId || !mundpayPending) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('pedidos')
          .select('status')
          .eq('id', mundpayPedidoId)
          .single();

        if (data?.status === 'pago') {
          setMundpayPago(true);
          setMundpayPending(false);
          toast.success("✅ Pagamento MundPay confirmado!");
        }
      } catch { /* ignora erros de polling */ }
    }, 4000); // Poll a cada 4s

    return () => clearInterval(interval);
  }, [mundpayPedidoId, mundpayPending]);

  useEffect(() => {
    if (loading) return;
    if (method === 'card' && !isStripeActive) {
      if (isPushinPayActive || isMundPayActive) setMethod('pix');
    } else if (method === 'pix' && !isPushinPayActive && !isMundPayActive) {
      if (isStripeActive) setMethod('card');
    }
  }, [isStripeActive, isPushinPayActive, isMundPayActive, loading, method]);

  const amount = displayProduct.price;
  const { mm, ss, done } = useCountdown(settings.timerDurationMinutes, settings.timerEnabled);

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

  const hue = settings.primaryHue;

  const onPay = async () => {
    if (!name.trim() || !email.trim() || !email.includes("@")) {
      setErrors({ name: !name.trim() ? "Obrigatório" : "", email: !email.trim() || !email.includes("@") ? "E-mail inválido" : "" });
      return;
    }

    if (mode === "preview") {
      if (method === "pix") {
        setLocalPixData({ qr_code_text: MOCK_PIX });
        setPixOpen(true);
      } else {
        toast.success("Sucesso! (Preview)");
      }
      return;
    }

    setIsGeneratingPix(true);
    const utms = JSON.parse(sessionStorage.getItem("checkoutcore:utms") || "{}");
    const recaptcha_token = await getRecaptchaToken();

    try {
      // Determinar o gateway de Pix:
      // Se o produto tem mundpay_url, usar mundpay diretamente
      // Senão, usar pushinpay se ativo
      const hasMundPayUrl = !!displayProduct.mundpay_url;
      const pixGateway = hasMundPayUrl ? 'mundpay' : isPushinPayActive ? 'pushinpay' : isMundPayActive ? 'mundpay' : null;

      const data = await processarPagamento({
        method, nome: name, email, valor: amount,
        produto_nome: displayProduct.name,
        checkout_slug: window.location.pathname.split('/checkout/')[1] || '',
        utm_source: utms.utm_source || null,
        gateway: method === 'pix' ? pixGateway : 'stripe',
        recaptcha_token,
        cpf: cpf || undefined,
        phone: phone || undefined,
        mundpay_url: displayProduct.mundpay_url
      });

      if (method === 'pix') {
        // MundPay retorna checkout_url para popup
        if (data.checkout_url) {
          setMundpayCheckoutUrl(data.checkout_url);
          setMundpayPedidoId(data.pedido_id);
          setMundpayPending(true);
          setMundpayPago(false);
          // Abrir num popup
          window.open(data.checkout_url, 'mundpay_checkout', 'width=500,height=700,scrollbars=yes');
          onPaySuccess?.(data);
        } else {
          // PushinPay retorna QR code
          setLocalPixData({ qr_code: data.qr_code, qr_code_text: data.qr_code_text, expires_at: data.expires_at });
          setPixOpen(true);
          onPaySuccess?.(data);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pagamento');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  // Se MundPay está pendente, exibir tela de espera
  if (mundpayPending || mundpayPago) {
    return (
      <div className="sco-root" style={{ "--sco-h": hue } as React.CSSProperties}>
        <div className="sco-cols">
          <div className="sco-form mx-auto max-w-md w-full">
            <div className="flex flex-col items-center justify-center p-8 gap-6 text-center animate-in fade-in zoom-in duration-500">
              {mundpayPago ? (
                <>
                  <div className="size-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="size-10 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-400">Pagamento Confirmado!</h2>
                  <p className="text-sm text-muted-foreground">
                    Seu pagamento foi aprovado com sucesso.
                    Você receberá o acesso ao produto no e-mail informado.
                  </p>
                </>
              ) : (
                <>
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="relative size-20 rounded-full bg-primary/20 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)_/_20%)]">
                      <Loader2 className="size-10 text-primary animate-spin" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold">Aguardando confirmação...</h2>
                  <p className="text-sm text-muted-foreground">
                    Finalize o pagamento do Pix na janela que se abriu para liberar seu acesso. Esta página atualizará automaticamente em instantes.
                  </p>

                  <div className="flex flex-col gap-3 w-full mt-2">
                    <button
                      onClick={() => mundpayCheckoutUrl && window.open(mundpayCheckoutUrl, 'mundpay_checkout', 'width=500,height=700,scrollbars=yes')}
                      className="sco-btn w-full flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="size-4" />
                      Não abriu? Clique aqui para ver o Pix
                    </button>
                    <button
                      onClick={() => {
                        setMundpayPending(false);
                        setMundpayPedidoId(null);
                        setMundpayCheckoutUrl(null);
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      Voltar ao formulário
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4 p-3 bg-muted/40 rounded-lg">
                    <Ico.Shield /> Transação 100% segura. Verificando...
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sco-root" style={{ "--sco-h": hue } as React.CSSProperties}>
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

        <div className="sco-cols">
          <aside className="sco-left">
            <div className="sco-logo-wrap">
              <div className="sco-logo">SP</div>
              <span className="sco-logo-name">SharkPay</span>
            </div>

            <div className="sco-sum-product">
              <div className="sco-sum-img-wrap">
                {displayProduct.image_url ? (
                  <img src={displayProduct.image_url} alt={displayProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="sco-sum-img-placeholder"><Ico.Card /></div>
                )}
              </div>
              <p className="sco-sum-eyebrow">Você está comprando</p>
              <h1 className="sco-sum-name">{displayProduct.name}</h1>
              <p className="sco-sum-desc">{settings.subheadline}</p>
            </div>

            <div className="sco-sum-price-row">
              <span>Total a pagar</span>
              <strong>{fmtBRL(amount)}</strong>
            </div>

            <ul className="sco-sum-features">
              {["Acesso imediato", "Entrega automática", "Suporte prioritário", "Garantia de 7 dias"].map(f => (
                <li key={f}><span className="sco-feat-ic"><Ico.Check /></span>{f}</li>
              ))}
            </ul>

            <div className="sco-sum-secure">
              <Ico.Shield />
              <span>Pagamento 100% seguro</span>
            </div>
          </aside>

          <section className="sco-right">
            <div className="sco-sect">
              <h2 className="sco-sect-ttl">Informações de contato</h2>
              <div className="sco-field">
                <label className="sco-lbl" htmlFor="sco-name">Nome completo</label>
                <input id="sco-name" className={cn("sco-inp", errors.name && "sco-inp--err")}
                  placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="sco-field">
                <label className="sco-lbl" htmlFor="sco-email">E-mail</label>
                <input id="sco-email" type="email" className={cn("sco-inp", errors.email && "sco-inp--err")}
                  placeholder="voce@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              {isMundPayActive && (
                <div className="sco-field animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="sco-lbl" htmlFor="sco-phone">Número de Celular</label>
                  <div className={cn(
                    "sco-inp flex items-center p-0 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all",
                    errors.phone && "sco-inp--err"
                  )}>
                    <div className="bg-muted/20 border-r border-border/60 h-full flex items-center px-3 gap-1.5 text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                      <span>🇧🇷</span>
                      <span>+55</span>
                    </div>
                    <input id="sco-phone"
                      className="flex-1 bg-transparent border-none outline-none px-3 h-full text-sm placeholder:text-muted-foreground/40"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                        if (v.length > 6) v = v.replace(/(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
                        else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/, "($1) $2");
                        setPhone(v);
                      }}
                    />
                  </div>
                </div>
              )}

              {isMundPayActive && (
                <div className="sco-field animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="sco-lbl" htmlFor="sco-cpf">CPF <span className="text-muted-foreground">(opcional)</span></label>
                  <input id="sco-cpf" className={cn("sco-inp", errors.cpf && "sco-inp--err")}
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                      if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
                      else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, "$1.$2");
                      setCpf(v);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="sco-sect">
              <h2 className="sco-sect-ttl">Forma de pagamento</h2>
              <div className="sco-tabs mb-4">
                {isStripeActive && (
                  <button className={cn("sco-tab", method === "card" && "sco-tab--on")} onClick={() => setMethod("card")}>
                    <Ico.Card /> Cartão
                  </button>
                )}
                {(isPushinPayActive || isMundPayActive) && (
                  <button className={cn("sco-tab", method === "pix" && "sco-tab--on")} onClick={() => setMethod("pix")}>
                    <Ico.Pix /> Pix
                  </button>
                )}
              </div>

              {method === "card" && isStripeActive && stripePromise ? (
                <div className="sco-card-form p-1">
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Insira os dados do seu cartão com total segurança.
                  </p>
                  <Elements stripe={stripePromise}>
                    <StripeCardForm
                      amount={amount}
                      isProcessing={isGeneratingPix}
                      setIsProcessing={setIsGeneratingPix}
                      payload={{
                        method: 'card', nome: name, email, valor: amount,
                        produto_nome: displayProduct.name,
                        checkout_slug: window.location.pathname.split('/checkout/')[1] || '',
                        utm_source: JSON.parse(sessionStorage.getItem("checkoutcore:utms") || "{}").utm_source || null,
                        gateway: 'stripe'
                      }}
                      onSuccess={() => {
                        const slug = window.location.pathname.split('/checkout/')[1] || '';
                        window.location.href = `/sucesso?pedido_id=${Date.now()}&slug=${slug}`;
                      }}
                    />
                  </Elements>
                </div>
              ) : method === "pix" ? (
                <div className="sco-pix-info">
                  <div className="sco-pix-ic"><Ico.Pix /></div>
                  <div>
                    <p className="sco-pix-ttl">
                      {isMundPayActive ? "Pagamento via Pix" : "Pagamento via Pix"}
                    </p>
                    <p className="sco-pix-desc">
                      {isMundPayActive
                        ? "Você será direcionado para um ambiente 100% seguro para finalizar o seu pagamento em poucos segundos."
                        : "O QR Code será gerado após clicar no botão abaixo."}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {method === "pix" && (
              <button className={cn("sco-cta mt-4", isMundPayActive && "bg-emerald-600 hover:bg-emerald-700")} onClick={onPay} disabled={isGeneratingPix}>
                {isGeneratingPix ? <Loader2 className="w-4 h-4 animate-spin" /> : (!isMundPayActive && <Ico.Lock />)}
                {isMundPayActive ? "🔒 Continuar para Pagamento Seguro" : `Gerar QR Code Pix · ${fmtBRL(amount)}`}
              </button>
            )}

            <div className="sco-guarantee mt-6">
              <span>🛡️</span>
              <p>{settings.guaranteeText}</p>
            </div>
          </section>
        </div>
      </div>

      {pixOpen && (
        <PixModal
          amount={amount}
          onClose={() => setPixOpen(false)}
          qrCode={localPixData?.qr_code}
          qrCodeText={localPixData?.qr_code_text}
          expiresAt={localPixData?.expires_at}
        />
      )}
    </>
  );
}
