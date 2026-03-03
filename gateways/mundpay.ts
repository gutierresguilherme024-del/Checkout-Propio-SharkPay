import { Gateway } from '../core/gatewayInterface';

export const mundpay: Gateway = {
    async createCharge(data: any): Promise<any> {
        const { cpf, phone, mundpay_url, email, nome, valor, pid, checkout_slug, utm_source, productOwnerId, supabase } = data;

        if (!mundpay_url) {
            throw new Error('URL do checkout MundPay não configurada para este produto.');
        }

        try {
            // ⚠️ VALIDAÇÃO JÁ FOI FEITA NO process-payment.ts
            // Esta validação aqui é redundante mas mantida como fallback defensivo
            const nomeParts = nome?.trim().split(' ').filter(Boolean)
            if (!nomeParts || nomeParts.length < 2) {
                throw new Error('Por favor, informe nome e sobrenome.')
            }

            // 1. Registrar pedido pendente no SharkPay
            const { produto_nome } = data;
            const { data: insertData, error: insertError } = await supabase
                .from('pedidos')
                .insert({
                    id: pid,
                    pedido_id: pid,  // ✅ Campo obrigatório para compatibilidade
                    user_id: productOwnerId,
                    email_comprador: email,
                    nome_comprador: nome,
                    produto_nome: produto_nome || '',  // ✅ Campo obrigatório
                    valor: Number(valor),
                    metodo_pagamento: 'pix',
                    status: 'pendente',
                    gateway: 'mundpay',
                    utm_source: utm_source || null,
                    checkout_slug: checkout_slug || null
                })
                .select()
                .single()

            if (insertError) {
                console.error('[mundpay] Erro ao inserir pedido:', insertError)
                // ✅ Mostrar erro específico do Supabase (não genérico)
                throw new Error(insertError.message || insertError.hint || 'Falha ao registrar pedido no banco')
            }

            // 2. Montar URL do checkout MundPay com TODOS os dados do comprador
            const checkoutUrl = new URL(mundpay_url)
            if (nome) checkoutUrl.searchParams.set('name', nome)
            if (email) checkoutUrl.searchParams.set('email', email)
            if (cpf) {
                const cpfLimpo = cpf.replace(/\D/g, '')
                checkoutUrl.searchParams.set('document', cpfLimpo)
                checkoutUrl.searchParams.set('cpf', cpfLimpo)
            }
            if (phone) {
                const phoneDigits = phone.replace(/\D/g, '')
                checkoutUrl.searchParams.set('phone', phoneDigits)
                checkoutUrl.searchParams.set('phone_number', phoneDigits)
            }
            // Parâmetros de Localização e Moeda
            checkoutUrl.searchParams.set('locale', 'pt_BR')
            checkoutUrl.searchParams.set('lang', 'pt_BR')
            checkoutUrl.searchParams.set('currency', 'BRL')
            checkoutUrl.searchParams.set('country', 'BR')

            // Força a seleção do PIX
            checkoutUrl.searchParams.set('payment_method', 'pix')
            checkoutUrl.searchParams.set('method', 'pix')
            checkoutUrl.searchParams.set('pay_method', 'pix')

            // Rastreabilidade para Webhooks
            checkoutUrl.searchParams.set('external_id', pid)
            checkoutUrl.searchParams.set('metadata[pedido_id]', pid)
            checkoutUrl.searchParams.set('reference', pid)

            // 3. LOG DE GERAÇÃO DE PIX (MUNDPAY INITIATED)
            try {
                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'gateway',
                    gateway: 'mundpay',
                    evento: 'pix_gerado',
                    pedido_id: pid,
                    mensagem: `Checkout Pix iniciado via MundPay para ${email}`
                } as any)
            } catch { /* ignora */ }

            return {
                checkout_url: checkoutUrl.toString(),
                pedido_id: pid,
                gateway: 'mundpay'
            };

        } catch (err: any) {
            console.error('[process-payment/mundpay]:', err)
            try {
                await supabase.from('pedidos').update({ status: 'falhou' } as any).eq('id', pid)

                await supabase.from('logs_sistema').insert({
                    user_id: productOwnerId,
                    tipo: 'gateway',
                    gateway: 'mundpay',
                    evento: 'pix_erro',
                    pedido_id: pid,
                    sucesso: false,
                    mensagem: `Erro ao iniciar MundPay: ${err.message}`
                } as any)
            } catch { /* ignora */ }
            throw new Error(err.message || 'Erro ao processar pagamento MundPay');
        }
    },

    async handleWebhook(payload: any): Promise<any> {
        return { status: 'not_implemented' };
    }
}
