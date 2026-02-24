import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
);

async function dispararEntrega(pedido: any) {
    const { data: urlData } = await supabase.storage
        .from('produtos-pdf')
        .createSignedUrl(pedido.produtos.pdf_storage_key, 60 * 60 * 24 * 7);

    const payload = {
        event: 'PAGAMENTO_CONFIRMADO',
        pedido_id: pedido.id,
        email_comprador: pedido.email_comprador,
        nome_comprador: pedido.nome_comprador,
        nome_produto: pedido.produtos.nome,
        link_download: urlData?.signedUrl,
        valor: pedido.valor,
        pago_em: pedido.pago_em,
    };

    try {
        await fetch(process.env.N8N_WEBHOOK_URL as string, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-N8N-Secret': process.env.N8N_WEBHOOK_SECRET || ''
            },
            body: JSON.stringify(payload)
        });

        await supabase.from('pedidos').update({
            entrega_iniciada_em: new Date().toISOString()
        }).eq('id', pedido.id);
    } catch (e) {
        console.error('Error triggering n8n:', e);
    }
}

export async function POST(req: Request) {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET as string
        );
    } catch (err: any) {
        console.error('Stripe Webhook Verification Failed:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const pedidoId = session.metadata?.pedido_id;

        if (pedidoId) {
            const { data: pedido, error } = await supabase
                .from('pedidos')
                .select('*, produtos(*)')
                .eq('id', pedidoId)
                .eq('status', 'pendente')
                .single();

            if (pedido && !error) {
                const pago_em = new Date().toISOString();
                await supabase.from('pedidos').update({
                    status: 'pago',
                    pago_em
                }).eq('id', pedido.id);

                pedido.pago_em = pago_em;
                await dispararEntrega(pedido);
            }
        }
    }

    return NextResponse.json({ received: true });
}
