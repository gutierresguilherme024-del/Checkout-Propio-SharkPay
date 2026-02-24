import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Save, Trash2, Mail, FileText, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface Product {
    id: string;
    nome: string;
    preco: number;
    descricao: string | null;
    imagem_url: string | null;
    pdf_storage_key: string | null;
    ativo: boolean;
    criado_em?: string;
}

export default function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

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
        try {
            const { data, error } = await (supabase.from('produtos') as any)
                .select('*')
                .order('criado_em', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (err: any) {
            console.error("Erro ao buscar produtos:", err);
            toast.error("Erro ao carregar produtos do banco de dados.");
        } finally {
            setLoading(false);
        }
    }

    async function uploadFile(file: File, bucket: string) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw uploadError;
        return data.path;
    }

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
                imagem_url = await uploadFile(imageFile, 'produtos-pdf');
            }

            if (pdfFile) {
                pdf_storage_key = await uploadFile(pdfFile, 'produtos-pdf');
            }

            const productData = {
                nome,
                preco: parseFloat(preco),
                descricao,
                ativo,
                imagem_url,
                pdf_storage_key,
                atualizado_em: new Date().toISOString()
            };

            const { data, error } = await (supabase.from('produtos') as any)
                .insert([productData])
                .select()
                .single();

            if (error) throw error;

            setProducts([data, ...products]);
            toast.success("Produto criado com sucesso!");
            resetForm();
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
    }

    async function handleDelete(id: string, pdfKey: string | null, imgUrl: string | null) {
        if (!confirm("Tem certeza que deseja excluir este produto?")) return;

        try {
            // Delete files from storage
            if (pdfKey) {
                await supabase.storage.from('produtos-pdf').remove([pdfKey]);
            }
            if (imgUrl) {
                await supabase.storage.from('produtos-pdf').remove([imgUrl]);
            }

            const { error } = await (supabase.from('produtos') as any)
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProducts(products.filter(p => p.id !== id));
            toast.success("Produto excluído com sucesso");
        } catch (err: any) {
            console.error("Erro ao excluir produto:", err);
            toast.error("Erro ao excluir produto");
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
                                <Label htmlFor="arquivo_pdf">Arquivo PDF (Obrigatório para entrega)</Label>
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
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id, product.pdf_storage_key, product.imagem_url)} className="text-destructive h-8 w-8">
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
                                        <Button variant="link" className="h-auto p-0 text-[10px]" asChild>
                                            <a href={`/admin/delivery?product=${product.id}`}>Configurar Entrega</a>
                                        </Button>
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
