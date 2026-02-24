import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { defaultCheckoutSettings } from "@/components/checkout/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { HeroGlow } from "@/components/brand/HeroGlow";
import { Loader2 } from "lucide-react";

export default function PublicCheckout() {
  const { slug } = useParams();
  const [produto, setProduto] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduto() {
      if (!slug) return;
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('checkout_slug', slug)
        .eq('ativo', true)
        .single();

      if (!error && data) {
        setProduto(data);
      }
      setLoading(false);
    }
    fetchProduto();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!produto) return <div>Produto não encontrado ou inativo.</div>;

  return (
    <div className="sco-page relative overflow-hidden">
      <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-40 mix-blend-overlay" />

      <div className="sco-page-topbar z-50">
        <ThemeToggle />
      </div>

      <HeroGlow className="flex-1 flex flex-col">
        <div className="sco-page-body relative z-10">
          <CheckoutShell settings={{ ...defaultCheckoutSettings, headline: produto.nome }} />
          {/* Aqui você pode passar mais dados do produto para o CheckoutShell se necessário */}
        </div>
      </HeroGlow>
    </div>
  );
}
