import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import CheckoutClient from './CheckoutClient';

export default async function CheckoutPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_KEY as string
    );

    const { data: produto, error } = await supabase
        .from('produtos')
        .select('id, nome, descricao, preco, imagem_url, checkout_slug')
        .eq('checkout_slug', slug)
        .eq('ativo', true)
        .single();

    if (error || !produto) {
        return notFound();
    }

    return <CheckoutClient produto={produto} />;
}
