import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { integrationService } from "@/lib/integrations";
import { Loader2, Send, Save, ArrowLeft, Mail } from "lucide-react";

type LogRow = {
  id: string;
  orderId: string;
  recipient: string;
  status: "sent" | "failed";
  sentAt: string;
};

const defaultHtml = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui; line-height:1.45; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #182b43;">Olá, {{nome_comprador}}! 🎉</h2>
      <p>Seu acesso ao produto <strong>{{nome_produto}}</strong> já está disponível.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin-bottom: 20px;">Clique no botão abaixo para baixar seu arquivo:</p>
        <a href="{{link_download}}" style="background: #182b43; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Baixar agora
        </a>
      </div>
      
      <p style="font-size: 12px; color: #666;">Este link é válido por {{validade}} dias.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 14px;">Se precisar de ajuda, responda a este e-mail.</p>
      <p><b>Equipe SharkPay</b></p>
    </div>
  </body>
</html>`;

export default function AdminDelivery() {
  const searchParams = useSearchParams();
  const productId = searchParams?.get("product") ?? null;

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>(productId || "");

  const [assunto, setAssunto] = useState("Seu acesso chegou! 🎉");
  const [corpo, setCorpo] = useState(defaultHtml);
  const [validade, setValidade] = useState(7);
  const [remetenteNome, setRemetenteNome] = useState("Suporte SharkPay");
  const [remetenteEmail, setRemetenteEmail] = useState("");
  const [modoEntrega, setModoEntrega] = useState("link");

  const [testTo, setTestTo] = useState("");
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedProduct]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch all products for the selector
      const { data: prods } = await (supabase.from('produtos') as any).select('id, nome');
      setProducts(prods || []);

      if (selectedProduct) {
        // Fetch specific config for the product
        const { data: config, error } = await (supabase
          .from('configuracoes_entrega') as any)
          .select('*')
          .eq('produto_id', selectedProduct)
          .maybeSingle();

        if (config) {
          setAssunto(config.assunto_email || "");
          setCorpo(config.corpo_email || defaultHtml);
          setValidade(config.validade_link_dias || 7);
          setRemetenteNome(config.email_remetente_nome || "");
          setRemetenteEmail(config.email_remetente || "");
          setModoEntrega(config.modo_entrega || "link");
        } else {
          // Reset to defaults if no config exists
          setAssunto("Seu acesso chegou! 🎉");
          setCorpo(defaultHtml);
          setValidade(7);
          setRemetenteNome("Suporte SharkPay");
          setRemetenteEmail("");
        }

        // Fetch logs (pedidos linked to this product)
        const { data: orders } = await (supabase
          .from('pedidos') as any)
          .select('id, email_comprador, status, entregue, entregue_em, criado_em')
          .eq('produto_id', selectedProduct)
          .order('criado_em', { ascending: false })
          .limit(10);

        if (orders) {
          setLogs(orders.map((o: any) => ({
            id: o.id,
            orderId: o.id.slice(0, 8),
            recipient: o.email_comprador,
            status: o.entregue ? "sent" : "failed",
            sentAt: o.entregue_em || o.criado_em
          })));
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast.error("Erro ao carregar configurações de entrega");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!selectedProduct) return toast.error("Selecione um produto primeiro");

    setIsSaving(true);
    try {
      const { error } = await (supabase
        .from('configuracoes_entrega') as any)
        .upsert({
          produto_id: selectedProduct,
          assunto_email: assunto,
          corpo_email: corpo,
          validade_link_dias: validade,
          email_remetente_nome: remetenteNome,
          email_remetente: remetenteEmail,
          modo_entrega: modoEntrega
        } as any);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testTo) return toast.error("Informe um e-mail de destino");
    if (!selectedProduct) return toast.error("Selecione um produto");

    setIsTesting(true);
    try {
      const product = products.find(p => p.id === selectedProduct);
      const success = await integrationService.sendToN8N({
        event: 'TEST_DELIVERY',
        email_comprador: testTo,
        nome_comprador: "Usuario Teste",
        nome_produto: product?.nome || "Produto Teste",
        assunto: assunto,
        corpo: corpo,
        validade: validade,
        link_download: "https://example.com/test-file.pdf"
      });

      if (success) {
        toast.success("E-mail de teste enviado para a fila do n8n!");
      } else {
        toast.error("Erro ao conectar com n8n");
      }
    } catch (err) {
      toast.error("Erro ao enviar teste");
    } finally {
      setIsTesting(false);
    }
  };

  const renderPreview = useMemo(() => {
    const sample = {
      nome_comprador: "João Silva",
      nome_produto: products.find(p => p.id === selectedProduct)?.nome || "Seu Produto Digital",
      link_download: "#",
      validade: validade.toString(),
      data_compra: new Date().toLocaleDateString()
    };

    let p = corpo;
    Object.entries(sample).forEach(([key, value]) => {
      p = p.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });
    return p;
  }, [corpo, validade, selectedProduct, products]);

  if (!productId && !selectedProduct && products.length > 0) {
    // Show select first if nothing is selected
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entrega Automática</h1>
          <p className="text-muted-foreground">Configure como cada produto será entregue após a venda.</p>
        </div>
        {productId && (
          <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="size-4" /> Voltar
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de E-mail</CardTitle>
              <CardDescription>O e-mail será enviado assim que o PIX ou Cartão for aprovado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Produto Vinculado</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Validade do Link (Dias)</Label>
                  <Input type="number" value={validade} onChange={e => setValidade(parseInt(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Remetente</Label>
                  <Input value={remetenteNome} onChange={e => setRemetenteNome(e.target.value)} placeholder="Ex: Suporte SharkPay" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Remetente (Opcional)</Label>
                  <Input value={remetenteEmail} onChange={e => setRemetenteEmail(e.target.value)} placeholder="contato@seudominio.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assunto do E-mail</Label>
                <Input value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Seu produto chegou!" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <Label>Conteúdo HTML</Label>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Variáveis: {"{{nome_comprador}}"}, {"{{nome_produto}}"}, {"{{link_download}}"}</span>
                </div>
                <Textarea
                  value={corpo}
                  onChange={e => setCorpo(e.target.value)}
                  className="min-h-[300px] font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={!selectedProduct || isTesting}>
                      {isTesting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
                      Testar Envio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enviar Teste</DialogTitle>
                      <DialogDescription>Enviaremos um e-mail de teste com as variáveis preenchidas para o endereço abaixo.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                      <Label>E-mail de Destino</Label>
                      <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="seu@email.com" />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSendTest} disabled={isTesting}>Enviar Agora</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button color="primary" onClick={handleSave} disabled={isSaving || !selectedProduct} className="min-w-[150px]">
                  {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              <h2 className="text-xl font-bold">Histórico Recente</h2>
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ID Pedido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                        Nenhuma venda recente para este produto.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-xs">{log.recipient}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{new Date(log.sentAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-[10px]">
                            {log.status === "sent" ? "Entregue" : "Falha"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] uppercase">{log.orderId}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm">Pré-visualização</CardTitle>
              <CardDescription>Como o e-mail será visto pelo comprador.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-white overflow-hidden shadow-sm h-[600px]">
                <iframe
                  title="Email preview"
                  sandbox=""
                  className="w-full h-full border-none"
                  srcDoc={renderPreview}
                />
              </div>
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="text-xs font-bold uppercase text-primary mb-2">Dica de Automação</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O workflow do n8n receberá o link do PDF assinado automaticamente.
                  Você não precisa se preocupar com a segurança do arquivo, pois o link expira em 7 dias (ou no prazo que você definiu).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
