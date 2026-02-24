import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, PhoneCallIcon, RocketIcon, Mail, Zap } from "lucide-react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { useAuth } from "@/hooks/useAuth";

export function HeroSection() {
  const { session, loading } = useAuth();

  return (
    <div className="relative w-full">
      {/* Main content */}
      <div className="relative flex flex-col items-center justify-center gap-5 pt-8 md:pt-12">
        {!loading && !session && (
          <NavLink
            to="/login"
            className={cn(
              "group mx-auto flex w-fit items-center gap-3 rounded-full border bg-card px-3 py-1 shadow",
              "animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards delay-200 duration-500 ease-out",
              "transition-all hover:-translate-y-0.5 hover:shadow-md",
            )}
          >
            <RocketIcon className="size-3 text-muted-foreground" />
            <span className="text-xs text-foreground/80">Registre-se agora para testar a demo</span>
            <span className="block h-5 border-l" />
            <ArrowRightIcon className="size-3 transition-transform duration-150 ease-out group-hover:translate-x-1" />
          </NavLink>
        )}

        {session && (
          <NavLink
            to="/checkout/demo"
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
        )}

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
          {!loading && (
            <>
              {session ? (
                <>
                  <Button asChild className="rounded-full" size="lg" variant="secondary">
                    <NavLink to="/checkout/demo">
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
                </>
              ) : (
                <>
                  <Button asChild className="rounded-full px-8" size="lg">
                    <NavLink to="/login">
                      Começar agora
                      <ArrowRightIcon className="ms-2 size-4" />
                    </NavLink>
                  </Button>
                  <Button asChild className="rounded-full px-8" size="lg" variant="outline">
                    <NavLink to="/login">
                      Fazer login
                    </NavLink>
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LogosSection() {
  const integrations = [
    {
      name: "Stripe",
      icon: (
        <svg viewBox="0 0 40 40" className="size-full fill-white">
          <path d="M15.4 16.5C15.4 14.6 17 13.5 19.8 13.5C21.3 13.5 22.8 13.8 24.1 14.4V11.2C22.8 10.7 21.4 10.4 19.8 10.4C15.5 10.4 11.8 12.6 11.8 16.7C11.8 23.1 20.3 22 20.3 25.4C20.3 26.8 19 27.6 17.2 27.6C15.5 27.6 13.7 26.8 12.2 26V29.4C13.8 30.1 15.6 30.5 17.2 30.5C21.7 30.5 25.5 28.5 25.5 24.2C25.5 17.7 15.4 18.9 15.4 16.5Z" />
        </svg>
      ),
      bg: "bg-[#635BFF]",
      label: "Pagamentos"
    },
    {
      name: "PushinPay",
      icon: <Zap className="size-6 text-white" />,
      bg: "bg-gradient-to-br from-[#5D5FEF] to-[#9B5CFA]",
      label: "Pix"
    },
    {
      name: "UTMify",
      icon: (
        <div className="font-mono font-black text-white text-xs">UTM</div>
      ),
      bg: "bg-gradient-to-br from-[#00C2FF] to-[#0047FF]",
      label: "Rastreamento"
    },
    {
      name: "Resend",
      icon: <Mail className="size-6 text-white" />,
      bg: "bg-black",
      label: "E-mail"
    }
  ];

  return (
    <div className="relative space-y-16">
      <div className="space-y-4 text-center">
        <h2 className="text-2xl md:text-3xl font-brand tracking-tight text-foreground/90">
          Ecossistema de <span className="text-primary">Alta Performance</span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
          Integrações nativas com as maiores stacks do mercado para maximizar seus resultados.
        </p>
      </div>

      <div className="relative w-full">
        {/* Mirror effect overlay inspired by reference images */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

        <InfiniteSlider gap={40} speed={40} className="py-4">
          {integrations.concat(integrations).map((integ, idx) => (
            <div
              key={`${integ.name}-${idx}`}
              className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-[#0B0D11]/40 px-6 py-4 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-[#0B0D11]/60"
            >
              <div className={cn(
                "flex size-12 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-110",
                integ.bg
              )}>
                {integ.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{integ.name}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{integ.label}</span>
              </div>
            </div>
          ))}
        </InfiniteSlider>
      </div>
    </div>
  );
}
