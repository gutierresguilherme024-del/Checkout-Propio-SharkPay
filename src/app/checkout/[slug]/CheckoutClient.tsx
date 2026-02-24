"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Shield, Check, Clock, Copy, Landmark, CreditCard } from "lucide-react";

interface Product {
    id: string;
    nome: string;
    descricao: string | null;
    preco: number;
    imagem_url: string | null;
}

export default function CheckoutClient({ produto }: { produto: Product }) {
    const [method, setMethod] = useState<"pix" | "cartao">("pix");
    const [loading, setLoading] = useState(false);
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [cpf, setCpf] = useState("");
    const [pixData, setPixData] = useState<any>(null);
    const [pedidoId, setPedidoId] = useState<string | null>(null);

    async function handlePay() {
        if (!nome || !email) {
            toast.error("Preencha seu nome e e-mail");
            return;
        }

        setLoading(true);
        try {
            if (method === 'pix') {
                const res = await fetch('/api/checkout/pix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ produto_id: produto.id, nome, email, cpf })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setPixData(data);
                setPedidoId(data.pedido_id);
                // Start polling
                startPolling(data.pedido_id);
            } else {
                const res = await fetch('/api/checkout/cartao', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ produto_id: produto.id, nome, email })
                });
                const data = await res.json();
                if (data.checkout_url) {
                    window.location.href = data.checkout_url;
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao processar pagamento");
        } finally {
            setLoading(false);
        }
    }

    function startPolling(id: string) {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/checkout/status?pedido_id=${id}`);
                const data = await res.json();
                if (data.status === 'pago') {
                    clearInterval(interval);
                    toast.success("Pagamento confirmado! Verifique seu e-mail.");
                    window.location.href = `/checkout/sucesso?pedido=${id}`;
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 5000);
        return () => clearInterval(interval);
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Product Info */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">SP</div>
                        <span className="font-bold text-xl">SharkPay</span>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold tracking-tight">{produto.nome}</h1>
                        <p className="text-slate-500 text-lg">{produto.descricao}</p>
                    </div>

                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center text-2xl font-bold">
                            <span>Total hoje</span>
                            <span className="text-primary">R$ {produto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <ul className="space-y-3">
                        {["Acesso imediato", "Entrega por e-mail", "Garantia de 7 dias"].map(f => (
                            <li key={f} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <Check className="size-5 text-green-500" /> {f}
                            </li>
                        ))}
                    </ul>

                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Shield className="size-4" /> Pagamento 100% Seguro
                    </div>
                </div>

                {/* Form */}
                <Card className="rounded-3xl shadow-xl border-none">
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">Suas Informações</h2>
                            <div className="space-y-2">
                                <Label>Nome Completo</Label>
                                <Input placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>E-mail</Label>
                                <Input placeholder="seu@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            {method === 'pix' && (
                                <div className="space-y-2">
                                    <Label>CPF (para nota)</Label>
                                    <Input placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(e.target.value)} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">Forma de Pagamento</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setMethod('pix')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                        method === 'pix' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                                    )}
                                >
                                    <Landmark className={cn("size-6", method === 'pix' ? "text-primary" : "text-slate-400")} />
                                    <span className="font-medium">PIX</span>
                                </button>
                                <button
                                    onClick={() => setMethod('cartao')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                        method === 'cartao' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                                    )}
                                >
                                    <CreditCard className={cn("size-6", method === 'cartao' ? "text-primary" : "text-slate-400")} />
                                    <span className="font-medium">Cartão</span>
                                </button>
                            </div>
                        </div>

                        {!pixData ? (
                            <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={handlePay} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {method === 'pix' ? "Gerar QR Code PIX" : "Pagar Agora"}
                            </Button>
                        ) : (
                            <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-primary/50 text-center animate-in fade-in zoom-in duration-300">
                                <div className="flex justify-center">
                                    <img src={pixData.qr_code} alt="QR Code PIX" className="w-48 h-48 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-500">Escaneie o código no app do seu banco</p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Input readOnly value={pixData.qr_code_text} className="bg-white" />
                                        <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(pixData.qr_code_text); toast.success("Copiado!"); }}>
                                            <Copy className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs text-orange-500 font-medium">
                                    <Clock className="size-3" /> Aguardando pagamento...
                                </div>
                            </div>
                        )}

                        <div className="text-center text-slate-400 text-xs flex items-center justify-center gap-1">
                            <Lock className="size-3" /> Pagamento Seguro via SharkPay
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
