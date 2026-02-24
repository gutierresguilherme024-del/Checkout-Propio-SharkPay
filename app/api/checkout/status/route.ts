import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const pedidoId = searchParams.get('pedido_id');

    if (!pedidoId) {
        return NextResponse.json({ error: 'Pedido ID é obrigatório' }, { status: 400 });
    }

    const { data: pedido, error } = await supabase
        .from('pedidos')
        .select('id, status')
        .eq('id', pedidoId)
        .single();

    if (error || !pedido) {
        return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ status: pedido.status });
}
