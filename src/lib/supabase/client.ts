'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
    // Suporte robusto para Next.js e Vite, evitando quebra no build do Next.js
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_SUPABASE_URL : '') ||
        (globalThis as any).import?.meta?.env?.VITE_SUPABASE_URL;

    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '') ||
        (globalThis as any).import?.meta?.env?.VITE_SUPABASE_ANON_KEY;

    return createBrowserClient(
        supabaseUrl || '',
        supabaseAnonKey || ''
    )
}
