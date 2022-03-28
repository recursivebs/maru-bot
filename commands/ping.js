const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with a Ping!')
		.addUserOption(option =>
			option.setName("user")
				.setDescription("user")
				.setRequired(false)
			),
	async execute(interaction) {
		if (user) {
			await interaction.reply('<@' + interaction.options.getUser('target').id + '>');
		} else {
			await interaction.reply('<@' + interaction.user.id + '>');
		}
	},
};