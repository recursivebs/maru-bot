const fetch = require('node-fetch');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Registers this user with the bot.')
		.addStringOption(option =>
			option.setName("scoresaber_id")
				.setDescription("Scoresaber ID to link with this discord account.")
				.setRequired(true)
			),
	async execute(interaction) {
        const scoresaberId = interaction.options.getString("scoresaber_id");
        const discordId = interaction.user.id;
        const guildId = interaction.guild_id;
        const registrationEndpoint = `https://marubot.bluecurse.com/user/register/${discordId}/${scoresaberId}/${guildId}`;

        fetch(registrationEndpoint)
            .then((response) => response.json())
            .then(data => {
                if (data.success) {
                    return interaction.reply(`Registration complete.`);
                } else {
                    return interaction.reply(`You're already registered.`);
                }
            });
	},
};