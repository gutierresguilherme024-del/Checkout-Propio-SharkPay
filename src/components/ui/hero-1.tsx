import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, PhoneCallIcon, RocketIcon } from "lucide-react";
import { IntegrationCarousel } from "@/components/ui/integration-carousel";

export function HeroSection() {
  return (
    <div className="relative w-full">
      {/* Main content */}
      <div className="relative flex flex-col items-center justify-center gap-5 pt-8 md:pt-12">

        <NavLink
          to="/checkout"
          className={cn(
            "group mx-auto flex w-fit items-center gap-3 rounded-full border bg-card px-3 py-1 shadow",
            "animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards delay-200 duration-500 ease-out",
            "transition-all hover:-translate-y-0.5 hover:shadow-md",
          )}
        >
          <RocketIcon className="size-3 text-muted-foreground" />
          <span className="text-xs text-foreground/80">demo completa do Checkout + Painel</span>
          <span className="block h-5 border-l" />
          <ArrowRightIcon className="size-3 transition-transform duration-150 ease-out group-hover:translate-x-1" />
        </NavLink>

        <h1
          className={cn(
            "animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards text-balance text-center text-4xl tracking-tight delay-300 duration-500 ease-out md:text-5xl lg:text-7xl font-brand",
            "drop-shadow-[0_0_35px_hsl(var(--primary)/0.18)]",
          )}
        >
          Shark<span className="text-primary">Pay</span>: O Checkout <br />
          de Alta Conversão
        </h1>

        <p className="mx-auto max-w-md animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards text-center text-base tracking-wide text-foreground/80 delay-400 duration-500 ease-out sm:text-lg md:text-xl">
          Tecnologia avançada para escalar suas vendas com Pix, Cartão e
          fluxos de entrega automatizados.
        </p>

        <div className="flex flex-row flex-wrap items-center justify-center gap-3 pt-2 animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards delay-500 duration-500 ease-out">
          <Button asChild className="rounded-full" size="lg" variant="secondary">
            <NavLink to="/checkout">
              <PhoneCallIcon className="mr-2 size-4" />
              Ver preview do checkout
            </NavLink>
          </Button>
          <Button asChild className="rounded-full" size="lg">
            <NavLink to="/admin/overview">
              Abrir painel admin
              <ArrowRightIcon className="ms-2 size-4" />
            </NavLink>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LogosSection() {
  return (
    <div className="relative space-y-12">
      <div className="space-y-4 text-center">
        <h2 className="text-2xl md:text-3xl font-brand tracking-tight text-foreground/90">
          Ecossistema de <span className="text-primary">Alta Performance</span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
          Integrações nativas com as maiores stacks do mercado para maximizar seus resultados.
        </p>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="rounded-[40px] bg-[#0B0D11]/40 border border-white/5 backdrop-blur-sm shadow-2xl p-4 md:p-8">
          <IntegrationCarousel />
        </div>
      </div>
    </div>
  );
}
