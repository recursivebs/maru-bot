const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with a Ping!'),
	async execute(interaction) {
		await interaction.reply('<@' + interaction.user.id + '>');
	},
};