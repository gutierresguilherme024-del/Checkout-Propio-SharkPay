import { supabase } from "@/lib/supabase/client";

export interface IntegrationSettings {
    id: string;
    type: 'payment' | 'tracking' | 'n8n';
    name: string;
    enabled: boolean;
    config: Record<string, string | number | boolean | null>;
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
        return data || [];
    },

    async saveSettings(settings: IntegrationSettings): Promise<void> {
        const { error } = await supabase
            .from('integrations')
            .upsert({ ...settings, updated_at: new Date().toISOString() } as any);

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
            updated_at: new Date().toISOString()
        };

        if (userId) payload.user_id = userId;

        const { error } = await supabase
            .from('integrations')
            .upsert(payload);

        if (error) {
            console.warn("Erro ao salvar configurações no Supabase, salvando local:", error);
            localStorage.setItem(`sco_global_settings_${userId || 'default'}`, JSON.stringify(config));
        } else {
            localStorage.setItem(`sco_global_settings_${userId || 'default'}`, JSON.stringify(config));
        }
    }
};
