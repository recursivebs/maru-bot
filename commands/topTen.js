const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const helpers = require('../helpers');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('top10')
		.setDescription('Displays the top ten medal holders.'),
	async execute(interaction) {

		await interaction.deferReply();

		const term = interaction.options.getString('term');

		const query = new URLSearchParams({ term });

		const reportEndpoint = "https://marubot.bluecurse.com/report/player-medals";
		fetch(reportEndpoint)
		.then((response) => response.json())
		.then(data => {
			const topTen = data.slice(0, 10);
			let embed = new MessageEmbed()
				.setColor("#EFFF00")
				.setTitle("Top 10")
			let message = "```diff\n"
			// length of the number of the last rank in the list (largest)
			let rankLen = topTen[topTen.length-1].medal_rank.toString().length;
			// Length of the number of the first medal count (largest)
			let medLen = topTen[0].medals.toString().length;

			let count = 1;
			topTen.forEach(player => {

				let emojiToken = "🎖️";
				if (count === 1) {
					emojiToken = "🥇";
				}
				if (count === 2) {
					emojiToken = "🥈";
				}
				if (count === 3) {
					emojiToken = "🥉";
				}
				count++;

				let line = `  ${player.medal_rank}`

				line += ` `.repeat((3 + rankLen) - line.length);

				line +=`- ${emojiToken}${player.medals}` 

				line += ` `.repeat((11 + medLen) - line.length);
				
				line += `- ${player.player_name}\n`

				message += line;
			})
			message += '```'
			embed.setDescription(message);
			interaction.editReply({embeds: [embed]});
		})
		.catch(err => {
			console.log(err);
			interaction.editReply(`An error occurred ;; the bot is probably updating data right now and I haven't had time to fix, please try again in a minute or two :)`);
		});
	},
};