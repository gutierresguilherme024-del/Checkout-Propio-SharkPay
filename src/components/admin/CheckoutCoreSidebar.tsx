import { useMemo } from "react";
import { useLocation } from "react-router-dom";
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
import { NavLink } from "@/components/NavLink";
import { BarChart3, CreditCard, Home, Link2, Mail, Palette } from "lucide-react";

const items = [
  { title: "Visão Geral", url: "/admin/overview", icon: BarChart3, emoji: "📊" },
  { title: "Rastreamento", url: "/admin/tracking", icon: Link2, emoji: "🔗" },
  { title: "Pagamentos", url: "/admin/payments", icon: CreditCard, emoji: "💳" },
  { title: "Entrega de Produto", url: "/admin/delivery", icon: Mail, emoji: "📧" },
  { title: "Editor de Checkout", url: "/admin/editor", icon: Palette, emoji: "🎨" },
] as const;

export function CheckoutCoreSidebar() {
  const { state, isMobile, setOpen } = useSidebar();
  const collapsed = state === "collapsed";

  const location = useLocation();

  const currentPath = location.pathname;
  const activeUrl = useMemo(() => items.find((i) => i.url === currentPath)?.url ?? "", [currentPath]);

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
      {/* Rail: facilita demonstrar que o sidebar pode ser reaberto/ajustado */}
      <SidebarRail />

      {/* Container flex para garantir divisão/rodapé consistentes */}
      <div className="flex h-full min-h-0 flex-col">
        <SidebarHeader className="gap-2 px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm">
            <div className="grid size-9 place-items-center rounded-md bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-glow)]">
              <span className="text-sm font-semibold">CC</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Checkout Core</p>
                <p className="truncate text-xs text-muted-foreground">v2 • uso interno</p>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const active = activeUrl === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={`${item.emoji} ${item.title}`}>
                        <NavLink to={item.url} end className="group flex items-center gap-2" activeClassName="">
                          <item.icon className="shrink-0" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </NavLink>
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
                <SidebarMenuButton asChild tooltip="🏠 Voltar para Home">
                  <NavLink to="/" end className="group flex items-center gap-2" activeClassName="">
                    <Home className="shrink-0" />
                    {!collapsed && <span className="truncate">Voltar para Home</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </div>
      </div>
    </Sidebar>
  );
}
