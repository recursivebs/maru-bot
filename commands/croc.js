const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('croc')
		.setDescription('croc'),
	async execute(interaction) {
			await interaction.reply("<a:croc:958219976106467349>");
	},
};

//https://cdn.discordapp.com/emojis/958219976106467349.webp?size=44&quality=lossless