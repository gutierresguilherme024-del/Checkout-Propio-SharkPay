import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
);

export async function POST(req: Request) {
    try {
        const { produto_id, nome, email } = await req.json();

        // 1. Get Product
        const { data: produto, error: pError } = await supabase
            .from('produtos').select('*').eq('id', produto_id).single();

        if (pError || !produto) throw new Error('Produto não encontrado');

        // 2. Create Pending Order
        const { data: pedido, error: ordError } = await supabase.from('pedidos').insert({
            produto_id,
            email_comprador: email,
            nome_comprador: nome,
            valor: produto.preco,
            metodo_pagamento: 'cartao',
            gateway: 'stripe',
            status: 'pendente'
        }).select().single();

        if (ordError) throw ordError;

        // 3. Create Stripe Session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price: produto.stripe_price_id, quantity: 1 }],
            customer_email: email,
            success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/sucesso?pedido=${pedido.id}`,
            cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout/${produto.checkout_slug}`,
            metadata: {
                pedido_id: pedido.id,
                produto_id: produto_id,
            },
        });

        // 4. Update order with session ID
        await supabase.from('pedidos').update({
            gateway_payment_id: session.id
        }).eq('id', pedido.id);

        return NextResponse.json({ checkout_url: session.url });

    } catch (error: any) {
        console.error('Stripe Session Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
