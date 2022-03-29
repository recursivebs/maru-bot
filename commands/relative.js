const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const helpers = require('../helpers');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('relative')
		.setDescription('Displays the nearest players on the leaderboard')
        .addStringOption(option =>
			option.setName("player_id")
				.setDescription("player_id")
				.setRequired(true)
			),

	async execute(interaction) {

		await interaction.deferReply();

        const player_id = helpers.extractPlayerId(interaction.options.getString("player_id"));

        const playerInfoEndpoint = `https://marubot.bluecurse.com/report/player-medals/player-id/${player_id}`;

        let playerIndex = 0;

        fetch(playerInfoEndpoint)
			.then((response) => response.json())
			.then(data => {
				playerIndex = data["medal_rank"];
				if (playerIndex < 6) {
					console.log(playerIndex);
					playerIndex = 6;
				}
				const reportEndpoint = "https://marubot.bluecurse.com/report/player-medals";
				return fetch(reportEndpoint)
					.then((response) => response.json())
					.then(data => {
						const topTen = data.slice(playerIndex - 6, playerIndex + 4);
						let embed = new MessageEmbed()
							.setColor("#EFFF00")
							.setTitle("Relative Leaderboard")
						let message = ""
						topTen.forEach(x => message = ((x.medal_rank === playerIndex)? '**' : '') + `${message}${x.medal_rank} - ${x.player_name} - ${x.medals}` + ((x.medal_rank === playerIndex)? '**' : '') + `\n`)
						embed.setDescription(message);
						interaction.editReply({embeds: [embed]});
					});
			});
        

	},
};