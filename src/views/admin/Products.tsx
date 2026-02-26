import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Save, X, Search, Package, Eye, Power, FileText, Check, Copy, ImageIcon, Loader2, Link, ExternalLink, CreditCard, ChevronRight } from "lucide-react";
import { normalizeImageUrl } from "@/lib/utils";
import { toast } from "sonner";

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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
                    mundpay_url: mundpayUrl || null,
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
        setMundpayUrl("");
        setAtivo(true);
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

                        <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <CreditCard className="size-4 text-primary" />
                                Gateway de Pagamento Disponível
                            </Label>

                            <div className="grid gap-3">
                                <div className={`p-4 rounded-lg border transition-all ${mundpayUrl ? 'bg-primary/5 border-primary/20' : 'bg-muted/20 border-border/50'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-black flex items-center justify-center text-[10px] text-white font-bold">MP</div>
                                            <div>
                                                <p className="text-sm font-medium">MundPay (Pix Automatizado)</p>
                                                <p className="text-[11px] text-muted-foreground">Usar link do checkout externo para gerar Pix via robô.</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={!!mundpayUrl}
                                            onCheckedChange={(checked) => setMundpayUrl(checked ? "PREENCHA_O_LINK_AQUI" : "")}
                                        />
                                    </div>

                                    {!!mundpayUrl && (
                                        <div className="mt-4 pt-4 border-t border-primary/10 space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2">
                                                <Link className="size-3.5 text-primary" />
                                                <Label htmlFor="mundpay" className="text-xs font-semibold text-primary">Link de checkout MundPay</Label>
                                            </div>
                                            <Input
                                                id="mundpay"
                                                value={mundpayUrl === "PREENCHA_O_LINK_AQUI" ? "" : mundpayUrl}
                                                onChange={e => setMundpayUrl(e.target.value)}
                                                placeholder="https://pay.mycheckoutt.com/..."
                                                className="bg-background h-9 text-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 rounded-lg border bg-muted/20 border-border/50 opacity-60">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-[#635BFF] flex items-center justify-center text-[10px] text-white font-bold">S</div>
                                            <div>
                                                <p className="text-sm font-medium">Stripe (Cartão de Crédito)</p>
                                                <p className="text-[11px] text-muted-foreground">Processamento direto no SharkPay.</p>
                                            </div>
                                        </div>
                                        <Switch checked={true} disabled />
                                    </div>
                                </div>
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

                                    {/* Metadados */}
                                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <FileText className="size-3 text-red-400" />
                                                PDF: {product.pdf_storage_key ? "Vinculado" : "Não enviado"}
                                            </span>
                                            <span>Criado em: {product.criado_em ? new Date(product.criado_em).toLocaleDateString() : '-'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {product.stripe_product_id && (
                                                <div className="flex items-center gap-1 text-green-500 font-bold">
                                                    <Check className="size-3" /> Stripe
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
