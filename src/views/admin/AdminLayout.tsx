import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CheckoutCoreSidebar } from "@/components/admin/CheckoutCoreSidebar";

export default function AdminLayout() {
    return (
        <SidebarProvider>
            <div className="flex h-screen bg-slate-950 w-full relative overflow-hidden">
                {/* Background overlay for theme consistency */}
                <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-20 mix-blend-overlay" />

                <CheckoutCoreSidebar />
                <main className="flex-1 overflow-auto p-4 md:p-8 w-full relative z-10">
                    <Outlet />
                </main>
            </div>
        </SidebarProvider>
    );
}
