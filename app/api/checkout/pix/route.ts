import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
);

export async function POST(req: Request) {
    try {
        const { produto_id, nome, email, cpf } = await req.json();

        // 1. Get Product
        const { data: produto, error: pError } = await supabase
            .from('produtos').select('*').eq('id', produto_id).single();

        if (pError || !produto) throw new Error('Produto não encontrado');

        // 2. Create Pending Order
        const { data: pedido, error: ordError } = await supabase.from('pedidos').insert({
            produto_id,
            email_comprador: email,
            nome_comprador: nome,
            cpf_comprador: cpf,
            valor: produto.preco,
            metodo_pagamento: 'pix',
            gateway: 'pushinpay',
            status: 'pendente'
        }).select().single();

        if (ordError) throw ordError;

        // 3. Call PushinPay API
        const pushinRes = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PUSHINPAY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                value: Math.round(produto.preco * 100), // cents
                webhook_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/pushinpay`,
                external_reference: pedido.id,
            })
        });

        if (!pushinRes.ok) {
            const errorText = await pushinRes.text();
            console.error('PushinPay Error:', errorText);
            throw new Error('Erro ao gerar PIX no gateway');
        }

        const pix = await pushinRes.json();

        // 4. Update order with gateway ID
        await supabase.from('pedidos').update({
            gateway_payment_id: pix.id
        }).eq('id', pedido.id);

        return NextResponse.json({
            pedido_id: pedido.id,
            qr_code: pix.qr_code,
            qr_code_text: pix.qr_code_text,
            expires_at: pix.expiration_date
        });

    } catch (error: any) {
        console.error('PIX Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
