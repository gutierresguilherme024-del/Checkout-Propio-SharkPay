import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "SharkPay Checkout",
    description: "O melhor checkout para o seu negócio - SharkPay",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider>
                    <TooltipProvider>
                        {children}
                        <Toaster />
                        <Sonner />
                    </TooltipProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
