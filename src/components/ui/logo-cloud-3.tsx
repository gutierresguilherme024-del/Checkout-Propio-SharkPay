import React from "react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";

type Logo = {
  src?: string;
  component?: React.ReactNode;
  alt: string;
  className?: string;
  bgClass?: string;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  return (
    <div
      {...props}
      className={cn(
        "overflow-hidden py-10",
        "[mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]",
        className,
      )}
    >
      <InfiniteSlider gap={32} reverse speed={60} speedOnHover={20}>
        {logos.map((logo, idx) => (
          <div key={`logo-${logo.alt}-${idx}`} className="flex flex-col items-center gap-2 transition-transform hover:scale-105">
            <div className={cn(
              "relative size-12 flex items-center justify-center rounded-[22%] border border-border/40 shadow-sm overflow-hidden p-2.5",
              logo.bgClass || "bg-secondary/30"
            )}>
              {logo.component ? (
                <div className="size-full flex items-center justify-center">{logo.component}</div>
              ) : (
                <img
                  alt={logo.alt}
                  className={cn("pointer-events-none w-full h-full object-contain select-none", logo.className)}
                  loading="lazy"
                  src={logo.src}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </div>
            <span className="text-[0.65rem] font-bold tracking-tight text-foreground/50 uppercase">
              {logo.alt.replace(" Logo", "")}
            </span>
          </div>
        ))}
      </InfiniteSlider>
    </div>
  );
}
