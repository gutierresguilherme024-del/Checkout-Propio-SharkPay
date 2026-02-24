import React from "react";
import { createPortal } from "react-dom";
import { NavLink } from "@/components/NavLink";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";


export function Header() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);



  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-transparent",
        scrolled && "border-border bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg",
      )}
    >
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <NavLink to="/" className="rounded-md p-2 hover:bg-accent" aria-label="Home">
          <WordmarkIcon className="h-4" />
        </NavLink>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="outline">
            <NavLink to="/checkout" onClick={() => setOpen(false)}>
              Ver checkout
            </NavLink>
          </Button>
          <Button asChild>
            <NavLink to="/admin/overview" onClick={() => setOpen(false)}>
              Abrir painel
            </NavLink>
          </Button>
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>

      <MobileMenu open={open} className="flex flex-col justify-between gap-2">

        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full bg-transparent">
            <NavLink to="/checkout" onClick={() => setOpen(false)}>
              Ver checkout
            </NavLink>
          </Button>
          <Button asChild className="w-full">
            <NavLink to="/admin/overview" onClick={() => setOpen(false)}>
              Abrir painel
            </NavLink>
          </Button>
        </div>
      </MobileMenu>
    </header>
  );
}

type MobileMenuProps = React.ComponentProps<"div"> & {
  open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        "fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y",
        "bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg md:hidden",
      )}
    >
      <div
        data-slot={open ? "open" : "closed"}
        className={cn(
          "size-full p-4",
          "ease-out data-[slot=open]:animate-in data-[slot=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const WordmarkIcon = (props: React.ComponentProps<"svg">) => (
  <div className={cn("flex items-center gap-2", props.className)}>
    <div className="relative size-8 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(30,210,230,0.15)] overflow-hidden group">
      {/* Shark Fin Icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))] transition-transform group-hover:scale-110"
      >
        <path d="M12 2C12 2 12 7 12 12C12 17 8 22 8 22" strokeDasharray="2 2" className="opacity-30" />
        <path d="M16 22C16 22 19 18 19 12C19 6 12 2 12 2C12 2 5 6 5 12C5 18 8 22 8 22" />
        <path d="M8 22H16" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent pointer-none" />
    </div>
    <span className="text-[1.5rem] tracking-tight text-foreground flex items-center leading-none font-brand">
      Shark<span className="text-primary">Pay</span>
    </span>
  </div>
);
