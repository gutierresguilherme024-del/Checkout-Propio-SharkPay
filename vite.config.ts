import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Gerar sourcemaps apenas em dev
    sourcemap: mode === "development",
    // Minificar agressivamente
    minify: 'esbuild',
    // CSS code split para carregar apenas o necessário
    cssCodeSplit: true,
    // Target moderno para bundles menores
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion', 'clsx', 'tailwind-merge'],
          'query-vendor': ['@tanstack/react-query', '@supabase/supabase-js'],
          // Stripe separado — só carrega quando necessário (Lazy)
          'stripe-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
