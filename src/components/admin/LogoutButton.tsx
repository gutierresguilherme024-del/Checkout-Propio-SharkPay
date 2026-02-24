'use client'
import { createSupabaseBrowserClient } from '../../lib/supabase/client.ts'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function LogoutButton({ collapsed }: { collapsed?: boolean }) {
    const supabase = createSupabaseBrowserClient()
    const router = useRouter()

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <button
            onClick={handleLogout}
            className='flex w-full items-center gap-2 px-2 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors'
        >
            <LogOut className='size-4 shrink-0' />
            {!collapsed && <span>Sair do Painel</span>}
        </button>
    )
}
