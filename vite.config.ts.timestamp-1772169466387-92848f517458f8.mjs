// vite.config.ts
import { defineConfig } from "file:///C:/Users/Guilherme/Desktop/Checkout%20Pr%C3%B3pio/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Guilherme/Desktop/Checkout%20Pr%C3%B3pio/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/Guilherme/Desktop/Checkout%20Pr%C3%B3pio/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Guilherme\\Desktop\\Checkout Pr\xF3pio";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    // Gerar sourcemaps apenas em dev
    sourcemap: mode === "development",
    // Minificar agressivamente
    minify: "esbuild",
    // CSS code split para carregar apenas o necessário
    cssCodeSplit: true,
    // Target moderno para bundles menores
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["lucide-react", "framer-motion", "clsx", "tailwind-merge"],
          "query-vendor": ["@tanstack/react-query", "@supabase/supabase-js"],
          // Stripe separado — só carrega quando necessário (Lazy)
          "stripe-vendor": ["@stripe/stripe-js", "@stripe/react-stripe-js"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxHdWlsaGVybWVcXFxcRGVza3RvcFxcXFxDaGVja291dCBQclx1MDBGM3Bpb1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcR3VpbGhlcm1lXFxcXERlc2t0b3BcXFxcQ2hlY2tvdXQgUHJcdTAwRjNwaW9cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0d1aWxoZXJtZS9EZXNrdG9wL0NoZWNrb3V0JTIwUHIlQzMlQjNwaW8vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogZmFsc2UsXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgLy8gR2VyYXIgc291cmNlbWFwcyBhcGVuYXMgZW0gZGV2XG4gICAgc291cmNlbWFwOiBtb2RlID09PSBcImRldmVsb3BtZW50XCIsXG4gICAgLy8gTWluaWZpY2FyIGFncmVzc2l2YW1lbnRlXG4gICAgbWluaWZ5OiAnZXNidWlsZCcsXG4gICAgLy8gQ1NTIGNvZGUgc3BsaXQgcGFyYSBjYXJyZWdhciBhcGVuYXMgbyBuZWNlc3NcdTAwRTFyaW9cbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgLy8gVGFyZ2V0IG1vZGVybm8gcGFyYSBidW5kbGVzIG1lbm9yZXNcbiAgICB0YXJnZXQ6ICdlczIwMjAnLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICd1aS12ZW5kb3InOiBbJ2x1Y2lkZS1yZWFjdCcsICdmcmFtZXItbW90aW9uJywgJ2Nsc3gnLCAndGFpbHdpbmQtbWVyZ2UnXSxcbiAgICAgICAgICAncXVlcnktdmVuZG9yJzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknLCAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXG4gICAgICAgICAgLy8gU3RyaXBlIHNlcGFyYWRvIFx1MjAxNCBzXHUwMEYzIGNhcnJlZ2EgcXVhbmRvIG5lY2Vzc1x1MDBFMXJpbyAoTGF6eSlcbiAgICAgICAgICAnc3RyaXBlLXZlbmRvcic6IFsnQHN0cmlwZS9zdHJpcGUtanMnLCAnQHN0cmlwZS9yZWFjdC1zdHJpcGUtanMnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlVLFNBQVMsb0JBQW9CO0FBQzlWLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxpQkFBaUIsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUM5RSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUE7QUFBQSxJQUVMLFdBQVcsU0FBUztBQUFBO0FBQUEsSUFFcEIsUUFBUTtBQUFBO0FBQUEsSUFFUixjQUFjO0FBQUE7QUFBQSxJQUVkLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUN6RCxhQUFhLENBQUMsZ0JBQWdCLGlCQUFpQixRQUFRLGdCQUFnQjtBQUFBLFVBQ3ZFLGdCQUFnQixDQUFDLHlCQUF5Qix1QkFBdUI7QUFBQTtBQUFBLFVBRWpFLGlCQUFpQixDQUFDLHFCQUFxQix5QkFBeUI7QUFBQSxRQUNsRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxFQUN6QjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
