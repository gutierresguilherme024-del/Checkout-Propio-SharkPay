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

### Regras Globais de Execução de Tarefas (Modelo Padrão da OpenClaw)
**Sprint Colaborativo de 5 Minutos** (padrão obrigatório para TODAS as tarefas):
- Jarvis anuncia o início do sprint.
- Cada agente aparece **uma única vez** no chat com seu log específico e real.
- Logs devem ser atrativos, curtos e mostrar trabalho em equipe (ex: "Bruna: Definindo lógica de testes...", "Jaqueline Produtiva: Criando arquivos...").
- Nenhum agente repete mensagem ou cria loop.
- Ao final, Jarvis ou o agente coordenador entrega o relatório consolidado com:
  1. O que foi feito
  2. Progresso
  3. Status final
  4. Plano/código/commit/push (quando aplicável)
- Todo o trabalho segue as Regras de Ouro e o Método Akita.
- O agente coordenador pode convocar a equipe inteira quando necessário.
## REGRAS GLOBAIS DE EXECUÇÃO DE TAREFAS (Modelo Padrão - Atualizado 05/03/2026)

**Regra de Execução Contínua de Sprints (Obrigatória para todas as tarefas):**

- Todas as tarefas serão executadas em sprints colaborativos de exatamente 5 minutos.
- Se a tarefa não atingir 100% ao final de um sprint, Jarvis deve iniciar automaticamente um novo sprint de 5 minutos até a conclusão total (100%).
- Jarvis deve sempre informar a hora real do Brasil (UTC-3) e dar estimativa de tempo restante no início de cada sprint.
- Cada agente deve mostrar logs em tempo real com % de progresso claro (ex: "Bruna: Otimizando QR Code... 67% concluído").
- No final de cada sprint, Jarvis entrega relatório consolidado com tempo gasto vs estimativa.
- Este modelo é agora o padrão global de execução de todas as tarefas da OpenClaw.

**Hora atual de referência (Brasil -03):** 05 de Março de 2026, 00:51.

Esta regra está salva como padrão permanente.
## REGRAS GLOBAIS DE IDENTIDADE VISUAL DOS AGENTES (Atualizado 05/03/2026)

**Identidade Visual Obrigatória em Todos os Sprints:**

- Cada agente deve aparecer no chat usando **seu webhook específico**.
- O nome exibido deve seguir o padrão: **[Nome]APP** (ex: BrunaAPP, Roberto JustosAPP, Jaqueline ProdutivaAPP, AlexandreAPP, Adibe MarquesAPP, etc.).
- Cada webhook deve estar configurado com seu **avatar/foto de perfil** correspondente, para que o agente apareça nitidamente com sua identidade visual completa durante todo o sprint.
- Durante os sprints colaborativos de 5 minutos, os logs devem ser exibidos com nome completo + avatar do agente para máxima imersão e percepção de equipe.
- Jarvis é responsável por garantir que todos os agentes sejam exibidos com sua identidade própria (sem mensagens genéricas ou sem avatar).

Esta regra é agora **padrão permanente** em todas as execuções de tarefas da OpenClaw. Salve como parte do modelo global.
