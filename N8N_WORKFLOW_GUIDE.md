# Guia de Configuração n8n - Checkout v2.0

Para que a entrega automática funcione, você precisa configurar um workflow no n8n.

## 1. Trigger (Webhook)
- **Método**: POST
- **Path**: `entrega-produto`
- **Autenticação**: Header Auth (`X-N8N-Secret`) - use o valor definido em `N8N_WEBHOOK_SECRET`.

## 2. Nó: Enviar E-mail (Gmail/SMTP)
- **Para**: `{{ $json.email_comprador }}`
- **Assunto**: Seu acesso ao {{ $json.nome_produto }} chegou!
- **Corpo (HTML)**:
```html
<h1>Olá, {{ $json.nome_comprador }}!</h1>
<p>Seu pagamento de {{ $json.valor }} foi confirmado.</p>
<p>Acesse seu produto clicando no botão abaixo:</p>
<a href="{{ $json.link_download }}" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
  Baixar PDF
</a>
```

## 3. Nó: Confirmar Entrega (HTTP Request)
- **Método**: PATCH
- **URL**: `{{ $env.NEXT_PUBLIC_URL }}/api/pedidos/{{ $json.pedido_id }}/entrega`
- **Headers**: 
  - `Authorization`: `Bearer {{ $env.APP_API_KEY }}`
- **Body**:
```json
{
  "entregue": true,
  "entregue_em": "{{ new Date().toISOString() }}"
}
```

## Variáveis de Ambiente no n8n:
- `APP_API_KEY`: A mesma chave usada no seu .env do Next.js.
- `NEXT_PUBLIC_URL`: A URL do seu site (Ex: https://seu-site.vercel.app).
