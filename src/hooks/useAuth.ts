import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // CORREÇÃO IPHONE - Forçar verificação rápida e evitar estado de carregamento infinito
        const checkSession = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
            } catch (e) {
                console.error("[Auth] Erro ao recuperar sessão:", e);
            } finally {
                setLoading(false);
            }
        };
        
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            setSession(currentSession);
            setLoading(false);
        });

        return () => subscription.unsubscribe()
    }, [])

    return { session, loading }
}