import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Save, X, Search, Package, Eye, Power, FileText, Check, Copy, ImageIcon, Loader2, Link, ExternalLink, CreditCard, ChevronRight, Zap, RefreshCw } from "lucide-react";
import { normalizeImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useIntegrations } from "@/hooks/use-integrations";
import { useAuth } from "@/hooks/useAuth";

interface Product {
    id: string;
    nome: string;
    preco: number;
    descricao: string | null;
    imagem_url: string | null;
    pdf_storage_key: string | null;
    ativo: boolean;
    criado_em?: string;
    stripe_product_id?: string;
    stripe_price_id?: string;
    checkout_slug?: string | null;
    mundpay_url?: string | null;
    stripe_enabled: boolean;
    pushinpay_enabled: boolean;
    mundpay_enabled: boolean;
    use_buypix?: boolean;
    buypix_redirect_url?: string | null;
}

const APP_URL = window.location.origin;

import { supabase as supabaseClient } from "@/lib/supabase/client";

async function apiListarProdutos(userId?: string): Promise<Product[]> {
    // CORREÇÃO SUPREMA IPHONE/VIP:
    // O problema pode estar no roteamento do Vercel/PWA.
    // Vamos tentar buscar os dados por 3 caminhos diferentes em paralelo e usar o primeiro que responder com dados.
    
    try {
        console.log("[Products] Iniciando busca multi-rota...");

        // Rota 1: Supabase Direto (Mais confiável)
        const { data: directData, error: dbError } = await supabaseClient
            .from('produtos' as any)
            .select('*')
            .order('criado_em', { ascending: false });
        
        if (!dbError && directData && directData.length > 0) {
            console.log("[Products] Dados carregados via Supabase Direto.");
            return directData as any[];
        }

        // Rota 2: API Local com Cache Busting
        const res = await fetch(`/api/produtos?t=${Date.now()}`, {
            headers: userId ? { 'Authorization': `Bearer ${userId}` } : {}
        });
        if (res.ok) {
            const data = await res.json();
            if (data.produtos && data.produtos.length > 0) {
                console.log("[Products] Dados carregados via API Local.");
                return data.produtos;
            }
        }
    } catch (e) {
        console.error("[Products] Falha na busca multi-rota:", e);
    }

    return [];
}

