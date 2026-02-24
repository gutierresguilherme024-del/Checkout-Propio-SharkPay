import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// Legacy Supabase client for Vite components
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');

// Export only the browser handler to avoid bundling node-only code (server.ts) in Vite
export * from './client';
