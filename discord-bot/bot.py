import discord
import os
import requests
from dotenv import load_dotenv
import asyncio

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True
bot = discord.Client(intents=intents)

# Webhooks definitivos da equipe OpenClaw
WEBHOOKS = {
    "jarvis":          "https://discordapp.com/api/webhooks/1478839031772090549/daGEP-vUWu6mJlsfKzKxgJidV4wBwVdPgaz2lwf7ZqzviXIR_zLkBcMmDslhXool5pHy",
    "alexandre":       "https://discordapp.com/api/webhooks/1478839052487758027/yzunO-hCNYo-cy5tOGnzbQeVj1GFv-PpO5fxwX-iaHjQVOnbBssCp0IMt8_H57h4v6Qv",
    "bruna":           "https://discordapp.com/api/webhooks/1478839259682181152/u1H9izCIGLeqj4bf53c_ZO1GGZWzn7R7CNzi09R9IS6TPF2BuKZkPbnJSW5nOUtxkKgx",
    "adibe marques":   "https://discordapp.com/api/webhooks/1478839266594525205/bEgmL_c3DHIPnXzqyCiSI2_xiJKDxAJiOtQzfJ2c6xG3gplmDXpKLQYQyIpQFod_J5Jg",
    "tesla":           "https://discordapp.com/api/webhooks/1478839270285381652/GXUFX-ctKN_EWdyeeO5owwkiJ5KBSRFMAg_VK4362bTkHSlM50_FEFJSjZD2biPadRhx",
    "o executor":      "https://discordapp.com/api/webhooks/1478839275062563037/4AYIGSxi63koSBd2Di0R2CawTL1AE_6rTWB3kGiyGC6kfZ8p7efMyubevMP5SvCJ8HIm",
    "jaqueline":       "https://discordapp.com/api/webhooks/1478839296394793084/O2heUIluEtnkCgQMlYtv7GQf0toozYKJHGXY3siyC14e7pu-kGhCReJF23YhPe7-XmlN",
    "jaqueline produtiva": "https://discordapp.com/api/webhooks/1478839296394793084/O2heUIluEtnkCgQMlYtv7GQf0toozYKJHGXY3siyC14e7pu-kGhCReJF23YhPe7-XmlN",
    "roberto justos":  "https://discordapp.com/api/webhooks/1478839301197402316/pBiqXYiDI9alBEAlLInUeIGwTb7U1vvgWUqvxYMDRaU2kvNs0Qlzl36TlBhm3XxdaGPb",
    "harvey specter":  "https://discordapp.com/api/webhooks/1478966613918220370/7rCy1i3yPJoWS341mA_aWeE-UyEcf3hyZ9ByVtCnMQE98CQeXji_DDjwXRZ2sR3dI_lM"
}

try:
    with open('cloud.md', 'r', encoding='utf-8') as f:
        cloud_context = f.read()
except FileNotFoundError:
    cloud_context = "# Memória não encontrada."

@bot.event
async def on_ready():
    print("✅ VERSÃO DEFINITIVA ATIVADA - ANTI-LOOP + HARVEY SPECTER")
    try:
        channel_id = os.getenv("DISCORD_CHANNEL_ID")
        if channel_id:
            channel = bot.get_channel(int(channel_id))
            if channel is None:
                channel = await bot.fetch_channel(int(channel_id))
            if channel:
                await channel.send("**JarvisAPP** - Orquestrador: Memória global atualizada. Loop quebrado. Harvey Specter integrado à equipe. O Padrão Sprint Colaborativo de 5 minutos está ativo!")
    except Exception as e:
        print(f"Erro ao anunciar on_ready: {e}")

