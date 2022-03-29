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
		playerInfo = {};

        fetch(playerInfoEndpoint)
			.then((response) => response.json())
			.then(data => {

				playerInfo = data;

				const reportEndpoint = "https://marubot.bluecurse.com/report/player-medals";
				return fetch(reportEndpoint)
					.then((response) => response.json())
					.then(data => {

						// Need to filter out all other players with the same rank
						// as the current player, we don't care about them
						let filteredData = data.filter(player => {
							if (player.medal_rank === playerInfo.medal_rank) {
								return player.player_id === playerInfo.player_id;
							}
							return true;
						});

						playerIndex = filteredData.map(player => player.player_id).indexOf(playerInfo.player_id);
						if (playerIndex < 6) {
							playerIndex = 6;
						}
						console.log(playerIndex);

						const topTen = filteredData.slice(playerIndex - 6, playerIndex + 4);
						let embed = new MessageEmbed()
							.setColor("#EFFF00")
							.setTitle("Relative Leaderboard")
						let message = ""
						topTen.forEach(x => message = ((x.player_id === playerInfo.player_id)? '**' : '') + `${message}${x.medal_rank} - ${x.player_name} - ${x.medals}` + ((x.player_id === playerInfo.player_id)? '**' : '') + `\n`)
						embed.setDescription(message);
						interaction.editReply({embeds: [embed]});
					});
			});
        

	},
};