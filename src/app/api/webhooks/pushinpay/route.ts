import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'placeholder'
);

// We'll define dispararEntrega later or import it
async function dispararEntrega(pedido: any) {
    // Fallsback to HTTP webhook for n8n if MCP not available server-side
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
        await fetch(process.env.N8N_WEBHOOK_URL || '', {
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
    try {
        const signature = req.headers.get('x-webhook-signature') ?? '';
        const rawBody = await req.text();
        const secret = process.env.PUSHINPAY_WEBHOOK_SECRET || 'placeholder';
        const expected = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        if (signature !== expected) {
            return new Response('Unauthorized', { status: 401 });
        }

        const payload = JSON.parse(rawBody);

        if (payload.status !== 'PAID') {
            return NextResponse.json({ ok: true });
        }

        // Update order
        const { data: pedido, error } = await supabase
            .from('pedidos')
            .select('*, produtos(*)')
            .eq('id', payload.external_reference)
            .eq('status', 'pendente')
            .single();

        if (error || !pedido) return NextResponse.json({ ok: true });

        const pago_em = new Date().toISOString();
        await supabase.from('pedidos').update({
            status: 'pago',
            pago_em
        }).eq('id', pedido.id);

        // Call delivery automation
        pedido.pago_em = pago_em;
        await dispararEntrega(pedido);

        return NextResponse.json({ ok: true });

    } catch (error: any) {
        console.error('PushinPay Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
