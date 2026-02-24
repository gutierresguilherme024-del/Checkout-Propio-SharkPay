"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Save, Trash2, FileText, ImageIcon, Loader2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

interface Product {
    id: string;
    nome: string;
    preco: number;
    descricao: string | null;
    imagem_url: string | null;
    pdf_storage_key: string | null;
    checkout_slug: string;
    ativo: boolean;
    criado_em?: string;
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

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
            const { data, error } = await supabase.from('produtos')
                .select('*')
                .order('criado_em', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (err: any) {
            console.error("Erro ao buscar produtos:", err);
            toast.error("Erro ao carregar produtos");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!nome || !preco || !pdfFile) {
            toast.error("Nome, preço e arquivo PDF são obrigatórios");
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('nome', nome);
            formData.append('preco', preco);
            formData.append('descricao', descricao);
            formData.append('arquivo_pdf', pdfFile);
            if (imageFile) formData.append('imagem_capa', imageFile);

            const res = await fetch('/api/admin/produtos', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (result.error) throw new Error(result.error);

            setProducts([result.produto, ...products]);
            toast.success("Produto criado e integrado com Stripe!");
            resetForm();
        } catch (err: any) {
            toast.error(`Erro: ${err.message}`);
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

    const copyLink = (slug: string) => {
        const url = `${window.location.origin}/checkout/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Produtos V2.0</h2>
                    <p className="text-muted-foreground">Gestão com automação Stripe e checkout automático.</p>
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
                        <CardDescription>O produto será criado no Stripe automaticamente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome exibido no Checkout</Label>
                                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Ebook Vendas" />
                            </div>
                            <div className="space-y-2">
                                <Label>Preço (R$)</Label>
                                <Input type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="97.00" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>PDF para entrega (Privado)</Label>
                                <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Capa (Opcional)</Label>
                                <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                Criar Produto
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                    <Card key={product.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex justify-between">
                                {product.nome}
                                <span className="text-primary font-bold">R$ {product.preco}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-slate-400">Link de Checkout</Label>
                                <div className="flex items-center gap-1">
                                    <Input readOnly value={`${window.location.origin}/checkout/${product.checkout_slug}`} className="h-8 text-xs" />
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyLink(product.checkout_slug)}>
                                        <Copy className="size-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                                        <a href={`/checkout/${product.checkout_slug}`} target="_blank"><ExternalLink className="size-3" /></a>
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                    <FileText className="size-3" /> PDF Configurado
                                </div>
                                <span>{new Date(product.criado_em!).toLocaleDateString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
