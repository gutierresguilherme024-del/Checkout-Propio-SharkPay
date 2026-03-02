import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { CheckCircle2, ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function Sucesso() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const pedidoId = searchParams.get("pedido");
    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<any>(null);

    useEffect(() => {
        async function trackPurchase() {
            if (!pedidoId) {
                setLoading(false);
                return;
            }

            const { data } = await supabase
                .from('pedidos')
                .select('*')
                .eq('id', pedidoId)
                .single();

            if (data) {
                setOrderData(data);

                // --- DISPARO DE TRACKING ---
                const eventPayload = {
                    event: 'Purchase',
                    value: data.valor,
                    currency: 'BRL',
                    pedido_id: data.id,
                    email: data.email_comprador || data.email,
                    nome: data.nome_comprador || data.nome
                };

                // 1. UTMify (Janela global)
                if ((window as any).utmHelper) {
                    (window as any).utmHelper.send('Purchase', eventPayload);
                }

                // 2. Auditoria Interna
                await supabase.from('logs_sistema').insert({
                    tipo: 'audit',
                    gateway: 'tracking',
                    evento: 'Purchase',
                    pedido_id: data.id,
                    mensagem: `Venda de R$ ${data.valor} (${data.metodo_pagamento}) rastreada no sucesso.`
                });
            }
            setLoading(false);
        }
        trackPurchase();
    }, [pedidoId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center bg-slate-950" style={{ minHeight: '100dvh' }}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Confirmando pagamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center bg-slate-950 p-4" style={{ minHeight: '100dvh' }}>
            <div className="w-full max-w-md">
                {/* Card principal */}
                <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 via-slate-900 to-slate-950 p-8 text-center shadow-2xl shadow-emerald-500/5">
                    {/* Glow de fundo */}
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />

                    {/* Ícone de sucesso */}
                    <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/10">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">
                        Pagamento Confirmado! 🎉
                    </h1>
                    <p className="text-muted-foreground text-sm mb-6">
                        Obrigado pela sua compra. Seu produto será entregue
                        automaticamente no e-mail cadastrado.
                    </p>

                    {/* Info do pedido */}
                    <div className="space-y-3 mb-8">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                <span>Entrega</span>
                            </div>
                            <span className="text-sm text-emerald-400 font-medium">Por e-mail</span>
                        </div>
                        {pedidoId && (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                                <span className="text-sm text-muted-foreground">Pedido</span>
                                <span className="text-sm font-mono text-slate-300">{pedidoId}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Aprovado
                            </span>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="space-y-3">
                        <Button asChild className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 h-12 text-base shadow-lg shadow-emerald-900/30">
                            <NavLink to="/">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar para Home
                            </NavLink>
                        </Button>
                    </div>

                    {/* Rodapé */}
                    <div className="mt-8 pt-6 border-t border-slate-700/30">
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                            🔒 Transação processada com segurança
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
