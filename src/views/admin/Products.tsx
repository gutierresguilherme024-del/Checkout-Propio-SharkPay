import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Save, X, Search, Package, Eye, Power, FileText, Check, Copy, ImageIcon, Loader2, Link, ExternalLink, CreditCard, ChevronRight, Zap } from "lucide-react";
import { normalizeImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useIntegrations } from "@/hooks/use-integrations";

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
}

const APP_URL = window.location.origin;

import { supabase as supabaseClient } from "@/lib/supabase/client";

// Funções de API — chamam o backend serverless (service_role key fica no servidor)
// Adicionado fallback direto para o cliente Supabase caso a API local (Vercel Functions) não esteja rodando
async function apiListarProdutos(): Promise<Product[]> {
    try {
        const res = await fetch('/api/produtos');
        if (res.ok) {
            const data = await res.json();
            return data.produtos || [];
        }
    } catch (e) {
        console.warn("API de produtos offline, tentando Supabase direto...", e);
    }

    // Fallback: busca direta se a rota de API falhar (comum em npm run dev local)
    const { data, error } = await supabaseClient
        .from('produtos' as any)
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) throw new Error(error.message);
    return data as any[] || [];
}

async function apiCriarProduto(produto: Omit<Product, 'id' | 'criado_em'>): Promise<Product> {
    try {
        const res = await fetch('/api/produtos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

async function apiAtualizarProduto(id: string, campos: Record<string, any>): Promise<Product> {
    try {
        const res = await fetch(`/api/produtos?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campos)
        });
        if (res.ok) {
            const data = await res.json();
            return data.produto;
        }
    } catch (e) {
        console.warn("API de produtos offline para PUT, tentando Supabase direto...");
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

    // Fallback: upload direto via cliente Supabase
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
        .substring(0, 40);
    const sufixo = Math.random().toString(36).substring(2, 6);
    return `${base}-${sufixo}`;
}

export default function AdminProducts() {
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
    // pixGateway: qual gateway usar para Pix neste produto ('pushinpay' | 'mundpay' | 'none')
    const [pixGateway, setPixGateway] = useState<'pushinpay' | 'mundpay' | 'none'>('none');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    // Derivados para compatibilidade com a API existente
    const pushinpayEnabled = pixGateway === 'pushinpay';
    const mundpayEnabled = pixGateway === 'mundpay';

    const { payments, getStatus } = useIntegrations();
    const isStripeGlobal = getStatus(payments, 'stripe') === 'active';
    const isPushinPayGlobal = getStatus(payments, 'pushinpay') === 'active';
    const isMundPayGlobal = getStatus(payments, 'mundpay') === 'active';

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        setLoading(true);
        try {
            const data = await apiListarProdutos();

            // Gerar slug para produtos que não têm (produtos legacy)
            const produtosParaAtualizar = data.filter(p => !p.checkout_slug);
            for (const p of produtosParaAtualizar) {
                try {
                    const atualizado = await apiAtualizarProduto(p.id, {
                        checkout_slug: gerarSlugLocal(p.nome)
                    });
                    const idx = data.findIndex(x => x.id === p.id);
                    if (idx >= 0) data[idx] = atualizado;
                } catch {
                    // Ignora se falhar
                }
            }

            setProducts(data);
        } catch (err: any) {
            console.error("Erro ao buscar produtos:", err);
            toast.error("Erro ao carregar produtos: " + (err.message || 'Tente novamente'));
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
        setStripeEnabled(product.stripe_enabled ?? true);

        // Determinar qual gateway de Pix está selecionado (Prioridade máxima aos novos campos booleanos)
        if (product.mundpay_enabled) {
            setPixGateway('mundpay');
        } else if (product.pushinpay_enabled) {
            setPixGateway('pushinpay');
        } else if (!!product.mundpay_url) {
            // Caso legado: se tem URL mas não tem mundpay_enabled setado (ex: nulo no banco)
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
        console.log(`[Products] Salvando produto. Editing: ${!!editingProduct}`, { nome, preco, mundpayUrl });

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
                // Update existing product
                const camposParaAtualizar: Record<string, any> = {
                    nome,
                    preco: parseFloat(preco),
                    descricao,
                    ativo,
                    // Só envia a URL se o gateway selecionado for MundPay
                    mundpay_url: pixGateway === 'mundpay' ? (mundpayUrl || null) : null,
                    stripe_enabled: stripeEnabled,
                    pushinpay_enabled: pushinpayEnabled,
                    mundpay_enabled: mundpayEnabled,
                };
                if (imagem_url) camposParaAtualizar.imagem_url = imagem_url;
                if (pdf_storage_key) camposParaAtualizar.pdf_storage_key = pdf_storage_key;

                produtoSalvo = await apiAtualizarProduto(editingProduct.id, camposParaAtualizar);
                setProducts(prev => prev.map(p => p.id === produtoSalvo.id ? produtoSalvo : p));
                toast.success("Produto atualizado com sucesso!");

            } else {
                // Create new product
                // Sincronizar com Stripe (opcional — não bloqueia se falhar)
                const stripeData = await criarProdutoNoStripe(nome, parseFloat(preco), descricao);

                // Criar produto via API serverless (bypass de RLS com service_role)
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
                });

                const checkoutLink = getCheckoutUrl(produtoSalvo.checkout_slug);

                if (checkoutLink) {
                    navigator.clipboard.writeText(checkoutLink);
                    toast.success("Produto criado! Link de checkout copiado ✅");
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
            toast.error("Erro ao excluir produto: " + (err.message || ''));
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
                    <h2 className="text-3xl font-bold tracking-tight">Produtos Digitais</h2>
                    <p className="text-muted-foreground">Cadastre seus e-books e produtos com entrega automática.</p>
                </div>
                {!isAdding && (
                    <Button onClick={() => setIsAdding(true)} className="gap-2">
                        <Plus className="size-4" /> Novo Produto
                    </Button>
                )}
            </div>
            {isAdding && (
                <Card className="border-primary/30 shadow-2xl animate-in zoom-in-95 duration-300">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {editingProduct ? <Pencil className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
                                    {editingProduct ? `Editando: ${editingProduct.nome}` : "Novo Produto Digital"}
                                </CardTitle>
                                <CardDescription>Preencha os dados e configure como deseja receber os pagamentos.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={resetForm}><X className="size-5 opacity-50" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome exibido no Checkout</Label>
                                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Ebook Vendas 2025" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="preco">Preço (R$)</Label>
                                <Input id="preco" type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="97.00" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc">Descrição curta</Label>
                            <Textarea id="desc" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="O que o cliente está comprando?" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="imagem_capa">Imagem de Capa (Opcional)</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="imagem_capa" type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                                    {imageFile && <ImageIcon className="size-5 text-primary" />}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="arquivo_pdf">Arquivo PDF (Opcional)</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="arquivo_pdf" type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                                    {pdfFile && <FileText className="size-5 text-red-500" />}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 pb-6 px-6 rounded-3xl bg-gradient-to-br from-muted/40 via-background to-muted/20 border border-border/80 shadow-2xl relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-[0.03] rotate-12">
                                <Zap className="size-32" />
                            </div>

                            <div className="flex items-center gap-3 mb-2 relative">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Package className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80">Configuração de Recebimento</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Escolha como seus clientes poderão pagar</p>
                                </div>
                            </div>

                            {/* ── GATEWAY DE CARTÃO (Stripe) ── */}
                            <div className="space-y-3 relative">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                                        <div className="size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        Cartão de Crédito (Stripe)
                                    </Label>
                                    {!isStripeGlobal && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-tight">Inativo Globalmente</span>}
                                </div>

                                {isStripeGlobal ? (
                                    <div
                                        onClick={() => setStripeEnabled(!stripeEnabled)}
                                        className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-500 ${stripeEnabled ? 'bg-blue-500/5 border-blue-500/40 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/20' : 'bg-background/50 border-border/40 opacity-60 hover:opacity-80'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:scale-110 ${stripeEnabled ? 'bg-[#635BFF]' : 'bg-muted text-muted-foreground'}`}>
                                                    <CreditCard className="size-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold group-hover:text-blue-600 transition-colors">Stripe Payments</p>
                                                    <p className="text-[11px] text-muted-foreground font-medium">Checkout direto, seguro e global.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${stripeEnabled ? 'text-blue-500' : 'text-muted-foreground'}`}>
                                                    {stripeEnabled ? 'Ativo' : 'Desativado'}
                                                </span>
                                                <Switch checked={stripeEnabled} onCheckedChange={setStripeEnabled} onClick={(e) => e.stopPropagation()} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-muted/20 border border-dashed rounded-2xl text-center">
                                        <p className="text-xs text-muted-foreground">Configure as chaves do Stripe na aba <span className="font-bold text-foreground underline decoration-primary/30">Pagamentos</span>.</p>
                                    </div>
                                )}
                            </div>

                            {/* ── GATEWAY DE PIX (MundPay ou PushinPay) ── */}
                            <div className="space-y-4 pt-6 border-t border-border/40 relative">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                                        <div className="size-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                        Pagamento via PIX (Seletor)
                                    </Label>
                                    {!isPushinPayGlobal && !isMundPayGlobal && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-tight">Inativo Globalmente</span>}
                                </div>

                                {(isPushinPayGlobal || isMundPayGlobal) ? (
                                    <div className="grid gap-3">
                                        {/* Opção: Desativar Pix */}
                                        <button
                                            type="button"
                                            onClick={() => setPixGateway('none')}
                                            className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 flex items-center gap-4 ${pixGateway === 'none' ? 'bg-muted border-primary/40 shadow-inner' : 'bg-background/50 border-border/40 hover:border-border/80'}`}
                                        >
                                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${pixGateway === 'none' ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'}`}>
                                                {pixGateway === 'none' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">Nenhum (Desativar Pix)</p>
                                                <p className="text-[11px] text-muted-foreground font-medium">Ocultar opção de Pix neste produto.</p>
                                            </div>
                                        </button>

                                        {/* Opção: PushinPay */}
                                        {isPushinPayGlobal && (
                                            <button
                                                type="button"
                                                onClick={() => setPixGateway('pushinpay')}
                                                className={`group w-full p-4 rounded-2xl border text-left transition-all duration-500 flex items-center gap-4 ${pixGateway === 'pushinpay' ? 'bg-purple-500/5 border-purple-500/40 shadow-lg shadow-purple-500/5 ring-1 ring-purple-500/20' : 'bg-background/50 border-border/40 hover:border-border/80'}`}
                                            >
                                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${pixGateway === 'pushinpay' ? 'border-purple-500 bg-purple-500/10' : 'border-muted-foreground/30'}`}>
                                                    {pixGateway === 'pushinpay' && <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />}
                                                </div>
                                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg transition-transform duration-500 group-hover:scale-110 ${pixGateway === 'pushinpay' ? 'bg-gradient-to-br from-[#5D5FEF] to-[#9B5CFA]' : 'bg-muted text-muted-foreground opacity-60'}`}>
                                                    PP
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold group-hover:text-purple-600 transition-colors">PushinPay API (Nativo)</p>
                                                    <p className="text-[11px] text-muted-foreground font-medium">QR Code direto no seu checkout.</p>
                                                </div>
                                                {pixGateway === 'pushinpay' && <Zap className="size-4 text-purple-500 animate-pulse ml-auto" />}
                                            </button>
                                        )}

                                        {/* Opção: MundPay */}
                                        {isMundPayGlobal && (
                                            <div className="space-y-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setPixGateway('mundpay')}
                                                    className={`group w-full p-4 rounded-2xl border text-left transition-all duration-500 flex items-center gap-4 ${pixGateway === 'mundpay' ? 'bg-emerald-500/5 border-emerald-500/40 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20' : 'bg-background/50 border-border/40 hover:border-border/80'}`}
                                                >
                                                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${pixGateway === 'mundpay' ? 'border-emerald-500 bg-emerald-500/10' : 'border-muted-foreground/30'}`}>
                                                        {pixGateway === 'mundpay' && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                                                    </div>
                                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg transition-transform duration-500 group-hover:scale-110 ${pixGateway === 'mundpay' ? 'bg-black' : 'bg-muted text-muted-foreground opacity-60'}`}>
                                                        MP
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold group-hover:text-emerald-600 transition-colors">MundPay Bot (Popup)</p>
                                                        <p className="text-[11px] text-muted-foreground font-medium">Redireciona para checkout externo MundPay.</p>
                                                    </div>
                                                    {pixGateway === 'mundpay' && <ExternalLink className="size-4 text-emerald-500 animate-pulse ml-auto" />}
                                                </button>

                                                {pixGateway === 'mundpay' && (
                                                    <div className="mt-2 ml-10 p-5 rounded-2xl bg-background/80 backdrop-blur-sm border border-emerald-500/30 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                                                                <Link className="size-4" />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="mundpay" className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">URL do Checkout MundPay</Label>
                                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Onde o robô deve processar o Pix</p>
                                                            </div>
                                                        </div>
                                                        <Input
                                                            id="mundpay"
                                                            value={mundpayUrl}
                                                            onChange={e => setMundpayUrl(e.target.value)}
                                                            placeholder="https://pay.mycheckoutt.com/..."
                                                            className="bg-muted/50 border-emerald-500/20 h-11 text-sm focus:ring-emerald-500/20 focus:border-emerald-500/40 rounded-xl transition-all"
                                                        />
                                                        <div className="flex items-start gap-2 text-[10px] bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/10">
                                                            <Zap className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                                                            <p className="text-emerald-700 leading-relaxed font-medium">Certifique-se que o produto no MundPay tenha exatamente o mesmo valor definido acima (R$ {preco || '0,00'}).</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-muted/20 border border-dashed rounded-2xl text-center">
                                        <p className="text-xs text-muted-foreground">Ative PushinPay ou MundPay na aba <span className="font-bold text-foreground underline decoration-primary/30">Pagamentos</span>.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center gap-2">
                                <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
                                <Label htmlFor="ativo">Produto ativo</Label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={resetForm} disabled={isSaving}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-[140px] font-semibold">
                                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                {editingProduct ? "Salvar Alterações" : "Criar Produto"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
                    <Package className="size-12 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-xl font-medium">Nenhum produto cadastrado</h3>
                    <p className="text-muted-foreground mb-6">Cadastre seu primeiro produto digital para começar a vender.</p>
                    <Button variant="outline" onClick={() => setIsAdding(true)}>Começar agora</Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {products.map(product => {
                        const checkoutUrl = getCheckoutUrl(product.checkout_slug);
                        const isCopied = copiedId === product.id;

                        return (
                            <Card key={product.id} className={`group overflow-hidden transition-all duration-300 ${!product.ativo ? 'opacity-60' : 'hover:border-primary/50 shadow-md'}`}>
                                <CardContent className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Info do Produto */}
                                        <div className="flex-1 min-w-0 flex items-center gap-3">
                                            <div className={`p-0 rounded-lg overflow-hidden size-12 flex-shrink-0 border border-border ${product.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
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
                                                    <h3 className="font-semibold truncate">{product.nome}</h3>
                                                    {!product.ativo && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold shrink-0">Inativo</span>}
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{product.descricao || "Sem descrição"}</p>
                                            </div>
                                        </div>
                                        {/* Preço */}
                                        <div className="text-xl font-bold text-primary whitespace-nowrap">
                                            R$ {product.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* O LAPIZINHO DE EDIÇÃO PEDIDO */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 h-9 px-3 border-primary/30 hover:bg-primary/10 text-primary font-medium transition-all"
                                                onClick={() => startEdit(product)}
                                            >
                                                <Pencil className="size-4" />
                                                <span>Editar</span>
                                            </Button>

                                            <Button
                                                variant={isCopied ? "outline" : "default"}
                                                size="sm"
                                                className="gap-2 h-9 px-3 transition-all"
                                                onClick={() => copyCheckoutLink(product)}
                                                disabled={!checkoutUrl}
                                            >
                                                {isCopied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                                                {isCopied ? "Copiado" : "Link"}
                                            </Button>

                                            <Button
                                                variant="soft"
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
                                                title="Excluir Produto"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Link do Checkout */}
                                    {checkoutUrl && (
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border flex items-center gap-3">
                                            <Link className="size-4 text-primary shrink-0" />
                                            <code className="text-xs text-foreground truncate flex-1 font-mono">{checkoutUrl}</code>
                                        </div>
                                    )}

                                    {/* Gateways Ativos - DEMONSTRADOR PREMIUM (Inspirado em front-produtos) */}
                                    <div className="mt-5 pt-4 border-t border-border/40 relative group/gateways">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 px-2 py-0.5 bg-muted/30 rounded-md border border-border/50">
                                                    <Zap className="size-3 text-yellow-500" /> Gatways Ativos
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2.5">
                                            {/* Badge Stripe */}
                                            <div
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${product.stripe_enabled
                                                    ? 'bg-gradient-to-r from-[#635BFF]/10 to-[#635BFF]/5 border-[#635BFF]/30 text-[#635BFF] shadow-sm shadow-[#635BFF]/5'
                                                    : 'bg-muted/10 border-border/40 text-muted-foreground/30 opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                                                    }`}
                                                title={product.stripe_enabled ? "Cartão de Crédito Ativo" : "Cartão de Crédito Inativo"}
                                            >
                                                <CreditCard className={`size-3.5 transition-transform duration-300 ${product.stripe_enabled ? 'scale-110' : ''}`} />
                                                <span className="text-[11px] font-extrabold tracking-tight">STRIPE</span>
                                                {product.stripe_enabled && <div className="size-1 rounded-full bg-[#635BFF] animate-pulse ml-0.5" />}
                                            </div>

                                            {/* Badge PushinPay (Pix) */}
                                            <div
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${product.pushinpay_enabled
                                                    ? 'bg-gradient-to-r from-purple-500/10 to-purple-600/5 border-purple-500/30 text-purple-600 shadow-sm shadow-purple-500/5'
                                                    : 'bg-muted/10 border-border/40 text-muted-foreground/30 opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                                                    }`}
                                                title={product.pushinpay_enabled ? "Pix PushinPay Ativo" : "Pix PushinPay Inativo"}
                                            >
                                                <Zap className={`size-3.5 transition-transform duration-300 ${product.pushinpay_enabled ? 'scale-110' : ''}`} />
                                                <span className="text-[11px] font-extrabold tracking-tight uppercase">PushinPay (Pix)</span>
                                                {product.pushinpay_enabled && <div className="size-1 rounded-full bg-purple-500 animate-pulse ml-0.5" />}
                                            </div>

                                            {/* Badge MundPay (Popup) */}
                                            <div
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${product.mundpay_enabled
                                                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-emerald-500/30 text-emerald-600 shadow-sm shadow-emerald-500/5'
                                                    : 'bg-muted/10 border-border/40 text-muted-foreground/30 opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                                                    }`}
                                                title={product.mundpay_enabled ? "MundPay (Pix) Ativo" : "MundPay (Pix) Inativo"}
                                            >
                                                <ExternalLink className={`size-3.5 transition-transform duration-300 ${product.mundpay_enabled ? 'scale-110' : ''}`} />
                                                <span className="text-[11px] font-extrabold tracking-tight uppercase">MundPay (Pix)</span>
                                                {product.mundpay_enabled && <div className="size-1 rounded-full bg-emerald-500 animate-pulse ml-0.5" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metadados */}
                                    <div className="mt-5 pt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/20">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`size-1.5 rounded-full ${product.pdf_storage_key ? 'bg-red-400' : 'bg-muted-foreground/30'}`} />
                                                <FileText className="size-3 text-muted-foreground/70" />
                                                PDF: {product.pdf_storage_key ? <span className="text-foreground font-semibold">Vinculado</span> : "Vazio"}
                                            </div>
                                            <div className="w-px h-3 bg-border/50" />
                                            <div className="flex items-center gap-1.5">
                                                <Plus className="size-3 text-muted-foreground/70" />
                                                ID: <span className="font-mono text-[9px] opacity-70 cursor-help" title={product.id}>{product.id.substring(0, 8)}...</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {product.stripe_product_id && (
                                                <div className="group/badge relative flex items-center gap-1.5 text-blue-500/80 font-bold bg-blue-500/5 px-2.5 py-1 rounded-lg border border-blue-500/10 transition-colors hover:bg-blue-500/10">
                                                    <Check className="size-3" /> Stripe Linked
                                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border text-[9px] px-2 py-1 rounded shadow-xl opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">Sincronizado via API</span>
                                                </div>
                                            )}
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
