'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
    // Suporte híbrido para Next.js (process.env) e Vite (import.meta.env)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials not found in environment variables');
    }

    return createBrowserClient(
        supabaseUrl || '',
        supabaseAnonKey || ''
    )
}
