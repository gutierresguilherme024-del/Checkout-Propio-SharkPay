import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'placeholder'
);

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const nome = formData.get('nome') as string;
        const preco = Number(formData.get('preco'));
        const descricao = formData.get('descricao') as string;
        const pdfFile = formData.get('arquivo_pdf') as File;
        const imageFile = formData.get('imagem_capa') as File;

        if (!nome || !preco || !pdfFile) {
            return NextResponse.json({ error: 'Faltam campos obrigatórios (nome, preço, PDF)' }, { status: 400 });
        }

        // 1. Upload PDF to Supabase Storage (private bucket)
        const pdfBuffer = await pdfFile.arrayBuffer();
        const pdfKey = `produtos/${crypto.randomUUID()}_${pdfFile.name}`;
        const { error: pdfError } = await supabase.storage
            .from('produtos-pdf')
            .upload(pdfKey, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (pdfError) throw pdfError;

        // 2. Upload Image if provided
        let imageUrl = null;
        if (imageFile) {
            const imgBuffer = await imageFile.arrayBuffer();
            const imgKey = `capas/${crypto.randomUUID()}_${imageFile.name}`;
            const { data: imgData, error: imgError } = await supabase.storage
                .from('produtos-pdf')
                .upload(imgKey, imgBuffer);
            if (imgError) console.error('Error uploading image:', imgError);
            else imageUrl = imgData.path;
        }

        // 3. Create Product in Stripe
        const stripeProd = await stripe.products.create({
            name: nome,
            description: descricao,
        });

        // 4. Create Price in Stripe
        const stripePrice = await stripe.prices.create({
            product: stripeProd.id,
            unit_amount: Math.round(preco * 100), // cents
            currency: 'brl',
        });

        // 5. Generate Slug
        const slug = nome.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            + '-' + Math.random().toString(36).substring(2, 5);

        // 6. Save to Supabase
        const { data, error: dbError } = await supabase.from('produtos').insert({
            nome,
            preco,
            descricao,
            pdf_storage_key: pdfKey,
            imagem_url: imageUrl,
            stripe_product_id: stripeProd.id,
            stripe_price_id: stripePrice.id,
            checkout_slug: slug,
            ativo: true
        }).select().single();

        if (dbError) throw dbError;

        return NextResponse.json({
            produto: data,
            checkout_url: `${process.env.NEXT_PUBLIC_URL}/checkout/${slug}`
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
