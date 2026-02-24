import { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CheckoutCoreSidebar } from "@/components/admin/CheckoutCoreSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const titles: Record<string, string> = {
  "/admin/overview": "Visão Geral",
  "/admin/tracking": "Rastreamento",
  "/admin/payments": "Pagamentos",
  "/admin/delivery": "Entrega de Produto",
  "/admin/editor": "Editor de Checkout",
};

export default function AdminLayout() {
  const location = useLocation();

  const pageTitle = useMemo(() => {
    return titles[location.pathname] ?? "Painel administrativo";
  }, [location.pathname]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "300px",
          "--sidebar-width-icon": "60px",
        } as React.CSSProperties
      }
    >
      <div className="min-h-svh flex w-full">
        <CheckoutCoreSidebar />

        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/70 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Left: sidebar + brand */}
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="-ml-1" />

              <div className="hidden items-center gap-2 sm:flex">
                <div className="grid size-8 place-items-center rounded-md bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-glow)]">
                  <span className="text-xs font-semibold">CC</span>
                </div>
                <span className="text-sm font-semibold leading-none">Checkout Core</span>
              </div>

              <div className="hidden h-6 w-px bg-border sm:block" />
            </div>

            {/* Middle: page context */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{pageTitle}</p>
              <p className="hidden truncate text-xs text-muted-foreground md:block">
                Dica: Ctrl/Cmd + B para recolher/abrir
              </p>
            </div>

            {/* Right: utilities */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 p-4 md:p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