@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    content = message.content.lower()

    if bot.user in message.mentions or "jarvis" in content:
        # Harvey Specter entra em ação
        if "harvey" in content or "navegador" in content or "buy pix" in content or "buypix" in content:
            webhook_url = WEBHOOKS["harvey specter"]
            try:
                # Regra Global: Identidade Visual e Sprints
                payload_init = {"content": "Harvey SpecterAPP: Entrando no caso. Iniciando análise crítica de infraestrutura (BuyPix / Navegador) em modo sprint estratégico...", "username": "Harvey SpecterAPP"}
                requests.post(webhook_url, json=payload_init, timeout=5)
                
                await asyncio.sleep(8) # Simula avaliação do erro impossível
                
                # Resposta da IA atuando como Harvey
                api_key = os.getenv('OPENROUTER_API_KEY') or os.getenv('VITE_OPENROUTER_API_KEY')
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "stepfun/step-3.5-flash:free",
                        "messages": [
                            {"role": "system", "content": f"Você é Harvey Specter da OpenClaw. O especialista de elite que resolve o que os outros não conseguem. Seja afiado, focado no negócio e não perca tempo. Entregue a arquitetura ou correção pedida.\n\n{cloud_context}"},
                            {"role": "user", "content": message.content}
                        ]
                    },
                    timeout=30
                ).json()

                if "choices" in response:
                    reply = response["choices"][0]["message"]["content"]
                    chunks = [reply[i:i + 1900] for i in range(0, len(reply), 1900)]
                    for chunk in chunks:
                        payload_final = {"content": chunk, "username": "Harvey SpecterAPP"}
                        requests.post(webhook_url, json=payload_final, timeout=5)
            except Exception as e:
                print(f"Erro Harvey: {e}")
            return

        # Para outros agentes sendo chamados DIRETAMENTE com base na demanda
        # Vamos implementar um pequeno roteador limpo, sem loop.
        routed_agent = None
        if "roberto" in content or "planeje" in content or "contrata" in content:
            routed_agent = "roberto justos"
        elif "bruna" in content or "checkout" in content:
            routed_agent = "bruna"
        elif "alexandre" in content or "integração" in content:
            routed_agent = "alexandre"
        elif "jaqueline" in content or "deploy" in content or "commit" in content:
            routed_agent = "jaqueline produtiva"
        elif "adibe" in content or "arquitetura" in content:
            routed_agent = "adibe marques"

        if routed_agent:
            webhook_url = WEBHOOKS.get(routed_agent)
            agent_name_app = f"{routed_agent.title()}APP"
            try:
                # Regra Global: um log de inicio
                payload_log = {"content": f"{agent_name_app}: Analisando a diretriz estabelecida...", "username": agent_name_app}
                requests.post(webhook_url, json=payload_log, timeout=5)

                api_key = os.getenv('OPENROUTER_API_KEY') or os.getenv('VITE_OPENROUTER_API_KEY')
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "stepfun/step-3.5-flash:free",
                        "messages": [
                            {"role": "system", "content": f"Você é {routed_agent.title()} da OpenClaw. Respeite as Regras Globais e Método Akita.\n\n{cloud_context}"},
                            {"role": "user", "content": message.content}
                        ]
                    },
                    timeout=30
                ).json()

                if "choices" in response:
                    reply = response["choices"][0]["message"]["content"]
                    chunks = [reply[i:i + 1900] for i in range(0, len(reply), 1900)]
                    for chunk in chunks:
                        payload_final = {"content": chunk, "username": agent_name_app}
                        requests.post(webhook_url, json=payload_final, timeout=5)
            except:
                pass
            return
            
        # Resposta normal/direta do Jarvis Orquestrador sem acionar especialista específico
        try:
            api_key = os.getenv('OPENROUTER_API_KEY') or os.getenv('VITE_OPENROUTER_API_KEY')
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "stepfun/step-3.5-flash:free",
                    "messages": [
                        {"role": "system", "content": f"Você é JarvisAPP - Orquestrador da OpenClaw. Use toda a lógica do cloud.md. Siga OBRIGATORIAMENTE o formato de Resposta APP. NUNCA crie loops. Roteie diretamente as mensagens. Responda de forma extremamente curta e eficaz.\n\n{cloud_context}"},
                        {"role": "user", "content": message.content}
                    ]
                },
                timeout=30
            ).json()

            if "choices" in response:
                reply = response["choices"][0]["message"]["content"]
                chunks = [reply[i:i + 1900] for i in range(0, len(reply), 1900)]
                for chunk in chunks:
                    await message.channel.send(f"**JarvisAPP** - Orquestrador: {chunk}")
        except:
            await message.channel.send("**JarvisAPP** - Orquestrador: Conexão instável, mas continuo online.")

bot.run(os.getenv("DISCORD_BOT_TOKEN"))
