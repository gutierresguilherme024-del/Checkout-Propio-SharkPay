import discord
import os
import requests
from dotenv import load_dotenv

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True
bot = discord.Client(intents=intents)

# Seus webhooks (exatos)
WEBHOOKS = {
    "jarvis": "https://discordapp.com/api/webhooks/1478839031772090549/daGEP-vUWu6mJlsfKzKxgJidV4wBwVdPgaz2lwf7ZqzviXIR_zLkBcMmDslhXool5pHy",
    "alexandre": "https://discordapp.com/api/webhooks/1478839052487758027/yzunO-hCNYo-cy5tOGnzbQeVj1GFv-PpO5fxwX-iaHjQVOnbBssCp0IMt8_H57h4v6Qv",
    "bruna": "https://discordapp.com/api/webhooks/1478839259682181152/u1H9izCIGLeqj4bf53c_ZO1GGZWzn7R7CNzi09R9IS6TPF2BuKZkPbnJSW5nOUtxkKgx",
    "adibe marques": "https://discordapp.com/api/webhooks/1478839266594525205/bEgmL_c3DHIPnXzqyCiSI2_xiJKDxAJiOtQzfJ2c6xG3gplmDXpKLQYQyIpQFod_J5Jg",
    "tesla": "https://discordapp.com/api/webhooks/1478839270285381652/GXUFX-ctKN_EWdyeeO5owwkiJ5KBSRFMAg_VK4362bTkHSlM50_FEFJSjZD2biPadRhx",
    "o executor": "https://discordapp.com/api/webhooks/1478839275062563037/4AYIGSxi63koSBd2Di0R2CawTL1AE_6rTWB3kGiyGC6kfZ8p7efMyubevMP5SvCJ8HIm",
    "jaqueline produtiva": "https://discordapp.com/api/webhooks/1478839296394793084/O2heUIluEtnkCgQMlYtv7GQf0toozYKJHGXY3siyC14e7pu-kGhCReJF23YhPe7-XmlN",
    "roberto justos": "https://discordapp.com/api/webhooks/1478839301197402316/pBiqXYiDI9alBEAlLInUeIGwTb7U1vvgWUqvxYMDRaU2kvNs0Qlzl36TlBhm3XxdaGPb"
}

# Carrega toda a memória da empresa
try:
    with open('cloud.md', 'r', encoding='utf-8') as f:
        cloud_context = f.read()
except FileNotFoundError:
    cloud_context = "# Memória da Empresa Inicializada"

@bot.event
async def on_ready():
    print("✅ JARVIS ESTÁVEL E FUNCIONANDO!")
    try:
        channel_id = os.getenv("DISCORD_CHANNEL_ID")
        if channel_id:
            channel = bot.get_channel(int(channel_id))
            if channel is None:
                channel = await bot.fetch_channel(int(channel_id))
            if channel:
                await channel.send("**Jarvis** - Orquestrador: Agora estou estável e seguindo 100% o Método Akita. Respondo imediatamente quando chamado.")
    except Exception as e:
        print(f"Erro ao anunciar ativação: {e}")

@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    content = message.content.lower()
    
    # Verifica se o bot foi mencionado ou se "jarvis" está no conteúdo
    is_jarvis_call = any(mention.id == bot.user.id for mention in message.mentions) or "jarvis" in content

    # Jarvis responde sempre que mencionado
    if is_jarvis_call:
        try:
            api_key = os.getenv('OPENROUTER_API_KEY') or os.getenv('VITE_OPENROUTER_API_KEY')
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "stepfun/step-3.5-flash:free",
                    "messages": [
                        {
                            "role": "system", 
                            "content": f"Você é Jarvis - Orquestrador da OpenClaw para o Checkout Própio. Use toda a lógica do Método Akita e o arquivo cloud.md abaixo. Responda curto, direto e útil. Só chame outros agentes quando necessário e sempre peça aprovação explícita do Arquiteto (usuário) para commits, push ou mudanças críticas.\n\n{cloud_context}"
                        },
                        {"role": "user", "content": message.content}
                    ],
                    "temperature": 0.5
                },
                timeout=30
            ).json()

            if "choices" in response:
                reply = response["choices"][0]["message"]["content"]
                # Divide mensagens longas se necessário
                chunks = [reply[i:i + 1900] for i in range(0, len(reply), 1900)]
                for chunk in chunks:
                    await message.channel.send(f"**Jarvis** - Orquestrador: {chunk}")
            else:
                print(f"Erro OpenRouter: {response}")
                await message.channel.send("**Jarvis** - Orquestrador: Estou aqui e pronto. Tive um erro na rede neural, mas pode repetir.")

        except Exception as e:
            print(f"Erro em on_message (Jarvis): {e}")
            await message.channel.send("**Jarvis** - Orquestrador: Estou aqui e funcionando. Diga o que precisa.")

    # Chamada direta a outros agentes quando Jarvis não é o foco principal
    else:
        for name in WEBHOOKS:
            if name in content:
                webhook_url = WEBHOOKS.get(name)
                try:
                    payload = {"content": message.content, "username": name.title()}
                    requests.post(webhook_url, json=payload, timeout=5)
                except Exception as e:
                    print(f"Erro no webhook de {name}: {e}")
                return

bot.run(os.getenv("DISCORD_BOT_TOKEN"))
