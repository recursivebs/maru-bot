import discord

client = discord.Client()
client_token = "OTU0OTYzMzIzNDA3OTc4NTc2.Yjaw5g.3hkcJlZybQ_gDmKdlf_VtGS8IQ4"

# Discord

@client.event
async def on_ready():
	print('We have successfully logged in as {0.user}'.format(client))

@client.event
async def on_message(message):

	# Ignore messages from ourselves
	if message.author == client.user:
		return

	if message.content.startswith('$hello'):
		await message.channel.send("Hello!")

client.run(client_token)