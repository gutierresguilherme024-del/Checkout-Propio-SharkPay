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
        // 1. Carregar configurações globais
        const globalSettings = await integrationService.getGlobalSettings();
        if (globalSettings) {
          setSettings(prev => ({ ...prev, ...globalSettings }));
        }

        if (slug === 'demo') {
          setLoading(false);
          return;
        }

        // 2. Carregar produto
        const { data, error: sbError } = await supabase
          .from('produtos')
          .select('*')
          .eq('checkout_slug', slug)
          .eq('ativo', true)
          .single();

        if (sbError) {
          console.error("[Checkout] Erro ao buscar produto:", sbError);
          setError(`${sbError.message} (${sbError.code})`);
        } else if (data) {
          console.log("[Checkout] Produto carregado:", data.nome);
          setProduto(data);
        } else {
          console.warn("[Checkout] Nenhum produto encontrado para o slug:", slug);
        }
      } catch (err: any) {
        console.error("Erro fatal:", err);
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // Fallback especial para a demonstração
  if (!produto && slug === 'demo') {
    return (
      <div className="sco-page relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-40 mix-blend-overlay" />

        <HeroGlow className="flex-1 flex flex-col">
          <div className="sco-page-body relative z-10">
            <CheckoutShell
              settings={{
                ...settings,
                headline: settings.headline || "Demonstração do Checkout",
                subheadline: settings.subheadline || "Veja como seu checkout ficará para seus clientes."
              }}
              product={{
                name: "Produto Demonstração",
                price: 97.00,
                delivery_content: "Conteúdo de teste"
              }}
            />
          </div>
        </HeroGlow>
      </div>
    );
  }

  if (!produto) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4 p-8 text-center">
      <h2 className="text-2xl font-bold text-red-400">Produto não encontrado</h2>
      <p className="text-muted-foreground max-w-md">
        {error ? `Erro técnico: ${error}` : 'O link acessado é inválido ou o produto está inativo.'}
      </p>
      <div className="flex gap-4">
        {slug !== 'demo' && (
          <Button asChild>
            <NavLink to="/checkout/demo">Ver Demonstração</NavLink>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="sco-page relative overflow-hidden">
      <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-40 mix-blend-overlay" />



      <HeroGlow className="flex-1 flex flex-col">
        <div className="sco-page-body relative z-10">
          <CheckoutShell
            settings={settings}
            product={{
              name: produto.nome,
              price: produto.preco,
              image_url: produto.imagem_url,
              delivery_content: produto.descricao || "",
              mundpay_url: produto.mundpay_url,
              stripe_enabled: produto.stripe_enabled,
              pushinpay_enabled: produto.pushinpay_enabled,
              mundpay_enabled: produto.mundpay_enabled
            }}
            onPaySuccess={(data) => {
              if (data.qr_code) setPixData(data);
            }}
          />

        </div>
      </HeroGlow>
    </div>
  );
}
