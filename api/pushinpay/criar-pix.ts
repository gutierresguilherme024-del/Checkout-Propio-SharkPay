export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end()

    const { valor, email, nome, pedido_id } = req.body

    const response = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.PUSHINPAY_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            value: Math.round(valor * 100),
            webhook_url: `${process.env.VITE_APP_URL}/api/pushinpay/webhook`,
            external_reference: pedido_id,
        })
    })

    const data = await response.json()

    if (!response.ok) {
        return res.status(400).json({ erro: data })
    }

    res.status(200).json({
        qr_code: data.qr_code,
        qr_code_text: data.qr_code_text,
        id: data.id,
        expires_at: data.expiration_date
    })
}
