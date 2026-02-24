import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// Supabase client compatível com Next.js (process.env)
// import.meta.env é removido pois não existe no SSR do Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export only the browser handler to avoid bundling node-only code (server.ts) in Vite
export * from './client';
