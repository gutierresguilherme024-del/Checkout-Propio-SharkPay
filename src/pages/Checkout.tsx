import { useMemo } from "react";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { defaultCheckoutSettings } from "@/components/checkout/types";
import { HeroGlow } from "@/components/brand/HeroGlow";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function PublicCheckout() {
  const settings = useMemo(() => defaultCheckoutSettings, []);

  return (
    <main className="min-h-svh bg-[image:var(--gradient-page)] px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 flex justify-end">
          <ThemeToggle />
        </div>
        <HeroGlow className="rounded-3xl">
          <CheckoutShell settings={settings} />
        </HeroGlow>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          MVP (front-end). Gateways, webhooks, idempotência e entrega automática entram nas fases 2–3.
        </p>
      </div>
    </main>
  );
}
