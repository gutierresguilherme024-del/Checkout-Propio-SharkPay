import { useQuery } from "@tanstack/react-query";
import { integrationService, type IntegrationSettings } from "@/lib/integrations";
import { supabase as supabaseClient } from "@/lib/supabase/client";

export function useIntegrations() {
    const { data: tracking = [], isLoading: loadingTracking } = useQuery({
        queryKey: ['integrations', 'tracking'],
        queryFn: () => integrationService.getSettings('tracking'),
        staleTime: 30_000,
        refetchInterval: 60_000, // Atualiza a cada 60s
        retry: 1,
    });

    const { data: payments = [], isLoading: loadingPayments } = useQuery({
        queryKey: ['integrations', 'payment'],
        queryFn: () => integrationService.getSettings('payment'),
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
    });

    const { data: automations = [], isLoading: loadingAutomations } = useQuery({
        queryKey: ['integrations', 'n8n'],
        queryFn: () => integrationService.getSettings('n8n'),
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
    });

    const { data: productCount = 0, isLoading: loadingProducts } = useQuery({
        queryKey: ['products', 'count'],
        queryFn: async () => {
            try {
                const { count, error } = await supabaseClient
                    .from('produtos' as any)
                    .select('*', { count: 'exact', head: true });
                if (error) return 0;
                return count || 0;
            } catch (e) {
                return 0;
            }
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const getStatus = (list: IntegrationSettings[], id: string) => {
        const item = list.find(i => i.id === id);

        // Failsafe: se nǜo encontrou no banco (tabela faltando ou vazia), 
        // checa se tem a chave configurada no ENV (Vercel)
        if (!item) {
            if (id === 'stripe') {
                const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
                return (envKey && !envKey.includes('placeholder')) ? "active" : "inactive";
            }
            if (id === 'pushinpay') {
                const envKey = import.meta.env.VITE_PUSHINPAY_TOKEN;
                return (envKey && envKey.length > 20 && !envKey.includes('placeholder')) ? "active" : "inactive";
            }
            if (id === 'mundpay') return "active";
            if (id === 'buypix') return "active";
            if (id === 'utmify') {
                const envKey = import.meta.env.VITE_UTMIFY_API_KEY;
                return (envKey && !envKey.includes('placeholder')) ? "active" : "inactive";
            }
            return "inactive";
        }

        if (!item.enabled) return "inactive";

        // Regras de validaǜo baseadas em regras-limitadas/limitaoes.md
        if (id === 'utmify') {
            const envKey = import.meta.env.VITE_UTMIFY_API_KEY;
            const hasEnv = envKey && !envKey.includes('placeholder');
            return (item.config.apiKey || item.config.utmScript || item.config.pixelId || hasEnv) ? "active" : "pending";
        }
        if (id === 'stripe') {
            const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
            const hasKeys = (item.config.pubKey && item.config.secKey);
            return (envKey || hasKeys) ? "active" : "pending";
        }
        if (id === 'pushinpay') {
            const envKey = import.meta.env.VITE_PUSHINPAY_TOKEN;
            const configKey = item.config.apiToken as string | undefined;
            const isRealToken = (k: string | undefined) =>
                !!k && k.length > 10 && !k.includes('placeholder') && !k.includes('pp_live_placeholder');
            return (isRealToken(envKey) || isRealToken(configKey)) ? "active" : "pending";
        }
        if (id === 'mundpay') return "active";
        if (id === 'buypix') {
            const hasKeys = !!item.config?.buypix_api_key && String(item.config.buypix_api_key).length > 10;
            return hasKeys ? "active" : "pending";
        }

        return "active";
    };

    return {
        tracking,
        payments,
        automations,
        loading: loadingTracking || loadingPayments || loadingAutomations || loadingProducts,
        getStatus,
        // Atalhos ǧteis - Consideram Envs mesmo se a lista estiver vazia
        isUtmifyActive: getStatus(tracking, 'utmify') === 'active',
        activeGatewaysCount: ['stripe', 'pushinpay', 'mundpay', 'buypix'].filter(id => getStatus(payments, id) === 'active').length,
        activeTrackingCount: ['utmify'].filter(id => getStatus(tracking, id) === 'active').length,
        productCount
    };
}