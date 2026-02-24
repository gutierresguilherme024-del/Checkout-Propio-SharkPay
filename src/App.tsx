import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";

import Index from "./views/Index";
import Login from "./views/Login";
import Checkout from "./views/Checkout";
import AdminLayout from "./views/admin/AdminLayout";
import Overview from "./views/admin/Overview";
import Tracking from "./views/admin/Tracking";
import Payments from "./views/admin/Payments";
import Products from "./views/admin/Products";
import Delivery from "./views/admin/Delivery";
import Editor from "./views/admin/Editor";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <TooltipProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/checkout/:slug" element={<Checkout />} />

                        <Route path="/admin" element={
                            <ProtectedRoute>
                                <AdminLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<Navigate to="/admin/overview" replace />} />
                            <Route path="overview" element={<Overview />} />
                            <Route path="tracking" element={<Tracking />} />
                            <Route path="payments" element={<Payments />} />
                            <Route path="products" element={<Products />} />
                            <Route path="delivery" element={<Delivery />} />
                            <Route path="editor" element={<Editor />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    </QueryClientProvider>
);

export default App;
