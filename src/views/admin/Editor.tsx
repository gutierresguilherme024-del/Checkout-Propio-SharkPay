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
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function AdminEditor() {
  const [s, setS] = useState<CheckoutSettings>(defaultCheckoutSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const saved = await integrationService.getGlobalSettings();
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
    const tid = toast.loading("Salvando edições...");
    try {
      await integrationService.saveGlobalSettings(s);
      toast.success("Edições salvas e aplicadas em todos os checkouts!", { id: tid });
    } catch (e) {
      toast.error("Erro ao salvar.", { id: tid });
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

        <Card className="p-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Headline principal</Label>
              <Input value={s.headline} onChange={(e) => setS((p) => ({ ...p, headline: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Subheadline</Label>
              <Textarea value={s.subheadline} onChange={(e) => setS((p) => ({ ...p, subheadline: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Cor principal (Hue)</Label>
                <div className="h-2 w-24 rounded-full" style={huePreview} />
              </div>
              <Slider value={[s.primaryHue]} min={0} max={360} step={1} onValueChange={([v]) => setS((p) => ({ ...p, primaryHue: v }))} />
            </div>

            {/* Temporizador */}
            <div className="rounded-xl border bg-background/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Temporizador</p>
                  <p className="text-xs text-muted-foreground">Duração em minutos</p>
                </div>
                <Switch checked={s.timerEnabled} onCheckedChange={(v) => setS((p) => ({ ...p, timerEnabled: v }))} />
              </div>
              <div className="mt-3 grid gap-2">
                <Label className="text-xs">Duração: {s.timerDurationMinutes} min</Label>
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
              <Label>Barra superior de urgência</Label>
              <Input value={s.urgencyBarText} onChange={(e) => setS((p) => ({ ...p, urgencyBarText: e.target.value }))} />
            </div>

            {/* Prova Social */}
            <div className="rounded-xl border bg-background/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Prova social</p>
                  <p className="text-xs text-muted-foreground">Exibir bloco no checkout</p>
                </div>
                <Switch checked={s.socialProofEnabled} onCheckedChange={(v) => setS((p) => ({ ...p, socialProofEnabled: v }))} />
              </div>
              <div className="mt-3 grid gap-2">
                <Label className="text-xs">Texto</Label>
                <Input value={s.socialProofText} onChange={(e) => setS((p) => ({ ...p, socialProofText: e.target.value }))} />
              </div>
            </div>

            {/* Mensagem Flutuante */}
            <div className="rounded-xl border bg-background/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Mensagem flutuante inferior</p>
                  <p className="text-xs text-muted-foreground">Somente desktop</p>
                </div>
                <Switch
                  checked={s.floatingMessageEnabled}
                  onCheckedChange={(v) => setS((p) => ({ ...p, floatingMessageEnabled: v }))}
                />
              </div>
              <div className="mt-3 grid gap-2">
                <Label className="text-xs">Texto</Label>
                <Input value={s.floatingMessageText} onChange={(e) => setS((p) => ({ ...p, floatingMessageText: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Garantia</Label>
              <Textarea value={s.guaranteeText} onChange={(e) => setS((p) => ({ ...p, guaranteeText: e.target.value }))} />
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
