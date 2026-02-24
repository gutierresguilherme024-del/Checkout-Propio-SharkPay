import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export default function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleLogin() {
        setLoading(true)
        setErro('')
        const { error } = await supabase.auth.signInWithPassword({
            email, password: senha
        })
        if (error) {
            setErro('Email ou senha incorretos.')
            setLoading(false)
            return
        }
        navigate('/admin/overview')
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-slate-950 px-4'>
            <div className='w-full max-w-sm bg-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-800'>
                <div className='flex justify-center mb-8'>
                    <h1 className='text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent'>
                        SharkPay
                    </h1>
                </div>
                <h2 className='text-xl font-semibold text-white mb-6 text-center'>
                    Acesso Administrativo
                </h2>

                <div className='space-y-4'>
                    <div>
                        <label className='block text-sm font-medium text-slate-400 mb-1 ml-1'>Email</label>
                        <input
                            type='email'
                            placeholder='seu@email.com'
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className='w-full px-4 py-3 rounded-xl bg-slate-800 text-white
                         border border-slate-700 focus:border-indigo-500
                         focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all'
                        />
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-slate-400 mb-1 ml-1'>Senha</label>
                        <input
                            type='password'
                            placeholder='••••••••'
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            className='w-full px-4 py-3 rounded-xl bg-slate-800 text-white
                         border border-slate-700 focus:border-indigo-500
                         focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all'
                        />
                    </div>

                    {erro && (
                        <div className='bg-red-500/10 border border-red-500/20 py-2 rounded-lg'>
                            <p className='text-red-400 text-sm text-center font-medium'>{erro}</p>
                        </div>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className='w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500
                       text-white font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50'
                    >
                        {loading ? 'Entrando...' : 'Entrar no Painel'}
                    </button>
                </div>

                <p className='mt-8 text-center text-xs text-slate-500'>
                    © 2025 SharkPay. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}
