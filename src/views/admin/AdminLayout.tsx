import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CheckoutCoreSidebar } from "@/components/admin/CheckoutCoreSidebar";
import { PanelLeft } from "lucide-react";

export default function AdminLayout() {
    return (
        <SidebarProvider>
            <div className="flex h-screen bg-background w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-20 mix-blend-overlay dark:opacity-40" />

                <CheckoutCoreSidebar />

                <div className="flex flex-col flex-1 overflow-hidden relative z-10 w-full">
                    {/* Botão flutuante para Mobile se a sidebar estiver fechada */}
                    <header className="flex h-14 items-center gap-4 border-b bg-background/50 backdrop-blur-md px-4 md:hidden shrink-0">
                        <SidebarTrigger className="-ml-1" />
                        <div className="flex-1">
                            <h1 className="text-sm font-bold font-display uppercase tracking-wider text-muted-foreground/80">Painel</h1>
                        </div>
                    </header>

                    <main className="flex-1 overflow-auto p-4 md:p-8 w-full">
                        <Outlet />
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
