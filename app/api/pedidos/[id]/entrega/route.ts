import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
);

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { entregue, entregue_em } = await req.json();

        // Verify Auth (internal secret)
        const auth = req.headers.get('Authorization');
        if (auth !== `Bearer ${process.env.APP_API_KEY}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { error } = await supabase
            .from('pedidos')
            .update({
                entregue,
                entregue_em: entregue_em || new Date().toISOString()
            })
            .eq('id', params.id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
