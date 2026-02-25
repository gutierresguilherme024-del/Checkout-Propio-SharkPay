import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Login() {
    const navigate = useNavigate()
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleAuth() {
        setLoading(true)
        setErro('')

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email, password: senha
                })
                if (error) throw error
                navigate('/admin/overview')
            } else {
                const { error } = await supabase.auth.signUp({
                    email, password: senha
                })
                if (error) throw error
                setErro('Conta criada! Verifique seu email ou tente fazer login.')
                setIsLogin(true)
            }
        } catch (error: any) {
            setErro(error.message || 'Erro ao realizar a operação.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-background px-4 relative'>
            <div className="sco-page-topbar">
                <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2 h-9 px-3">
                    <NavLink to="/">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Home</span>
                    </NavLink>
                </Button>
            </div>
            <div className='w-full max-w-sm bg-card rounded-2xl p-8 shadow-2xl border border-border'>
                <div className='flex justify-center mb-8'>
                    <h1 className='text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent'>
                        SharkPay
                    </h1>
                </div>
                <h2 className='text-xl font-semibold text-foreground mb-6 text-center'>
                    {isLogin ? 'Acesso Administrativo' : 'Criar Conta'}
                </h2>

                <div className='space-y-4'>
                    <div>
                        <label className='block text-sm font-medium text-muted-foreground mb-1 ml-1'>Email</label>
                        <input
                            type='email'
                            placeholder='seu@email.com'
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className='w-full px-4 py-3 rounded-xl bg-muted/50 text-foreground
                         border border-border focus:border-primary
                         focus:outline-none focus:ring-1 focus:ring-primary transition-all'
                        />
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-slate-400 mb-1 ml-1'>Senha</label>
                        <input
                            type='password'
                            placeholder='••••••••'
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAuth()}
                            className='w-full px-4 py-3 rounded-xl bg-muted/50 text-foreground
                         border border-border focus:border-primary
                         focus:outline-none focus:ring-1 focus:ring-primary transition-all'
                        />
                    </div>

                    {erro && (
                        <div className='bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg'>
                            <p className='text-red-400 text-xs text-center font-medium'>{erro}</p>
                        </div>
                    )}

                    <button
                        onClick={handleAuth}
                        disabled={loading}
                        className='w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500
                       text-white font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50'
                    >
                        {loading ? 'Processando...' : (isLogin ? 'Entrar no Painel' : 'Criar Minha Conta')}
                    </button>

                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className='w-full text-muted-foreground text-sm hover:text-foreground transition-colors'
                    >
                        {isLogin ? 'Não tem conta? Crie uma agora' : 'Já tem conta? Faça login'}
                    </button>
                </div>

                <p className='mt-8 text-center text-xs text-slate-500'>
                    © 2026 SharkPay. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}