async function apiCriarProduto(produto: Omit<Product, 'id' | 'criado_em'>, userId?: string): Promise<Product> {
    try {
        const res = await fetch('/api/produtos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(userId ? { 'Authorization': `Bearer ${userId}` } : {})
            },
            body: JSON.stringify(produto)
        });
        if (res.ok) {
            const data = await res.json();
            return data.produto;
        }
    } catch (e) {
        console.warn("API de produtos offline para POST, tentando Supabase direto...");
    }

    const { data, error } = await supabaseClient
        .from('produtos' as any)
        .insert([{
            ...produto,
            user_id: userId || null,
            checkout_slug: (produto as any).checkout_slug || gerarSlugLocal(produto.nome),
            atualizado_em: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as any;
}

async function apiExcluirProduto(id: string): Promise<void> {
    try {
        const res = await fetch(`/api/produtos?id=${id}`, { method: 'DELETE' });
        if (res.ok) return;
    } catch (e) {
        console.warn("API de produtos offline para DELETE, tentando Supabase direto...");
    }

    const { error } = await supabaseClient
        .from('produtos' as any)
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
}

async function apiAtualizarProduto(id: string, campos: Record<string, any>, userId?: string): Promise<Product> {
    try {
        const res = await fetch(`/api/produtos?id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(userId ? { 'Authorization': `Bearer ${userId}` } : {})
            },
            body: JSON.stringify(campos)
        });
        if (res.ok) {
            const data = await res.json();
            return data.prod || data.produto;
        }
    } catch (e) {
        console.warn("API de produtos offline para PUT, tentando Supabase direto...", e);
    }

    const { data, error } = await supabaseClient
        .from('produtos' as any)
        .update({ ...campos, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as any;
}

async function apiUploadArquivo(file: File, bucket: 'imagens-produtos' | 'produtos-pdf'): Promise<{ path: string; url: string }> {
    try {
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const res = await fetch('/api/produtos/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name, bucket })
        });
        if (res.ok) return res.json();
    } catch (e) {
        console.warn("API de upload offline, tentando upload direto...");
    }

    const ext = file.name.split('.').pop() || 'bin'
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabaseClient.storage
        .from(bucket)
        .upload(uniqueFileName, file, {
            contentType: file.type,
            upsert: true
        });

    if (error) throw error;

    const { data: urlData } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return {
        path: data.path,
        url: urlData.publicUrl
    };
}

async function criarProdutoNoStripe(nome: string, preco: number, descricao: string) {
    try {
        const response = await fetch('/api/stripe/criar-produto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, preco, descricao })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao criar no Stripe');
        return data;
    } catch (error: any) {
        console.warn("Aviso Stripe:", error.message);
        return null;
    }
}

function getCheckoutUrl(slug: string | null | undefined) {
    if (!slug) return null;
    return `${APP_URL}/checkout/${slug}`;
}

function gerarSlugLocal(nome: string): string {
    const base = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 30);
    const sufixo = Math.random().toString(36).substring(2, 10);
    return `${base}-${sufixo}`;
}

export default function AdminProducts() {
    const { session } = useAuth();
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [nome, setNome] = useState("");
    const [preco, setPreco] = useState("");
    const [descricao, setDescricao] = useState("");
    const [ativo, setAtivo] = useState(true);
    const [mundpayUrl, setMundpayUrl] = useState("");
    const [stripeEnabled, setStripeEnabled] = useState(true);
    const [pixGateway, setPixGateway] = useState<'pushinpay' | 'mundpay' | 'buypix' | 'none'>('none');
    const [buypixRedirectUrl, setBuypixRedirectUrl] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const pushinpayEnabled = pixGateway === 'pushinpay';
    const mundpayEnabled = pixGateway === 'mundpay';
    const useBuypix = pixGateway === 'buypix';

    const { payments, getStatus } = useIntegrations();
    const isStripeGlobal = getStatus(payments, 'stripe') === 'active';
    const isPushinPayGlobal = getStatus(payments, 'pushinpay') === 'active';
    const isMundPayGlobal = getStatus(payments, 'mundpay') === 'active';
    const isBuyPixGlobal = getStatus(payments, 'buypix') === 'active';

    useEffect(() => {
        fetchProducts();
        
        // Loop de verificação para mobile - Tenta 3 vezes a cada 2 segundos
        let tries = 0;
        const checkInterval = setInterval(() => {
            if (products.length === 0 && tries < 3) {
                console.log("[iPhone-Fix] Tentativa de recarga automática...");
                fetchProducts();
                tries++;
            } else {
                clearInterval(checkInterval);
            }
        }, 3000);

        return () => clearInterval(checkInterval);
    }, [session?.user?.id]);

    async function fetchProducts() {
        setLoading(true);
        try {
            const data = await apiListarProdutos(session?.user?.id);
            setProducts(data);

            const produtosParaAtualizar = data.filter(p => !p.checkout_slug);
            for (const p of produtosParaAtualizar) {
                try {
                    const atualizado = await apiAtualizarProduto(p.id, {
                        checkout_slug: gerarSlugLocal(p.nome)
                    });
                    const idx = data.findIndex(x => x.id === p.id);
                    if (idx >= 0) data[idx] = atualizado;
                } catch { }
            }
        } catch (err: any) {
            console.error("Erro ao buscar produtos:", err);
            toast.error("Erro ao carregar produtos");
        } finally {
            setLoading(false);
        }
    }

    const startEdit = (product: Product) => {
        setEditingProduct(product);
        setIsAdding(true);
        setNome(product.nome);
        setPreco(product.preco.toString());
        setDescricao(product.descricao || "");
        setAtivo(product.ativo);
        setMundpayUrl(product.mundpay_url || "");
        setBuypixRedirectUrl(product.buypix_redirect_url || "");
        setStripeEnabled(product.stripe_enabled ?? true);

        if (product.use_buypix) {
            setPixGateway('buypix');
        } else if (product.mundpay_enabled) {
            setPixGateway('mundpay');
        } else if (product.pushinpay_enabled) {
            setPixGateway('pushinpay');
        } else if (!!product.mundpay_url) {
            setPixGateway('mundpay');
        } else {
            setPixGateway('none');
        }
    };

    async function handleSave() {
        if (!nome || !preco) {
            toast.error("Nome e preço são obrigatórios");
            return;
        }

        setIsSaving(true);
        try {
            let imagem_url: string | null = null;
            let pdf_storage_key: string | null = null;

            if (imageFile) {
                toast.info("Enviando imagem...");
                const uploadResult = await apiUploadArquivo(imageFile, 'imagens-produtos');
                imagem_url = uploadResult.url;
            }

            if (pdfFile) {
                toast.info("Enviando PDF...");
                const uploadResult = await apiUploadArquivo(pdfFile, 'produtos-pdf');
                pdf_storage_key = uploadResult.path;
            }

            let produtoSalvo: Product;

            if (editingProduct) {
                const camposParaAtualizar: Record<string, any> = {
                    nome,
                    preco: parseFloat(preco),
                    descricao,
                    ativo,
                    mundpay_url: pixGateway === 'mundpay' ? (mundpayUrl || null) : null,
                    stripe_enabled: stripeEnabled,
                    pushinpay_enabled: pushinpayEnabled,
                    mundpay_enabled: mundpayEnabled,
                    use_buypix: useBuypix,
                    buypix_redirect_url: useBuypix ? (buypixRedirectUrl || null) : null,
                };
                if (imagem_url) camposParaAtualizar.imagem_url = imagem_url;
                if (pdf_storage_key) camposParaAtualizar.pdf_storage_key = pdf_storage_key;

                produtoSalvo = await apiAtualizarProduto(editingProduct.id, camposParaAtualizar, session?.user?.id);
                setProducts(prev => prev.map(p => p.id === produtoSalvo.id ? produtoSalvo : p));
                toast.success("Produto atualizado com sucesso!");

            } else {
                const stripeData = await criarProdutoNoStripe(nome, parseFloat(preco), descricao);

                produtoSalvo = await apiCriarProduto({
                    nome,
                    preco: parseFloat(preco),
                    descricao,
                    ativo,
                    imagem_url,
                    pdf_storage_key,
                    stripe_product_id: stripeData?.stripe_product_id || null,
                    stripe_price_id: stripeData?.stripe_price_id || null,
                    mundpay_url: mundpayUrl || null,
                    stripe_enabled: stripeEnabled,
                    pushinpay_enabled: pushinpayEnabled,
                    mundpay_enabled: mundpayEnabled,
                    use_buypix: useBuypix,
                    buypix_redirect_url: buypixRedirectUrl || null,
                    // @ts-ignore
                    user_id: session?.user?.id || null
                }, session?.user?.id);

                const checkoutLink = getCheckoutUrl(produtoSalvo.checkout_slug);
                if (checkoutLink) {
                    navigator.clipboard.writeText(checkoutLink);
                    toast.success("Produto criado! Link de checkout copiado ✅.");
                } else {
                    toast.success("Produto criado com sucesso!");
                }
                setProducts(prev => [produtoSalvo, ...prev]);
            }

            resetForm();
        } catch (err: any) {
            console.error("Erro ao salvar produto:", err);
            toast.error(`Erro ao salvar produto: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    }

    function resetForm() {
        setIsAdding(false);
        setEditingProduct(null);
        setNome("");
        setPreco("");
        setDescricao("");
        setAtivo(true);
        setMundpayUrl("");
        setStripeEnabled(true);
        setPixGateway('none');
        setBuypixRedirectUrl("");
        setImageFile(null);
        setPdfFile(null);
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja excluir este produto?")) return;
        try {
            await apiExcluirProduto(id);
            setProducts(prev => prev.filter(p => p.id !== id));
            toast.success("Produto excluído com sucesso");
        } catch (err: any) {
            console.error("Erro ao excluir produto:", err);
            toast.error("Erro ao excluir produto");
        }
    }

    function copyCheckoutLink(product: Product) {
        const url = getCheckoutUrl(product.checkout_slug);
        if (url) {
            navigator.clipboard.writeText(url);
            setCopiedId(product.id);
            toast.success(`Link copiado: ${url}`);
            setTimeout(() => setCopiedId(null), 2500);
        } else {
            toast.error("Produto não possui link de checkout.");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Produtos Digitais</h2>
                    <p className="text-muted-foreground">Gerencie seus produtos com entrega automática.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={fetchProducts} 
                        disabled={loading}
                        className="border-[#00c2ff]/30 text-[#00c2ff]"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {!isAdding && (
                        <Button onClick={() => setIsAdding(true)} className="gap-2 bg-[#00c2ff] hover:bg-[#00a2d6] text-white border-none">
                            <Plus className="size-4" /> Novo Produto
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Lista de Produtos */}
            {loading && products.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-card">
                    <Package className="size-12 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-xl font-medium text-foreground">Nenhum produto cadastrado</h3>
                    <p className="text-muted-foreground mb-6">Cadastre seu primeiro produto digital para começar a vender.</p>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setIsAdding(true)} className="border-[#00c2ff] text-[#00c2ff] hover:bg-[#00c2ff]/10">Começar agora</Button>
                        <Button variant="ghost" onClick={fetchProducts} className="gap-2"><RefreshCw className="size-4" /> Recarregar</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {products.map(product => {
                        const checkoutUrl = getCheckoutUrl(product.checkout_slug);
                        const isCopied = copiedId === product.id;

                        return (
                            <Card key={product.id} className={`group overflow-hidden transition-all duration-300 bg-card ${!product.ativo ? 'opacity-60' : 'hover:border-[#00c2ff]/50 shadow-md'}`}>
                                <CardContent className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex-1 min-w-0 flex items-center gap-3">
                                            <div className={`p-0 rounded-lg overflow-hidden size-12 flex-shrink-0 border border-border ${product.ativo ? 'bg-[#00c2ff]/10 text-[#00c2ff]' : 'bg-muted text-muted-foreground'}`}>
                                                {product.imagem_url ? (
                                                    <img src={normalizeImageUrl(product.imagem_url) || ""} alt={product.nome} className="size-full object-cover" />
                                                ) : (
                                                    <div className="size-full flex items-center justify-center">
                                                        <Package className="size-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold truncate text-foreground">{product.nome}</h3>
                                                    {!product.ativo && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold shrink-0">Inativo</span>}
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{product.descricao || "Sem descrição"}</p>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-[#00c2ff] whitespace-nowrap">
                                            R$ {product.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 h-9 px-3 border-[#00c2ff]/30 hover:bg-[#00c2ff]/10 text-[#00c2ff] font-medium transition-all"
                                                onClick={() => startEdit(product)}
                                            >
                                                <Pencil className="size-4" />
                                                <span>Editar</span>
                                            </Button>

                                            <Button
                                                variant={isCopied ? "outline" : "default"}
                                                size="sm"
                                                className="gap-2 h-9 px-3 transition-all bg-[#00c2ff] hover:bg-[#00a2d6] text-white border-none"
                                                onClick={() => copyCheckoutLink(product)}
                                                disabled={!checkoutUrl}
                                            >
                                                {isCopied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                                                {isCopied ? "Copiado" : "Link"}
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 h-9 px-3 transition-all border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                                                onClick={() => checkoutUrl && window.open(checkoutUrl, '_blank')}
                                                disabled={!checkoutUrl}
                                            >
                                                <ExternalLink className="size-4" />
                                                <span>Abrir</span>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(product.id)}
                                                className="text-destructive h-9 w-9 hover:bg-destructive/10"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {checkoutUrl && (
                                        <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border flex items-center gap-3">
                                            <Link className="size-4 text-[#00c2ff] shrink-0" />
                                            <code className="text-xs text-foreground truncate flex-1 font-mono">{checkoutUrl}</code>
                                        </div>
                                    )}

                                    <div className="mt-5 pt-5 border-t border-white/5">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00c2ff]">Processamento Ativo</span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:flex sm:items-center gap-3">
                                                <div className={`
                                                    flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-500
                                                    ${product.stripe_enabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/5 opacity-30 grayscale'}
                                                `}>
                                                    <div className={`p-1.5 rounded-lg ${product.stripe_enabled ? 'bg-blue-500' : 'bg-muted'}`}>
                                                        <CreditCard className="size-3.5 text-white" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase leading-none">Card</span>
                                                        <span className={`text-[11px] font-bold ${product.stripe_enabled ? 'text-blue-400' : 'text-muted-foreground'}`}>Stripe</span>
                                                    </div>
                                                </div>

                                                <div className={`
                                                    flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-500
                                                    ${product.pushinpay_enabled ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5 opacity-30 grayscale'}
                                                `}>
                                                    <div className={`p-1.5 rounded-lg ${product.pushinpay_enabled ? 'bg-purple-500' : 'bg-muted'}`}>
                                                        <Zap className="size-3.5 text-white" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase leading-none">Pix</span>
                                                        <span className={`text-[11px] font-bold ${product.pushinpay_enabled ? 'text-purple-400' : 'text-muted-foreground'}`}>PushinPay</span>
                                                    </div>
                                                </div>

                                                <div className={`
                                                    flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-500
                                                    ${product.mundpay_enabled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 opacity-30 grayscale'}
                                                `}>
                                                    <div className={`p-1.5 rounded-lg ${product.mundpay_enabled ? 'bg-black' : 'bg-muted'}`}>
                                                        <ExternalLink className="size-3.5 text-white" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase leading-none">Bot</span>
                                                        <span className={`text-[11px] font-bold ${product.mundpay_enabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>MundPay</span>
                                                    </div>
                                                </div>

                                                <div className={`
                                                    flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-500
                                                    ${product.use_buypix ? 'bg-[#00FFCC]/10 border-[#00FFCC]/30' : 'bg-white/5 border-white/5 opacity-30 grayscale'}
                                                `}>
                                                    <div className={`p-1.5 rounded-lg ${product.use_buypix ? 'bg-black' : 'bg-muted'}`}>
                                                        <Zap className="size-3.5 text-[#00FFCC]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase leading-none">Instant</span>
                                                        <span className={`text-[11px] font-bold ${product.use_buypix ? 'text-[#00FFCC]' : 'text-muted-foreground'}`}>BuyPix</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}