const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('goinsane')
		.setDescription('goinsane'),
	async execute(interaction) {
			await interaction.reply("**I SWEAR I GOT THIS SHIT THAT MAKES THESE BITCHES GO INSANE GO INSANE GO INSANE**");
	},
};