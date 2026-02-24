import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckoutCoreSidebar } from '@/components/admin/CheckoutCoreSidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

export default async function AdminLayout({
    children
}: { children: React.ReactNode }) {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) redirect('/login')

    return (
        <SidebarProvider>
            <div className='flex h-screen bg-slate-950 w-full'>
                <CheckoutCoreSidebar />
                <main className='flex-1 overflow-auto p-4 md:p-8 w-full'>
                    {children}
                </main>
            </div>
        </SidebarProvider>
    )
}
