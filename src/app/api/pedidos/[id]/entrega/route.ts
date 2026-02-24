import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'placeholder'
);

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
