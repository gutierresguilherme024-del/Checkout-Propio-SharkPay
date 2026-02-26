import { HeroGlow } from "@/components/brand/HeroGlow";
import { Header } from "@/components/ui/header-1";
import { HeroSection, LogosSection } from "@/components/ui/hero-1";

const Index = () => {
  // Cache bust: 2026-02-25 20:41
  return (
    <main className="min-h-svh bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[image:var(--gradient-page)] pointer-events-none opacity-40 mix-blend-overlay" />
      <Header />



      <HeroGlow className="flex-1 flex flex-col">
        <div className="relative mx-auto w-full max-w-5xl px-4 py-20 flex flex-col gap-24 md:gap-32">
          {/* Hero Content */}
          <HeroSection />

          {/* Integration Ecosystem Content */}
          <LogosSection />
        </div>
      </HeroGlow>
    </main>
  );
};

export default Index;
