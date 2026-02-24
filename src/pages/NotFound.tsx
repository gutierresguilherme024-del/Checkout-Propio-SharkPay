import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-svh bg-[image:var(--gradient-page)] px-4 py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-3xl border bg-card p-10 text-center shadow-[var(--shadow-elev)]">
          <h1 className="font-display text-6xl">404</h1>
          <p className="mt-3 text-sm text-muted-foreground">Página não encontrada</p>
          <a href="/" className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
            Voltar para o início
          </a>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
