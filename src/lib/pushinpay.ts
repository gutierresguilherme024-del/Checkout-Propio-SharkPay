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

    const contentType = response.headers.get('content-type')
    if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json()
            throw new Error(data.error || data.erro?.message || 'Erro ao gerar PIX')
        }
        throw new Error('Servidor PIX offline ou erro na Vercel (500).')
    }

    return response.json()
}
