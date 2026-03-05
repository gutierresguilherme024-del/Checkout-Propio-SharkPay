# Memória da Empresa OpenClaw - Método Akita
## Projeto: Checkout Própio - SharkPay

### Regras de Ouro
1. Integrações não interferem uma na outra.
2. Cada agente resolve problemas do seu próprio gatilho.
3. Arquivos críticos como `api/process-payment.ts` estão blindados para Stripe, PushinPay e MundPay. Mudanças só no BuyPix.
4. O bot Jarvis é o orquestrador principal.

### Agentes e Modelos
- **Jarvis** (Orquestrador) -> StepFun/Step-3.5-Flash
- **Alexandre** (Integrações & Bugs) -> DeepSeek Coder V3
- **Bruna** (Pagamentos & Checkout) -> StepFun/Step-3.5-Flash
- **Adibe Marques** (Arquitetura) -> Arcee AI Trinity Large
- **Tesla** (Prompt Engineering) -> StepFun/Step-3.5-Flash
- **O Executor** (Operações) -> DeepSeek R1
- **Jaqueline Produtiva** (Deploy/Git) -> Qwen3 Coder 480B
- **Roberto Justos** (Contratação/Análise) -> Qwen3 Coder 480B
