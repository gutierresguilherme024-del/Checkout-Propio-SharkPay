'use client'
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

// import { NavLink } from "@/components/NavLink"; // Removido
import { BarChart3, Bot, CreditCard, Home, Link2, Mail, Palette, Package, Moon, Sun, Settings } from "lucide-react";
import { useIntegrations } from "@/hooks/use-integrations";
import { LogoutButton } from "./LogoutButton";
import { useTheme } from "../theme/ThemeProvider";

const items = [
  { title: "Visão Geral", url: "/admin/overview", icon: BarChart3, emoji: "📊", badge: null },
  {
    title: "Rastreamento",
    url: "/admin/tracking",
    icon: Link2,
    emoji: "🔗",
    badge: { label: "UTMify", color: "bg-[hsl(220,80%,55%)] text-white" },
  },
  {
    title: "Pagamentos",
    url: "/admin/payments",
    icon: CreditCard,
    emoji: "💳",
    badge: { label: "2 gateways", color: "bg-[hsl(260,85%,60%)] text-white" },
  },
  { title: "Produtos", url: "/admin/products", icon: Package, emoji: "📦", badge: null },
  { title: "Entrega de Produto", url: "/admin/delivery", icon: Mail, emoji: "📧", badge: null },
  { title: "Editor de Checkout", url: "/admin/editor", icon: Palette, emoji: "🎨", badge: null },
] as const;

export function CheckoutCoreSidebar() {
  const { state, isMobile, setOpen } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";
  const { activeGatewaysCount, activeTrackingCount, loading } = useIntegrations();

  const dynamicItems = useMemo(() => [
    { title: "Visão Geral", url: "/admin/overview", icon: BarChart3, emoji: "📊", badge: null },
    {
      title: "Rastreamento",
      url: "/admin/tracking",
      icon: Link2,
      emoji: "🔗",
      badge: {
        label: loading ? "..." : (activeTrackingCount > 0 ? "Ativo" : "Inativo"),
        color: activeTrackingCount > 0 ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.4)]" : "bg-muted text-muted-foreground"
      },
    },
    {
      title: "Pagamentos",
      url: "/admin/payments",
      icon: CreditCard,
      emoji: "💳",
      badge: {
        label: loading ? "..." : `${activeGatewaysCount} gateways`,
        color: activeGatewaysCount > 0 ? "bg-accent text-accent-foreground shadow-[0_0_12px_hsl(var(--accent)/0.4)]" : "bg-destructive/20 text-destructive border border-destructive/30"
      },
    },
    { title: "Produtos", url: "/admin/products", icon: Package, emoji: "📦", badge: null },
    { title: "Entrega de Produto", url: "/admin/delivery", icon: Mail, emoji: "📧", badge: null },
    { title: "Editor de Checkout", url: "/admin/editor", icon: Palette, emoji: "🎨", badge: null },
    {
      title: "Agente IA",
      url: "/admin/agente",
      icon: Bot,
      emoji: "🤖",
      badge: { label: "LLM", color: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]" },
    },
  ], [activeGatewaysCount, activeTrackingCount, loading]);

  const { pathname } = useLocation();
  const activeUrl = useMemo(
    () => dynamicItems.find((i) => i.url === pathname)?.url ?? "",
    [pathname, dynamicItems]
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      onMouseEnter={() => {
        if (!isMobile) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!isMobile) setOpen(false);
      }}
    >
      <SidebarRail />

      <div className="flex h-full min-h-0 flex-col">
        <SidebarHeader className="gap-2 px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm">
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold font-display">Painel Administrativo</p>
                <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Uso interno</p>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dynamicItems.map((item) => {
                  const active = activeUrl === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={`${item.emoji} ${item.title}`}
                      >
                        <Link
                          to={item.url}
                          className="group flex items-center gap-2"
                        >
                          <item.icon className="shrink-0" />
                          {!collapsed && (
                            <span className="flex flex-1 items-center justify-between truncate">
                              <span className="truncate">{item.title}</span>
                              {item.badge && (
                                <span
                                  className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${item.badge.color} transition-all duration-300`}
                                >
                                  {item.badge.label}
                                </span>
                              )}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Rodapé fixo no final */}
        <div className="mt-auto">
          <SidebarSeparator />
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Alternar Tema"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 transition-colors">
                    <div className="relative flex h-4 w-4 items-center justify-center">
                      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none overflow-hidden text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Aparência</span>
                    <span className="text-sm font-medium truncate">
                      {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                    </span>
                  </div>
                </SidebarMenuButton>

              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="🏠 Voltar para Home">
                  <Link to="/" className="group flex items-center gap-2">
                    <Home className="shrink-0" />
                    {!collapsed && <span className="truncate text-sm">Voltar para Home</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <LogoutButton collapsed={collapsed} />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </div>
      </div>
    </Sidebar>
  );
}
