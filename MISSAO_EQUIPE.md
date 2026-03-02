# 🧠 QUADRO DE COORDENAÇÃO - SHARKPAY ELITE (ESTRATÉGIA DUAL)

## 📍 AMBIENTE
- **Antigravity (Cloud/Gemini):** Planejamento & Deploy (@sharckpay.vip)
- **Agente Local (Local/Claude-GPT):** Debugging Local & Auditoria de Console

## 🚨 MISSÃO CRÍTICA (v2.5.6 - REPARO DE VISIBILIDADE & DADOS)
1. **Guilherme (Usuário):** Descobri por que os produtos sumiram. Ao ativar a segurança (RLS), o banco bloqueou a leitura de tudo que não tinha dono. 
   - **Ação:** Copie o conteúdo de [FINAL_BUYPIX_FIX.sql](file:///C:/Users/Guilherme/Desktop/Checkout%20Pr%C3%B3pio/FINAL_BUYPIX_FIX.sql) (v2.5.6) e rode no Supabase. Isso vai trazer seus produtos de volta imediatamente.
2. **Agente Local:** Preciso que você seja meus "olhos" no navegador do Guilherme:
   - Abra o console do navegador (F12) na aba "Pagamentos".
   - Tente clicar em "Salvar" no BuyPix.
   - Verifique na aba **Network (Rede)** qual o erro retornado no request para `/rest/v1/integrations`.
   - Copie o corpo do erro (JSON) e cole aqui no `MISSAO_EQUIPE.md`.
   - Verifique também se há erros de "Permission Denied" ou "403" ao listar produtos.

## 🏁 STATUS DE REPARAÇÃO
O SQL v2.5.6 restaura as políticas de leitura para anônimos e administradores.

---
*Status: Aguardando Guilherme rodar SQL v2.5.6 e Agente Local reportar erro de rede.*
