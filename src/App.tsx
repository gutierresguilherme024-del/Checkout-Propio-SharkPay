import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";

import Index from "./views/Index";
import Login from "./views/Login";
import Checkout from "./views/Checkout";
import Sucesso from "./views/Sucesso";
import AdminLayout from "./views/admin/AdminLayout";
import Overview from "./views/admin/Overview";
import Tracking from "./views/admin/Tracking";
import Payments from "./views/admin/Payments";
import Products from "./views/admin/Products";
import Delivery from "./views/admin/Delivery";
import Editor from "./views/admin/Editor";
import AgenteIA from "./views/admin/AgenteIA";

const queryClient = new QueryClient();

const App = () => {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider defaultTheme="dark">
                    <TooltipProvider>
                        <BrowserRouter>
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
                        </BrowserRouter>
                        <Toaster />
                    </TooltipProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

// Simple Error Boundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
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
