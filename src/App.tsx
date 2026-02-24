import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLayout from "@/layouts/AdminLayout";
import AdminOverview from "@/pages/admin/Overview";
import AdminTracking from "@/pages/admin/Tracking";
import AdminPayments from "@/pages/admin/Payments";
import AdminProducts from "@/pages/admin/Products";
import AdminDelivery from "@/pages/admin/Delivery";
import AdminEditor from "@/pages/admin/Editor";
import PublicCheckout from "@/pages/Checkout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/checkout" element={<PublicCheckout />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/overview" replace />} />
                <Route path="overview" element={<AdminOverview />} />
                <Route path="tracking" element={<AdminTracking />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="delivery" element={<AdminDelivery />} />
                <Route path="editor" element={<AdminEditor />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

