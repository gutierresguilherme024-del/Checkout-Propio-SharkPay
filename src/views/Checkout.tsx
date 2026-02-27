import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { defaultCheckoutSettings } from "@/components/checkout/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { HeroGlow } from "@/components/brand/HeroGlow";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { integrationService } from "@/lib/integrations";

interface Produto {
  nome: string;
  preco: number;
  descricao?: string;
  imagem_url: string | null;
  checkout_slug: string;
  ativo: boolean;
  mundpay_url?: string | null;
  stripe_enabled?: boolean;
  pushinpay_enabled?: boolean;
  mundpay_enabled?: boolean;
  user_id?: string | null;
}

interface PixData {
  qr_code?: string;
  qr_code_text?: string;
  expires_at?: string;
}

export default function PublicCheckout() {
  const { slug } = useParams();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(defaultCheckoutSettings);

  useEffect(() => {
    async function fetchData() {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        if (slug === 'demo') {
          const globalSettings = await integrationService.getGlobalSettings();
          if (globalSettings) setSettings(prev => ({ ...prev, ...globalSettings }));
          setLoading(false);
          return;
        }

        // ══════ BUSCA DO PRODUTO ══════
        // Tentativa 1: busca exata pelo slug
        let { data: prodData, error: prodError } = await supabase
          .from('produtos')
          .select('*')
          .eq('checkout_slug', slug)
          .eq('ativo', true)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Tentativa 2: busca parcial — o slug da URL pode ser apenas o prefixo
        // Ex: URL tem "lovable-infinito-27-90" mas o banco tem "lovable-infinito-27-90-y3s5"
        // Ou vice-versa: URL tem sufixo mas o banco não
        if (!prodData && !prodError) {
          console.log("[Checkout] Busca exata falhou, tentando parcial com:", slug);

          // Buscar slugs que COMEÇAM com o slug da URL (funil sem sufixo)
          const partial = await supabase
            .from('produtos')
            .select('*')
            .ilike('checkout_slug', `${slug}%`)
            .eq('ativo', true)
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (partial.data) {
            prodData = partial.data;
            console.log("[Checkout] ✅ Produto encontrado via prefixo:", prodData.nome);
          }
        }

        // Tentativa 3: buscar pelo slug base (removendo sufixo aleatório do URL)
        if (!prodData && !prodError) {
          const basePart = slug.replace(/-[a-z0-9]{3,10}$/, '');
          if (basePart && basePart !== slug) {
            console.log("[Checkout] Tentando busca por base:", basePart);
            const byBase = await supabase
              .from('produtos')
              .select('*')
              .ilike('checkout_slug', `${basePart}%`)
              .eq('ativo', true)
              .order('criado_em', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (byBase.data) {
              prodData = byBase.data;
              console.log("[Checkout] ✅ Produto encontrado via base:", prodData.nome);
            }
          }
        }

        if (prodError) {
          console.error("[Checkout] Erro ao buscar produto:", prodError);
          setError(`Erro ao carregar checkout: ${prodError.message}`);
          return;
        }

        if (!prodData) {
          console.warn("[Checkout] Produto não encontrado para slug:", slug);
          setError("Produto não encontrado ou link expirado.");
          return;
        }

        console.log("[Checkout] ✅ Produto carregado:", prodData.nome, "Slug:", prodData.checkout_slug);
        setProduto(prodData);

        // ══════ CARREGAR INTEGRAÇÕES (não-bloqueante) ══════
        try {
          const ownerId = prodData.user_id || undefined;
          const [globalSettings, paymentSettings, trackingSettings] = await Promise.all([
            integrationService.getGlobalSettings(ownerId),
            integrationService.getSettings('payment', ownerId),
            integrationService.getSettings('tracking', ownerId)
          ]);
          if (globalSettings) {
            setSettings(prev => ({ ...prev, ...globalSettings }));
          }

          // Injeção de script de rastreamento (UTMify)
          if (trackingSettings && trackingSettings.length > 0) {
            const utmify = trackingSettings.find(t => t.id === 'utmify' && t.enabled);
            if (utmify && utmify.config?.utmScript) {
              const scriptString = utmify.config.utmScript as string;
              if (scriptString.trim() && !document.getElementById('utmify-script')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = scriptString;
                Array.from(tempDiv.childNodes).forEach(node => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    const clonedNode = (node as Element).cloneNode(true) as Element;
                    clonedNode.id = 'utmify-script';
                    document.head.appendChild(clonedNode);
                  }
                });
              }
            }
          }
        } catch (integErr) {
          console.warn("[Checkout] Integrações falharam (não fatal):", integErr);
        }

      } catch (err: any) {
        console.error("[Checkout] Erro fatal:", err);
        // Se já tem produto carregado, não sobrescreve com erro
        if (!produto) {
          setError(err.message || "Erro desconhecido");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const isDemo = slug === 'demo';
  const showLoading = loading && !produto && !isDemo;

  return (
    <div className="sco-page relative overflow-hidden flex flex-col min-h-screen">
      <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-40 mix-blend-overlay" />

      <HeroGlow className="flex-1 flex flex-col">
        <div className="sco-page-body relative z-10">
          {showLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative size-16">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
              </div>
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Iniciando checkout seguro...</p>
            </div>
          ) : !produto && !isDemo && error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6 animate-in fade-in duration-500">
              <div className="size-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
                <ArrowLeft className="size-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">Checkout Indisponível</h2>
              <p className="text-muted-foreground max-w-sm mb-8">{error}</p>
              <Button asChild variant="outline">
                <NavLink to="/checkout/demo">Tentar Demonstração</NavLink>
              </Button>
            </div>
          ) : (
            <CheckoutShell
              settings={settings}
              product={isDemo ? {
                name: "Produto Demonstração",
                price: 97.00,
                delivery_content: "Conteúdo de teste"
              } : produto ? {
                name: produto.nome,
                price: produto.preco,
                image_url: produto.imagem_url,
                delivery_content: produto.descricao || "",
                mundpay_url: produto.mundpay_url,
                stripe_enabled: produto.stripe_enabled,
                pushinpay_enabled: produto.pushinpay_enabled,
                mundpay_enabled: produto.mundpay_enabled
              } : null}
              onPaySuccess={(data) => {
                if (data.qr_code) setPixData(data);
              }}
            />
          )}
        </div>
      </HeroGlow>
    </div>
  );
}
