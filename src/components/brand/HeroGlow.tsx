import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

export function HeroGlow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const supportsMotion = useMemo(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onPointerMove={(e) => {
        if (!supportsMotion) return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty("--glow-x", `${x}%`);
        el.style.setProperty("--glow-y", `${y}%`);
      }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70",
          "bg-[radial-gradient(600px_circle_at_var(--glow-x,50%)_var(--glow-y,50%),hsl(var(--primary)/0.22),transparent_55%)]",
        )}
      />
      {children}
    </div>
  );
}
