import { signOut } from '@/lib/supabase/auth'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

export function LogoutButton({ collapsed }: { collapsed?: boolean }) {
    const navigate = useNavigate()

    async function handleLogout() {
        try {
            await signOut()
            navigate('/login')
        } catch (error) {
            console.error('Erro ao sair:', error)
        }
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
