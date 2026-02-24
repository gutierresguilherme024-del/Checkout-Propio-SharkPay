import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                async get(name) {
                    const cookieStore = await cookies()
                    return cookieStore.get(name)?.value
                },
                async set(name, value, options) {
                    const cookieStore = await cookies()
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // Server Component context
                    }
                },
                async remove(name, options) {
                    const cookieStore = await cookies()
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // Server Component context
                    }
                },
            },
        }
    )
}
