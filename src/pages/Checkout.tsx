import { useMemo } from "react";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { defaultCheckoutSettings } from "@/components/checkout/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { HeroGlow } from "@/components/brand/HeroGlow";

export default function PublicCheckout() {
  const settings = useMemo(() => defaultCheckoutSettings, []);

  return (
    <div className="sco-page relative overflow-hidden">
      {/* Fundo igual ao da Home */}
      <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-40 mix-blend-overlay" />

      {/* Top bar flutuante com o toggle de tema */}
      <div className="sco-page-topbar z-50">
        <ThemeToggle />
      </div>

      {/* Container principal: checkout direto no background, sem card */}
      <HeroGlow className="flex-1 flex flex-col">
        <div className="sco-page-body relative z-10">
          <CheckoutShell settings={settings} />
        </div>
      </HeroGlow>
    </div>
  );
}
