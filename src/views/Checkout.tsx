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

  // Fallback especial para a demonstração
  if (!produto && slug === 'demo') {
    return (
      <div className="sco-page relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-40 mix-blend-overlay" />
        <div className="sco-page-topbar z-50">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 h-9 px-3">
            <NavLink to="/">
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </NavLink>
          </Button>
          <ThemeToggle />
        </div>
        <HeroGlow className="flex-1 flex flex-col">
          <div className="sco-page-body relative z-10">
            <CheckoutShell
              settings={{
                ...defaultCheckoutSettings,
                headline: "Demonstração SharkPay",
                subheadline: "Veja como seu checkout ficará para seus clientes."
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
      <h2 className="text-2xl font-bold">Produto não encontrado</h2>
      <p className="text-muted-foreground">O link acessado é inválido ou o produto está inativo.</p>
      <Button asChild variant="outline">
        <NavLink to="/">Voltar para Home</NavLink>
      </Button>
    </div>
  );

  return (
    <div className="sco-page relative overflow-hidden">
      <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-40 mix-blend-overlay" />

      <div className="sco-page-topbar z-50">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 h-9 px-3">
          <NavLink to="/">
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </NavLink>
        </Button>
        <ThemeToggle />
      </div>

      <HeroGlow className="flex-1 flex flex-col">
        <div className="sco-page-body relative z-10">
          <CheckoutShell
            settings={{ ...defaultCheckoutSettings }}
            product={{
              name: produto.nome,
              price: produto.preco,
              delivery_content: produto.descricao || ""
            }}
          />
        </div>
      </HeroGlow>
    </div>
  );
}
