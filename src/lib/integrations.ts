import { supabase } from "@/lib/supabase/client";

export interface IntegrationSettings {
    id: string;
    type: 'payment' | 'tracking' | 'n8n';
    name: string;
    enabled: boolean;
    config: Record<string, string | number | boolean | null>;
    user_id?: string;
    updated_at?: string;
}

export const integrationService = {
    async getSettings(type: 'payment' | 'tracking' | 'n8n', userId?: string): Promise<IntegrationSettings[]> {
        let query = supabase
            .from('integrations')
            .select('*')
            .eq('type', type);

        if (userId) query = query.eq('user_id', userId);

        const { data, error } = await query;

        if (error) {
            console.warn(`Erro ao buscar integrações de ${type}, usando fallback local:`, error);
            const local = localStorage.getItem(`sco_integ_${type}`);
            return local ? JSON.parse(local) : [];
        }

        let results: IntegrationSettings[] = data || [];

        // BuyPix Resilience: Garantir que SEMPRE buscamos o registro global se não veio no query por user_id
        const hasBuypix = results.find(r => r.id === 'buypix');
        if (type === 'payment' && (!hasBuypix || (userId && hasBuypix.user_id))) {
            const { data: globalBuypix } = await supabase
                .from('integrations')
                .select('*')
                .eq('id', 'buypix')
                .is('user_id', null)
                .maybeSingle();

            if (globalBuypix) {
                // Se encontramos o global, removemos qualquer per-user (lixo) e adicionamos o global
                results = results.filter(r => r.id !== 'buypix');
                results.push(globalBuypix);
            }
        }

        // Remoção de duplicatas por ID, priorizando (1) ativas globais ou (2) last_updated
        if (!userId) {
            const map = new Map();
            for (const row of results) {
                const curr = map.get(row.id);
                if (!curr) { map.set(row.id, row); }
                else if (row.enabled && !curr.enabled) { map.set(row.id, row); }
            }
            results = Array.from(map.values());
        }

        // Injeção de ENV Fallbacks (Somente se a lista estiver vazia ou faltando o ID específico)
        if (type === 'tracking' && !results.find(r => r.id === 'utmify')) {
            const envKey = import.meta.env.VITE_UTMIFY_API_KEY;
            if (envKey && !envKey.includes('placeholder')) {
                results.push({
                    id: 'utmify',
                    type: 'tracking',
                    name: 'UTMify',
                    enabled: true,
                    config: { apiKey: envKey, utmScript: '', pixelId: '' },
                    user_id: userId
                });
            }
        }

        if (type === 'payment') {
            const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
            if (stripeKey && !stripeKey.includes('placeholder') && !results.find(r => r.id === 'stripe')) {
                results.push({
                    id: 'stripe',
                    type: 'payment',
                    name: 'Stripe',
                    enabled: true,
                    config: { pubKey: stripeKey, secKey: '', webhookSecret: '' },
                    user_id: userId
                });
            }
            if (!results.find(r => r.id === 'mundpay')) {
                results.push({
                    id: 'mundpay',
                    type: 'payment',
                    name: 'MundPay',
                    enabled: true,
                    config: { webhookSecret: '' },
                    user_id: userId
                });
            }
        }

        return results;
    },

    async saveSettings(settings: IntegrationSettings): Promise<void> {
        const payload = {
            ...settings,
            user_id: settings.user_id || null,
            updated_at: new Date().toISOString()
        };

        // BuyPix: salvar via API route backend (usa service_role — bypass RLS)
        if (settings.id === 'buypix') {
            const resp = await fetch('/api/save-integration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: 'buypix',
                    type: settings.type,
                    name: settings.name,
                    enabled: settings.enabled,
                    config: settings.config
                })
            });

            const result = await resp.json();
            if (!resp.ok) {
                console.error('[BuyPix] Erro na API save-integration:', result);
                throw new Error(result.error || 'Erro ao salvar via API');
            }

            return;
        }

        // Demais gateways: upsert normal (BLINDAGEM — não alterar)
        const { error } = await supabase
            .from('integrations')
            .upsert(payload as any, { onConflict: 'id,user_id' });

        if (error) {
            console.warn("Erro ao salvar no Supabase, salvando no localStorage:", error);
            const existingRaw = localStorage.getItem(`sco_integ_${settings.type}`);
            const existing: IntegrationSettings[] = existingRaw ? JSON.parse(existingRaw) : [];
            const index = existing.findIndex(s => s.id === settings.id);
            if (index >= 0) existing[index] = settings;
            else existing.push(settings);
            localStorage.setItem(`sco_integ_${settings.type}`, JSON.stringify(existing));
        }
    },

    async sendToN8N(payload: Record<string, unknown>): Promise<boolean> {
        const n8nConfigs = await this.getSettings('n8n');
        const webhook = n8nConfigs.find(c => c.id === 'main_webhook' && c.enabled);

        const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
        const targetUrl = webhook?.config?.url || n8nWebhookUrl;

        if (!targetUrl || targetUrl.includes('placeholder') || targetUrl.includes('seudominio')) {
            console.warn('[n8n] Webhook não configurado, ignorando envio.');
            return false;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    timestamp: new Date().toISOString(),
                    source: 'sharkpay_checkout'
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            return response.ok;
        } catch (e) {
            console.warn("[n8n] Webhook indisponível (não bloqueia o fluxo):", (e as Error).message);
            return false;
        }
    },

    async getGlobalSettings(userId?: string): Promise<any | null> {
        let query = supabase
            .from('integrations')
            .select('config')
            .eq('id', 'checkout_global');

        if (userId) query = query.eq('user_id', userId);

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.warn("Erro ao buscar configurações globais:", error);
            const local = localStorage.getItem('sco_global_settings');
            return local ? JSON.parse(local) : null;
        }
        return data?.config || null;
    },

    async saveGlobalSettings(config: any, userId?: string): Promise<void> {
        const payload: any = {
            id: 'checkout_global',
            type: 'settings',
            name: 'Configurações de Layout',
            enabled: true,
            config,
            user_id: userId || null, // Garante null em vez de undefined
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('integrations')
            .upsert(payload, { onConflict: 'id,user_id' });

        if (error) {
            console.warn("Erro ao salvar configurações no Supabase, salvando local:", error);
            localStorage.setItem(`sco_global_settings_${userId || 'default'}`, JSON.stringify(config));
        } else {
            localStorage.setItem(`sco_global_settings_${userId || 'default'}`, JSON.stringify(config));
        }
    }
};
