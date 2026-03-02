# 🧠 QUADRO DE COORDENAÇÃO - SHARKPAY ELITE (ESTRATÉGIA DUAL)

## 📍 AMBIENTE
- **Antigravity (Cloud/Gemini):** Planejamento & Deploy (@sharckpay.vip)
- **Agente Local (Local/Claude-GPT):** Implementação & Verificação Local

## ⚡ MISSÃO CRÍTICA (v2.5.5 - REPARO DE PERSISTÊNCIA)
1. **Guilherme (Usuário):** Copie o conteúdo de [FINAL_BUYPIX_FIX.sql](file:///C:/Users/Guilherme/Desktop/Checkout%20Pr%C3%B3pio/FINAL_BUYPIX_FIX.sql) e rode no SQL Editor. Este novo script (v2.5.5) adiciona a constraint `UNIQUE NULLS NOT DISTINCT` necessária para o salvamento funcionar.
2. **Agente Local:** Após o Guilherme rodar o SQL, tente salvar uma chave no Admin. O erro `42P10` deve sumir agora que especificamos a constraint no `upsert` e no banco.
3. **Agente Local:** Valide que, ao recarregar a página, o card BuyPix mostra "Configurado" (se houver chave).

## 🏁 HANDOVER DE PRODUÇÃO
O Antigravity está realizando o deploy v2.5.5.

---
*Status: Aguardando Guilherme rodar o SQL v2.5.5 e Agente Local validar persistência.*
