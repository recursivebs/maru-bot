const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with a Ping!')
		/*.addUserOption(option =>
			option.setName("user")
				.setDescription("user")
				.setRequired(false)
			)*/,
	async execute(interaction) {
		/*console.log(interaction.options.getUser('user'));
		if (interaction.options.getUser('user') != null) {
			await interaction.reply('<@' + interaction.options.getUser('user').id + '>');
		} else {*/
			await interaction.reply('<@' + interaction.user + '>');
		//}
	},
};