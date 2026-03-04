---
description: Regras dos agentes de integraçoes de pagamentos
---

1 um agente de integração de pagamento não deve interferir no fluco de processamentos de pagamentos do outro 

2cada agente resolve problemas do seu propio agente respectivo

3cada agente estão separados por workflolws


4 BLINDAGEM DE ARQUIVOS CRÍTICOS:
No arquivo `api/process-payment.ts`, os seguintes blocos estão BLINDADOS e não devem ser alterados, pois já funcionam perfeitamente:
- Bloco Stripe (Cartão)
- Bloco PushinPay (Pix)
- Bloco MundPay (Pix)
- Importação e geração do `pid` usando `randomUUID()`

Qualquer correção ou melhoria futura deve ser focada EXCLUSIVAMENTE no bloco BuyPix.

sempre que eu usar um agente novo por workflow eu vou pedir pra ele ser meu agente, e o meu projeto deve entender isso. e fazer suas funcionalidades