import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckoutCoreSidebar } from '@/components/admin/CheckoutCoreSidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children
}: { children: React.ReactNode }) {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) redirect('/login')

    return (
        <SidebarProvider>
            <div className='flex h-screen bg-slate-950 w-full relative overflow-hidden'>
                {/* Background overlay for theme consistency */}
                <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-20 mix-blend-overlay" />

                <CheckoutCoreSidebar />
                <main className='flex-1 overflow-auto p-4 md:p-8 w-full relative z-10'>
                    {children}
                </main>
            </div>
        </SidebarProvider>
    )
}
