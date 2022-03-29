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
						if (playerIndex < 5) {
							playerIndex = 5;
						}

						const topTen = filteredData.slice(playerIndex - 5, playerIndex + 6);
						let embed = new MessageEmbed()
							.setColor("#EFFF00")
							.setTitle("Relative Leaderboard for " + playerInfo.player_name)
						let message = "```diff\n"

						// length of the number of the last rank in the list (largest)
						let rankLen = topTen[topTen.length-1].medal_rank.toString().length;
						// Length of the number of the first medal count (largest)
						let medLen = topTen[0].medals.toString().length;

						topTen.forEach(player => {
                            let youToken = "  "
                            if (player.player_id === playerInfo.player_id) {
                                youToken = "+ "
                            }
                            let line = `${youToken}${player.medal_rank}`

                            line += ` `.repeat((3 + rankLen) - line.length);

                            line +=`- 🎖️${player.medals}` 

                            line += ` `.repeat((11 + medLen) - line.length);
                            
                            line += `- ${player.player_name}\n`

                            message += line;
                        })
                        message += '```'
						embed.setDescription(message);
						interaction.editReply({embeds: [embed]});
					});
			});
        

	},
};