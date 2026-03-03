import { DeploymentHistory } from "@/components/admin/DeploymentHistory";
import { History } from "lucide-react";
import { HeroGlow } from "@/components/brand/HeroGlow";

export default function AdminChangelog() {
    return (
        <div className="min-h-full -m-4 md:-m-8 relative overflow-hidden">
            {/* Fundo gradiente */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `
                        radial-gradient(1100px circle at 10% 0%, hsl(190 95% 52% / 0.18), transparent 55%),
                        radial-gradient(900px circle at 90% 10%, hsl(32 95% 56% / 0.13), transparent 60%)
                    `
                }}
            />
            <HeroGlow className="absolute inset-0">{null}</HeroGlow>

            <div className="max-w-4xl mx-auto space-y-8 relative z-10 p-4 md:p-8">
                {/* Cabeçalho */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                            <History className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight font-display">Histórico de Atualizações</h1>
                            <p className="text-sm text-muted-foreground">
                                Sistema automático de versionamento e changelog
                            </p>
                        </div>
                    </div>
                </div>

                {/* Componente de Histórico Automático */}
                <DeploymentHistory />

                {/* Informação adicional */}
                <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                    <p>
                        Este histórico é gerado automaticamente a cada deploy em produção.
                    </p>
                    <p className="mt-1">
                        Versões são rastreadas via <code className="px-1 py-0.5 bg-muted rounded text-xs">version.json</code> e{' '}
                        <code className="px-1 py-0.5 bg-muted rounded text-xs">version-history.json</code>
                    </p>
                </div>
            </div>
        </div>
    );
}
