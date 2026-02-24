"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
    const searchParams = useSearchParams();
    const pedidoId = searchParams?.get('pedido');

    return (
        <Card className="max-w-md w-full text-center p-8 rounded-3xl shadow-2xl border-none">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                        <CheckCircle2 className="size-16 text-green-500" />
                    </div>
                </div>
                <CardTitle className="text-3xl font-extrabold">Pagamento Confirmado!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <p className="text-slate-500">
                    Parabéns! Sua compra foi processada com sucesso.
                </p>

                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3 text-left">
                    <Mail className="size-5 text-primary mt-1 shrink-0" />
                    <p className="text-sm">
                        Enviamos um e-mail com o seu acesso agora mesmo. Verifique sua caixa de entrada e também a pasta de spam.
                    </p>
                </div>

                <div className="pt-4">
                    <Button className="w-full h-12 rounded-xl" asChild>
                        <Link href="/">
                            Voltar ao Início <ArrowRight className="ml-2 size-4" />
                        </Link>
                    </Button>
                </div>

                <p className="text-[10px] text-slate-400">
                    ID do Pedido: {pedidoId || '---'}
                </p>
            </CardContent>
        </Card>
    );
}

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <Suspense fallback={<div>Carregando...</div>}>
                <SuccessContent />
            </Suspense>
        </div>
    );
}
