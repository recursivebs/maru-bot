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
				.setTitle("top 10")
			let message = ""
			topTen.forEach(x => message = `${message}${x.medal_rank} - ${x.player_name} - ${x.medals}\n`)
			embed.setDescription(message);
			interaction.editReply({embeds: [embed]});
		});

	},
};