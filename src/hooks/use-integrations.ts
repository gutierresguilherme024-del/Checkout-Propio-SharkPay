import { useQuery } from "@tanstack/react-query";
import { integrationService, type IntegrationSettings } from "@/lib/integrations";

export function useIntegrations() {
    const { data: tracking = [], isLoading: loadingTracking } = useQuery({
        queryKey: ['integrations', 'tracking'],
        queryFn: () => integrationService.getSettings('tracking'),
        refetchInterval: 5000, // Atualiza a cada 5s para refletir mudanças no admin
    });

    const { data: payments = [], isLoading: loadingPayments } = useQuery({
        queryKey: ['integrations', 'payment'],
        queryFn: () => integrationService.getSettings('payment'),
        refetchInterval: 5000,
    });

    const { data: automations = [], isLoading: loadingAutomations } = useQuery({
        queryKey: ['integrations', 'n8n'],
        queryFn: () => integrationService.getSettings('n8n'),
        refetchInterval: 5000,
    });

    const getStatus = (list: IntegrationSettings[], id: string) => {
        const item = list.find(i => i.id === id);
        if (!item?.enabled) return "inactive";

        // Regras de validação baseadas em regras-limitadas/limitaçoes.md
        if (id === 'utmify') return item.config.apiKey ? "active" : "pending";
        if (id === 'stripe') {
            const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
            const hasKeys = (item.config.pubKey && item.config.secKey);
            return (envKey || hasKeys) ? "active" : "pending";
        }
        if (id === 'pushinpay') {
            const envKey = import.meta.env.VITE_PUSHINPAY_TOKEN;
            return (item.config.apiToken || envKey) ? "active" : "pending";
        }

        return "active";
    };

    return {
        tracking,
        payments,
        automations,
        loading: loadingTracking || loadingPayments || loadingAutomations,
        getStatus,
        // Atalhos úteis
        isUtmifyActive: getStatus(tracking, 'utmify') === 'active',
        activeGatewaysCount: payments.filter(p => getStatus(payments, p.id) === 'active').length,
        activeTrackingCount: tracking.filter(t => getStatus(tracking, t.id) === 'active').length,
    };
}
