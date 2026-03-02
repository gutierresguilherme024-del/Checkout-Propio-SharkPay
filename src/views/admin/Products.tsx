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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Produtos Digitais</h2>
                    <p className="text-sm text-muted-foreground">Gerencie seus produtos com entrega automática.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchProducts}
                        disabled={loading}
                        className="border-[#00c2ff]/30 text-[#00c2ff] h-10 w-10"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={() => { resetForm(); setIsAdding(true); }} className="gap-2 bg-[#00c2ff] hover:bg-[#00a2d6] text-white border-none h-10">
                        <Plus className="size-4" /> Novo Produto
                    </Button>
                </div>
            </div>

            {/* ═══════════════════ FORMULÁRIO DE CRIAÇÃO / EDIÇÃO ═══════════════════ */}
            {isAdding && (
                <Card className="border-[#00c2ff]/40 shadow-lg shadow-[#00c2ff]/5 animate-in slide-in-from-top-4 duration-300">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg text-[#00c2ff]">
                                {editingProduct ? `Editando: ${editingProduct.nome}` : 'Novo Produto'}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={resetForm} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <X className="size-4" />
                            </Button>
                        </div>
                        <CardDescription>
                            {editingProduct ? 'Altere os dados e clique em Salvar.' : 'Preencha os dados para criar um novo produto digital.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Nome e Preço */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prod-nome">Nome do Produto *</Label>
                                <Input id="prod-nome" placeholder="Ex: Curso de Marketing Digital" value={nome} onChange={e => setNome(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prod-preco">Preço (R$) *</Label>
                                <Input id="prod-preco" type="number" step="0.01" min="0" placeholder="97.00" value={preco} onChange={e => setPreco(e.target.value)} />
                            </div>
                        </div>

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label htmlFor="prod-desc">Descrição</Label>
                            <Textarea id="prod-desc" placeholder="Descreva seu produto..." value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} />
                        </div>

                        {/* Imagem e PDF */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prod-img" className="flex items-center gap-2"><ImageIcon className="size-4" /> Imagem do Produto</Label>
                                <Input id="prod-img" type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="file:mr-2 file:px-3 file:py-1 file:rounded-md file:bg-[#00c2ff]/10 file:text-[#00c2ff] file:border-0 file:text-xs file:font-medium" />
                                {editingProduct?.imagem_url && !imageFile && (
                                    <p className="text-xs text-muted-foreground">Imagem atual mantida. Selecione outra para substituir.</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prod-pdf" className="flex items-center gap-2"><FileText className="size-4" /> Arquivo PDF (Entrega)</Label>
                                <Input id="prod-pdf" type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="file:mr-2 file:px-3 file:py-1 file:rounded-md file:bg-[#00c2ff]/10 file:text-[#00c2ff] file:border-0 file:text-xs file:font-medium" />
                            </div>
                        </div>

                        {/* Ativo */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <div className="flex items-center gap-3">
                                <Power className="size-4 text-[#00c2ff]" />
                                <div>
                                    <Label className="text-sm font-medium">Produto Ativo</Label>
                                    <p className="text-xs text-muted-foreground">Quando desativado, o checkout ficará indisponível.</p>
                                </div>
                            </div>
                            <Switch checked={ativo} onCheckedChange={setAtivo} />
                        </div>

                        {/* ═══════ SELEÇÃO DE GATEWAYS ═══════ */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <CreditCard className="size-4 text-[#00c2ff]" />
                                <Label className="text-sm font-bold uppercase tracking-wider text-[#00c2ff]">Gateways de Pagamento</Label>
                            </div>

                            {/* Cartão — Stripe */}
                            <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${stripeEnabled ? 'border-blue-500/50 bg-blue-500/5' : 'border-border bg-card hover:border-blue-500/20'}`}
                                onClick={() => setStripeEnabled(!stripeEnabled)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${stripeEnabled ? 'bg-blue-500' : 'bg-muted'}`}>
                                            <CreditCard className="size-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Stripe — Cartão de Crédito</p>
                                            <p className="text-xs text-muted-foreground">{isStripeGlobal ? '✅ Integração ativa globalmente' : '⚠️ Configure nas integrações'}</p>
                                        </div>
                                    </div>
                                    <Switch checked={stripeEnabled} onCheckedChange={setStripeEnabled} onClick={e => e.stopPropagation()} />
                                </div>
                            </div>

                            {/* Pix Gateway */}
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gateway Pix</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* PushinPay */}
                                    <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${pixGateway === 'pushinpay' ? 'border-purple-500/50 bg-purple-500/5' : 'border-border bg-card hover:border-purple-500/20'}`}
                                        onClick={() => setPixGateway(pixGateway === 'pushinpay' ? 'none' : 'pushinpay')}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${pixGateway === 'pushinpay' ? 'bg-purple-500' : 'bg-muted'}`}>
                                                    <Zap className="size-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">PushinPay</p>
                                                    <p className="text-xs text-muted-foreground">{isPushinPayGlobal ? '✅ Ativa' : '⚠️ Configurar'}</p>
                                                </div>
                                            </div>
                                            <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${pixGateway === 'pushinpay' ? 'border-purple-500 bg-purple-500' : 'border-muted-foreground'}`}>
                                                {pixGateway === 'pushinpay' && <Check className="size-3 text-white" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* MundPay */}
                                    <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${pixGateway === 'mundpay' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-card hover:border-emerald-500/20'}`}
                                        onClick={() => setPixGateway(pixGateway === 'mundpay' ? 'none' : 'mundpay')}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${pixGateway === 'mundpay' ? 'bg-black' : 'bg-muted'}`}>
                                                    <ExternalLink className="size-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">MundPay</p>
                                                    <p className="text-xs text-muted-foreground">{isMundPayGlobal ? '✅ Ativa' : '⚠️ Configurar'}</p>
                                                </div>
                                            </div>
                                            <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${pixGateway === 'mundpay' ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground'}`}>
                                                {pixGateway === 'mundpay' && <Check className="size-3 text-white" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* BuyPix */}
                                    <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${pixGateway === 'buypix' ? 'border-[#00FFCC]/50 bg-[#00FFCC]/5' : 'border-border bg-card hover:border-[#00FFCC]/20'}`}
                                        onClick={() => setPixGateway(pixGateway === 'buypix' ? 'none' : 'buypix')}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${pixGateway === 'buypix' ? 'bg-black' : 'bg-muted'}`}>
                                                    <Zap className="size-4 text-[#00FFCC]" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">BuyPix</p>
                                                    <p className="text-xs text-muted-foreground">{isBuyPixGlobal ? '✅ Ativa' : '⚠️ Configurar'}</p>
                                                </div>
                                            </div>
                                            <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${pixGateway === 'buypix' ? 'border-[#00FFCC] bg-[#00FFCC]' : 'border-muted-foreground'}`}>
                                                {pixGateway === 'buypix' && <Check className="size-3 text-black" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Campo URL MundPay */}
                                {pixGateway === 'mundpay' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        <Label htmlFor="mundpay-url">URL do Bot MundPay</Label>
                                        <Input id="mundpay-url" placeholder="https://mundpay.com/..." value={mundpayUrl} onChange={e => setMundpayUrl(e.target.value)} />
                                    </div>
                                )}

                                {/* Campo URL BuyPix Redirect */}
                                {pixGateway === 'buypix' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        <Label htmlFor="buypix-url">URL de Redirecionamento BuyPix</Label>
                                        <Input id="buypix-url" placeholder="https://buypix.com/..." value={buypixRedirectUrl} onChange={e => setBuypixRedirectUrl(e.target.value)} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                            <Button variant="outline" onClick={resetForm} className="h-11 gap-2">
                                <X className="size-4" /> Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving || !nome || !preco} className="h-11 gap-2 bg-[#00c2ff] hover:bg-[#00a2d6] text-white border-none min-w-[160px]">
                                {isSaving ? (
                                    <><Loader2 className="size-4 animate-spin" /> Salvando...</>
                                ) : (
                                    <><Save className="size-4" /> {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══════════════════ LISTA DE PRODUTOS ═══════════════════ */}
            {loading && products.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : products.length === 0 && !isAdding ? (
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
                                <CardContent className="p-4 sm:p-5">
                                    {/* Info do Produto */}
                                    <div className="flex items-start sm:items-center gap-3 mb-3">
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
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold truncate text-foreground">{product.nome}</h3>
                                                {!product.ativo && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold shrink-0">Inativo</span>}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{product.descricao || "Sem descrição"}</p>
                                        </div>
                                        <div className="text-lg sm:text-xl font-bold text-[#00c2ff] whitespace-nowrap shrink-0">
                                            R$ {product.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    {/* Botões de Ação — responsivos */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 h-9 px-3 border-[#00c2ff]/30 hover:bg-[#00c2ff]/10 text-[#00c2ff] font-medium transition-all flex-1 sm:flex-none min-w-[90px]"
                                            onClick={() => startEdit(product)}
                                        >
                                            <Pencil className="size-3.5" />
                                            Editar
                                        </Button>

                                        <Button
                                            variant={isCopied ? "outline" : "default"}
                                            size="sm"
                                            className="gap-1.5 h-9 px-3 transition-all bg-[#00c2ff] hover:bg-[#00a2d6] text-white border-none flex-1 sm:flex-none min-w-[80px]"
                                            onClick={() => copyCheckoutLink(product)}
                                            disabled={!checkoutUrl}
                                        >
                                            {isCopied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                                            {isCopied ? "Copiado" : "Link"}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 h-9 px-3 transition-all border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 flex-1 sm:flex-none min-w-[80px]"
                                            onClick={() => checkoutUrl && window.open(checkoutUrl, '_blank')}
                                            disabled={!checkoutUrl}
                                        >
                                            <ExternalLink className="size-3.5" />
                                            Abrir
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(product.id)}
                                            className="text-destructive h-9 w-9 hover:bg-destructive/10 shrink-0"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>

                                    {/* Link do checkout */}
                                    {checkoutUrl && (
                                        <div className="mt-3 p-2.5 bg-muted/30 rounded-lg border border-border flex items-center gap-2 overflow-hidden">
                                            <Link className="size-3.5 text-[#00c2ff] shrink-0" />
                                            <code className="text-[10px] sm:text-xs text-foreground truncate flex-1 font-mono">{checkoutUrl}</code>
                                        </div>
                                    )}

                                    {/* Gateways ativos */}
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <div className="flex flex-col gap-2.5">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00c2ff]">Processamento Ativo</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-500
                                                    ${product.stripe_enabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/5 opacity-30 grayscale'}`}>
                                                    <div className={`p-1 rounded-md ${product.stripe_enabled ? 'bg-blue-500' : 'bg-muted'}`}>
                                                        <CreditCard className="size-3 text-white" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[8px] font-black text-muted-foreground uppercase leading-none">Card</span>
                                                        <span className={`text-[10px] font-bold truncate ${product.stripe_enabled ? 'text-blue-400' : 'text-muted-foreground'}`}>Stripe</span>
                                                    </div>
                                                </div>

                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-500
                                                    ${product.pushinpay_enabled ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5 opacity-30 grayscale'}`}>
                                                    <div className={`p-1 rounded-md ${product.pushinpay_enabled ? 'bg-purple-500' : 'bg-muted'}`}>
                                                        <Zap className="size-3 text-white" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[8px] font-black text-muted-foreground uppercase leading-none">Pix</span>
                                                        <span className={`text-[10px] font-bold truncate ${product.pushinpay_enabled ? 'text-purple-400' : 'text-muted-foreground'}`}>PushinPay</span>
                                                    </div>
                                                </div>

                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-500
                                                    ${product.mundpay_enabled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 opacity-30 grayscale'}`}>
                                                    <div className={`p-1 rounded-md ${product.mundpay_enabled ? 'bg-black' : 'bg-muted'}`}>
                                                        <ExternalLink className="size-3 text-white" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[8px] font-black text-muted-foreground uppercase leading-none">Bot</span>
                                                        <span className={`text-[10px] font-bold truncate ${product.mundpay_enabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>MundPay</span>
                                                    </div>
                                                </div>

                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-500
                                                    ${product.use_buypix ? 'bg-[#00FFCC]/10 border-[#00FFCC]/30' : 'bg-white/5 border-white/5 opacity-30 grayscale'}`}>
                                                    <div className={`p-1 rounded-md ${product.use_buypix ? 'bg-black' : 'bg-muted'}`}>
                                                        <Zap className="size-3 text-[#00FFCC]" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[8px] font-black text-muted-foreground uppercase leading-none">Instant</span>
                                                        <span className={`text-[10px] font-bold truncate ${product.use_buypix ? 'text-[#00FFCC]' : 'text-muted-foreground'}`}>BuyPix</span>
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