export async function criarPix(dados: {
    valor: number
    email: string
    nome: string
    pedido_id: string
}) {
    const response = await fetch('/api/pushinpay/criar-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })

    if (!response.ok) {
        const erro = await response.json()
        throw new Error(erro.erro?.message || 'Erro ao gerar PIX')
    }

    return response.json()
}
