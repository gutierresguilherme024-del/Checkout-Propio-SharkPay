/**
 * Faz chamada à API serverless para gerar um PIX no PushinPay
 */
export async function criarPix(dados: {
    valor: number
    email: string
    nome: string
    pedido_id: string
    utm_source?: string
}) {
    const response = await fetch('/api/pushinpay/criar-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.erro?.message || 'Erro ao gerar PIX')
    }

    return data
}
