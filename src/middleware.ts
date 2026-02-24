// middleware.ts — RAIZ do projeto
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request: { headers: request.headers } })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) { return request.cookies.get(name)?.value },
                set(name, value, options) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({ request: { headers: request.headers } })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name, options) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({ request: { headers: request.headers } })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // Busca sessão atual
    const { data: { session } } = await supabase.auth.getSession()

    // Rota /admin/* sem sessão → redireciona para /login
    if (!session && request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Já logado tentando acessar /login → redireciona para /admin
    if (session && request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/admin', request.url))
    }

    return response
}

// Define quais rotas o middleware intercepta
export const config = {
    matcher: ['/admin/:path*', '/login'],
}
