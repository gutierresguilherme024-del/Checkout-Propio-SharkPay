import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { defaultCheckoutSettings, type CheckoutSettings } from "@/components/checkout/types";
import { integrationService } from "@/lib/integrations";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, Sparkles, Timer, Users, MessageSquare, Palette } from "lucide-react";

export default function AdminEditor() {
  const [s, setS] = useState<CheckoutSettings>(defaultCheckoutSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const saved = await integrationService.getGlobalSettings(user?.id);
        if (saved) setS({ ...defaultCheckoutSettings, ...saved });
      } catch (e) {
        console.error("Erro ao carregar settings:", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const tid = toast.loading("Salvando edições globais...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await integrationService.saveGlobalSettings(s, user?.id);
      toast.success("Edições salvas e aplicadas em todos os seus checkouts!", { id: tid });
    } catch (e) {
      toast.error("Erro ao salvar configurações globais.", { id: tid });
    } finally {
      setIsSaving(false);
    }
  };

  const hue = s.primaryHue;
  const huePreview = useMemo(
    () => ({ background: `linear-gradient(90deg, hsl(${hue} 95% 48%), hsl(${(hue + 24) % 360} 95% 56%))` }),
    [hue],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <header>
          <h1 className="font-display text-2xl">Editor de Checkout</h1>
          <p className="text-sm text-muted-foreground">Personalização visual aplicada a todos os checkouts.</p>
        </header>

        <Card className="p-5 border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label className="font-bold uppercase tracking-widest text-[10px]">Textos Principais</Label>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Headline principal</Label>
                  <Input value={s.headline} onChange={(e) => setS((p) => ({ ...p, headline: e.target.value }))} className="bg-background/50" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Subheadline</Label>
                  <Textarea value={s.subheadline} onChange={(e) => setS((p) => ({ ...p, subheadline: e.target.value }))} className="bg-background/50 h-20 resize-none" />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="h-4 w-4 text-primary" />
                <Label className="font-bold uppercase tracking-widest text-[10px]">Identidade Visual</Label>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <Label className="text-xs">Cor principal (Hue)</Label>
                  <div className="h-2 w-24 rounded-full" style={huePreview} />
                </div>
                <Slider value={[s.primaryHue]} min={0} max={360} step={1} onValueChange={([v]) => setS((p) => ({ ...p, primaryHue: v }))} />
              </div>
            </div>

            {/* Temporizador */}
            <div className="rounded-xl border border-white/[0.05] bg-background/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Temporizador</p>
                    <p className="text-[10px] text-muted-foreground">Escassez e Urgência</p>
                  </div>
                </div>
                <Switch checked={s.timerEnabled} onCheckedChange={(v) => setS((p) => ({ ...p, timerEnabled: v }))} />
              </div>
              <div className="mt-4 grid gap-3">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] opacity-70">Duração: {s.timerDurationMinutes} min</Label>
                </div>
                <Slider
                  value={[s.timerDurationMinutes]}
                  min={1}
                  max={45}
                  step={1}
                  onValueChange={([v]) => setS((p) => ({ ...p, timerDurationMinutes: v }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-primary" />
                <Label className="font-bold uppercase tracking-widest text-[10px]">Gatilhos de Venda</Label>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Barra superior de urgência</Label>
                <Input value={s.urgencyBarText} onChange={(e) => setS((p) => ({ ...p, urgencyBarText: e.target.value }))} className="bg-background/50" />
              </div>
            </div>

            {/* Prova Social */}
            <div className="rounded-xl border border-white/[0.05] bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" />
                  <p className="text-xs font-bold uppercase">Prova social</p>
                </div>
                <Switch checked={s.socialProofEnabled} onCheckedChange={(v) => setS((p) => ({ ...p, socialProofEnabled: v }))} />
              </div>
              <div className="mt-3 grid gap-1.5">
                <Label className="text-[10px] opacity-50">Texto de validação</Label>
                <Input value={s.socialProofText} onChange={(e) => setS((p) => ({ ...p, socialProofText: e.target.value }))} className="bg-background/50 h-8 text-xs" />
              </div>
            </div>

            {/* Mensagem Flutuante */}
            <div className="rounded-xl border border-white/[0.05] bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                  <p className="text-xs font-bold uppercase">Notificação Flutuante</p>
                </div>
                <Switch
                  checked={s.floatingMessageEnabled}
                  onCheckedChange={(v) => setS((p) => ({ ...p, floatingMessageEnabled: v }))}
                />
              </div>
              <div className="mt-3 grid gap-1.5">
                <Label className="text-[10px] opacity-50">Mensagem (Desktop)</Label>
                <Input value={s.floatingMessageText} onChange={(e) => setS((p) => ({ ...p, floatingMessageText: e.target.value }))} className="bg-background/50 h-8 text-xs" />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <Label className="font-bold uppercase tracking-widest text-[10px]">Segurança e Garantia</Label>
              </div>
              <Textarea value={s.guaranteeText} onChange={(e) => setS((p) => ({ ...p, guaranteeText: e.target.value }))} className="bg-background/50 h-20 resize-none text-xs" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" onClick={() => setS(defaultCheckoutSettings)} className="flex-1">
                <span>Resetar Padrão</span>
              </Button>
              <Button variant="hero" onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Edições
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-muted/30">
        <div className="sco-page h-[600px] overflow-auto scale-90 origin-top -mb-[60px]">
          <div className="sco-page-body !pt-8">
            <CheckoutShell settings={s} mode="preview" />
          </div>
        </div>
      </div>
    </div>
  );
}
