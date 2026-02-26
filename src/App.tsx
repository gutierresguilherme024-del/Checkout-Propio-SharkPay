import React, { Component, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Lazy loaded views
const Index = lazy(() => import("./views/Index"));
const Login = lazy(() => import("./views/Login"));
const Checkout = lazy(() => import("./views/Checkout"));
const Sucesso = lazy(() => import("./views/Sucesso"));
const AdminLayout = lazy(() => import("./views/admin/AdminLayout"));
const Overview = lazy(() => import("./views/admin/Overview"));
const Tracking = lazy(() => import("./views/admin/Tracking"));
const Payments = lazy(() => import("./views/admin/Payments"));
const Products = lazy(() => import("./views/admin/Products"));
const Delivery = lazy(() => import("./views/admin/Delivery"));
const Editor = lazy(() => import("./views/admin/Editor"));
const AgenteIA = lazy(() => import("./views/admin/AgenteIA"));

const LoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
);

const queryClient = new QueryClient();

const App = () => {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider defaultTheme="dark">
                    <TooltipProvider>
                        <BrowserRouter>
                            <Suspense fallback={<LoadingFallback />}>
                                <Routes>
                                    <Route path="/" element={<Index />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/checkout/:slug" element={<Checkout />} />
                                    <Route path="/sucesso" element={<Sucesso />} />

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
                                        <Route path="agente" element={<AgenteIA />} />
                                    </Route>

                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Suspense>
                        </BrowserRouter>
                        <Toaster />
                    </TooltipProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

// Simple Error Boundary component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
    componentDidCatch(error: any, errorInfo: any) { console.error("[CRASH]:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                    <h2>Ops! Algo deu errado.</h2>
                    <p>{this.state.error?.message || "Ocorreu um erro inesperado."}</p>
                    <button onClick={() => window.location.reload()} style={{ marginTop: "20px", padding: "10px 20px", backgroundColor: "#00c2ff", color: "white", border: "none", borderRadius: "8px" }}>
                        Recarregar Página
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default App;
