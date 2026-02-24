import { supabase } from "@/lib/supabase";

export interface IntegrationSettings {
    id: string;
    type: 'payment' | 'tracking' | 'n8n';
    name: string;
    enabled: boolean;
    config: Record<string, any>;
    updated_at?: string;
}

export const integrationService = {
    async getSettings(type: 'payment' | 'tracking' | 'n8n'): Promise<IntegrationSettings[]> {
        const { data, error } = await supabase
            .from('integrations')
            .select('*')
            .eq('type', type);

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
            let existing: IntegrationSettings[] = existingRaw ? JSON.parse(existingRaw) : [];
            const index = existing.findIndex(s => s.id === settings.id);
            if (index >= 0) existing[index] = settings;
            else existing.push(settings);
            localStorage.setItem(`sco_integ_${settings.type}`, JSON.stringify(existing));
        }
    },

    async sendToN8N(payload: any): Promise<boolean> {
        const n8nConfigs = await this.getSettings('n8n');
        const webhook = n8nConfigs.find(c => c.id === 'main_webhook' && c.enabled);

        // URL padrão baseada no seu n8n
        const defaultWebhookUrl = "https://n8n-h0i3.onrender.com/webhook/sharkpay-checkout";
        const targetUrl = webhook?.config?.url || defaultWebhookUrl;

        console.log(`Enviando evento para n8n: ${payload.event || 'generic'}`);

        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    timestamp: new Date().toISOString(),
                    source: 'sharkpay_checkout'
                })
            });
            return response.ok;
        } catch (e) {
            console.error("Erro ao enviar para n8n:", e);
            return false;
        }
    }
};
