import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Save, Trash2, FileText, ImageIcon, Loader2, Copy, Check } from "lucide-react";
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
}

// Funções de API — chamam o backend serverless (service_role key fica no servidor)
async function apiListarProdutos(): Promise<Product[]> {
    const res = await fetch('/api/produtos');
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao listar produtos');
    }
    const data = await res.json();
    return data.produtos || [];
}

async function apiCriarProduto(produto: Omit<Product, 'id' | 'criado_em'>): Promise<Product> {
    const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produto)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar produto');
    }
    const data = await res.json();
    return data.produto;
}

async function apiExcluirProduto(id: string): Promise<void> {
    const res = await fetch(`/api/produtos?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir produto');
    }
}

async function apiUploadArquivo(file: File): Promise<{ path: string; url: string }> {
    // Converter arquivo para base64
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const res = await fetch('/api/produtos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            base64,
            mimeType: file.type,
            fileName: file.name
        })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro no upload' }));
        throw new Error(err.error || 'Erro ao fazer upload');
    }
    return res.json();
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

export default function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [nome, setNome] = useState("");
    const [preco, setPreco] = useState("");
    const [descricao, setDescricao] = useState("");
    const [ativo, setAtivo] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        setLoading(true);
        try {
            const data = await apiListarProdutos();
            setProducts(data);
        } catch (err: any) {
            console.error("Erro ao buscar produtos:", err);
            toast.error("Erro ao carregar produtos: " + (err.message || 'Tente novamente'));
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!nome || !preco) {
            toast.error("Nome e preço são obrigatórios");
            return;
        }

        setIsSaving(true);
        setCheckoutUrl(null);

        try {
            let imagem_url: string | null = null;
            let pdf_storage_key: string | null = null;

            // Upload via API serverless (usa service_role no backend)
            if (imageFile) {
                toast.info("Enviando imagem...");
                const uploadResult = await apiUploadArquivo(imageFile);
                imagem_url = uploadResult.path;
            }

            if (pdfFile) {
                toast.info("Enviando PDF...");
                const uploadResult = await apiUploadArquivo(pdfFile);
                pdf_storage_key = uploadResult.path;
            }

            // Sincronizar com Stripe (opcional — não bloqueia se falhar)
            const stripeData = await criarProdutoNoStripe(nome, parseFloat(preco), descricao);

            // Criar produto via API serverless (bypass de RLS com service_role)
            const novoProduto = await apiCriarProduto({
                nome,
                preco: parseFloat(preco),
                descricao,
                ativo,
                imagem_url,
                pdf_storage_key,
                stripe_product_id: stripeData?.stripe_product_id || null,
                stripe_price_id: stripeData?.stripe_price_id || null,
            });

            if (stripeData?.checkout_url) {
                setCheckoutUrl(stripeData.checkout_url);
                toast.success("Produto criado e sincronizado com Stripe!");
            } else {
                toast.success("Produto criado com sucesso!");
                resetForm();
            }

            setProducts(prev => [novoProduto, ...prev]);
        } catch (err: any) {
            console.error("Erro ao salvar produto:", err);
            toast.error(`Erro ao salvar produto: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    }

    function resetForm() {
        setNome("");
        setPreco("");
        setDescricao("");
        setAtivo(true);
        setImageFile(null);
        setPdfFile(null);
        setIsAdding(false);
        setCheckoutUrl(null);
        setCopied(false);
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

    const copyToClipboard = () => {
        if (checkoutUrl) {
            navigator.clipboard.writeText(checkoutUrl);
            setCopied(true);
            toast.success("Link copiado!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Produtos Digitais</h2>
                    <p className="text-muted-foreground">Cadastre seus e-books e produtos com entrega automática.</p>
                </div>
                {!isAdding && !checkoutUrl && (
                    <Button onClick={() => setIsAdding(true)} className="gap-2">
                        <Plus className="size-4" /> Novo Produto
                    </Button>
                )}
            </div>

            {checkoutUrl && (
                <div className="mt-4 p-6 bg-slate-900 border border-indigo-500/30 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-500/10 p-2 rounded-lg">
                            <Package className="size-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Link de Checkout Gerado!</h3>
                            <p className="text-sm text-slate-400">Use este link para vender seu produto diretamente pelo Stripe.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <span className="text-sm text-slate-300 truncate flex-1 font-mono">{checkoutUrl}</span>
                        <Button
                            onClick={copyToClipboard}
                            variant={copied ? "outline" : "default"}
                            className="gap-2 transition-all"
                            size="sm"
                        >
                            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                            {copied ? "Copiado!" : "Copiar Link"}
                        </Button>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button variant="ghost" onClick={resetForm} size="sm">
                            Criar outro produto
                        </Button>
                    </div>
                </div>
            )}

            {isAdding && (
                <Card className="border-primary/20 shadow-lg">
                    <CardHeader>
                        <CardTitle>Configuração do Produto</CardTitle>
                        <CardDescription>Preencha os dados e faça o upload do PDF.</CardDescription>
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
                                    <Input
                                        id="imagem_capa"
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setImageFile(e.target.files?.[0] || null)}
                                        className="cursor-pointer"
                                    />
                                    {imageFile && <ImageIcon className="size-5 text-primary" />}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="arquivo_pdf">Arquivo PDF (Opcional)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="arquivo_pdf"
                                        type="file"
                                        accept=".pdf"
                                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                                        className="cursor-pointer"
                                    />
                                    {pdfFile && <FileText className="size-5 text-red-500" />}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
                            <Label htmlFor="ativo">Produto ativo e disponível para venda</Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={resetForm} disabled={isSaving}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-[120px]">
                                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Salvar Produto
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                        <Card key={product.id} className={`group overflow-hidden transition-all duration-300 ${!product.ativo ? 'opacity-60' : 'hover:border-primary/50 shadow-md'}`}>
                            <CardHeader className="pb-2 space-y-1">
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-lg ${product.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        <Package className="size-5" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-destructive h-8 w-8">
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-lg truncate">{product.nome}</CardTitle>
                                    {!product.ativo && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold">Inativo</span>}
                                </div>
                                <CardDescription className="line-clamp-1">{product.descricao || "Sem descrição"}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="text-xl font-bold text-primary mb-4">
                                    R$ {product.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 p-2 rounded border border-transparent group-hover:border-primary/20 transition-colors">
                                        <FileText className="size-3 shrink-0 text-red-400" />
                                        <span className="truncate">PDF: {product.pdf_storage_key ? "Vinculado" : "Não enviado"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                                        <span>Criado em: {product.criado_em ? new Date(product.criado_em).toLocaleDateString() : '-'}</span>
                                        <div className="flex gap-2">
                                            {product.stripe_product_id && (
                                                <div className="flex items-center gap-1 text-green-500 font-bold">
                                                    <Check className="size-3" /> Stripe
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
