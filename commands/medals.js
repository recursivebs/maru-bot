const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const groupBy = require('group-by');
const helpers = require('../helpers');
const playerRankSongListReport = require('../report-builders/player-rank-song-list-report')

const getPageData = (d, page, page_length) => d.slice((page - 1) * page_length, ((page - 1) * page_length) + page_length);

const buildEmbed = (playerInfo) => {
	let embed = new MessageEmbed()
		.setColor("#EFFF00")

	let starFilterText = ""

	if (playerInfo.min_star_value > 0 || playerInfo.max_star_value < 13) {
		starFilterText = ` (for ⭐${playerInfo.min_star_value} to ⭐${playerInfo.max_star_value})`
	}

	embed.setTitle(`Top Regional Scores for ${playerInfo.player_name} - Rank ${playerInfo.medal_rank}, 🎖️${playerInfo.medals} ${starFilterText}:`)
	return embed;
}

const buildPagination = (currentPage, maxPage, disablePrevious, disableNext) => {
	const row = new MessageActionRow()
	.addComponents(
		new MessageButton()
			.setCustomId('first')
			.setLabel('◀◀')
			.setStyle('PRIMARY')
			.setDisabled(disablePrevious),
		new MessageButton()
			.setCustomId('previous')
			.setLabel('◀')
			.setStyle('PRIMARY')
			.setDisabled(disablePrevious),
		new MessageButton()
			.setCustomId('pageNum')
			.setLabel(`Page ${currentPage}/${maxPage}`)
			.setStyle('SECONDARY')
			.setDisabled(true),
		new MessageButton()
			.setCustomId('next')
			.setLabel('▶')
			.setStyle('PRIMARY')
			.setDisabled(disableNext),
		new MessageButton()
			.setCustomId('last')
			.setLabel('▶▶')
			.setStyle('PRIMARY')
			.setDisabled(disableNext)
	);
	return row;
}

const minStarValueDefault = 0;
const maxStarValueDefault = 13;

const getMinStarValue = (inputStr) => {
	let value = Number.parseFloat(inputStr);
	if (isNaN(value)) {
		value = 0;
	}
	if (value < minStarValueDefault) {
		value = minStarValueDefault;
	}
	if (value > maxStarValueDefault) {
		value = maxStarValueDefault;
	}
	return value.toFixed(2);
}

const getMaxStarValue = (inputStr, minStarValue) => {
	let value = Number.parseFloat(inputStr);
	if (isNaN(value)) {
		value = maxStarValueDefault;
	}
	if (value < minStarValue) {
		value = minStarValue;
	}
	if (value > maxStarValueDefault) {
		value = maxStarValueDefault;
	}
	return value.toFixed(2);
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('medals')
		.setDescription('Canadian Medals-related commands.')
		.addSubcommand(subcommand =>
			subcommand
				.setName("leaderboard")
				.setDescription("Display the medal leaderboard.")
				.addStringOption(option =>
					option.setName("player_id")
						.setDescription("ID of player.")
						.setRequired(false)
					),
			)
		.addSubcommand(subcommand =>
			subcommand
				.setName("medal-list")
				.setDescription("Lists a player's top 10 regional plays.")
				.addStringOption(option =>
					option.setName("player_id")
						.setDescription("ID of player.")
						.setRequired(true)
					)
				.addStringOption(option =>
					option.setName("min_star_value")
					.setDescription("Minimum star value. Defaults to 0.")
					.setRequired(false)
				)
				.addStringOption(option =>
					option.setName("max_star_value")
					.setDescription("Maximum star value. Defaults to MAX.")
					.setRequired(false)
				)
				.addBooleanOption(option =>
					option.setName("hidden")
					.setDescription("If true, this report will only be visible to you.")
					.setRequired(false)
				),
			)
		.addSubcommand(subcommand =>
			subcommand
				.setName("medals-gained")
				.setDescription("Displays the top medals gained by player for the day.")
			)
		.addSubcommand(subcommand =>
			subcommand
				.setName("medals-lost")
				.setDescription("Displays the top medals lost by player for the day.")
			)
		.addSubcommand(subcommand =>
			subcommand
				.setName("star-rankings")
				.setDescription("Displays a breakdown report by star for a given player id")
				.addStringOption(option =>
					option.setName("player_id")
						.setDescription("ID of player.")
						.setRequired(true)
					)
			)
		,
	async execute(interaction) {

		await interaction.deferReply();

		const subcommand = interaction.options.getSubcommand()
		let cachedData = [];
		let summaryData = {};
		let playerInfo = {};
		let currentPage = 1;
		const pageLength = 15;

		if (subcommand === "medal-list") {

			const player_id = helpers.extractPlayerId(interaction.options.getString("player_id"));
			const min_star_value = getMinStarValue(interaction.options.getString("min_star_value"));
			const max_star_value = getMaxStarValue(interaction.options.getString("max_star_value"), min_star_value);

			const playerInfoEndpoint = `https://marubot.bluecurse.com/report/player-medals/player-id/${player_id}`
			const playerRankSongListEndpoint = `https://marubot.bluecurse.com/report/player-rank-song-list/player-id/${player_id}`

			fetch(playerInfoEndpoint)
			.then((response) => response.json())
			.then(data => {

				playerInfo = data;

				// Throwing these star values onto the playerInfo object so we can use them in the embed construction function
				playerInfo.min_star_value = min_star_value;
				playerInfo.max_star_value = max_star_value;

				return fetch(playerRankSongListEndpoint);

			})
			.then((response) => response.json())
			.then(data => {

				if (data.length <= 0) {
					return interaction.editReply(`No results found for Player #${player_id}.`);
				}

				cachedData = data.filter(x => +x.stars >= min_star_value && +x.stars <= max_star_value);
				let maxPage = Math.floor(cachedData.length / pageLength);
				if (cachedData.length % pageLength > 0) {
					maxPage = maxPage + 1;
				}

				const groupedData = groupBy(cachedData, 'rank')
				for (const [key, value] of Object.entries(groupedData)) {
					summaryData[key] = value.length
				}

				let slicedData = getPageData(cachedData, currentPage, pageLength);

				embed = buildEmbed(playerInfo);
				playerRankSongListReport.build(slicedData, summaryData, embed);

				const buttonRow = buildPagination(currentPage, maxPage, true, maxPage === 1);

				interaction.editReply({embeds: [embed], components: [buttonRow]});

				const timeoutTime = 180000;
				const firstFilter = i => i.customId === 'first' && i.user.id === interaction.user.id;
				const lastFilter = i => i.customId === 'last' && i.user.id === interaction.user.id;
				const previousFilter = i => i.customId === 'previous' && i.user.id === interaction.user.id;
				const nextFilter = i => i.customId === 'next' && i.user.id === interaction.user.id;
				const previousCollector = interaction.channel.createMessageComponentCollector({previousFilter, time: timeoutTime});
				const nextCollector = interaction.channel.createMessageComponentCollector({nextFilter, time: timeoutTime});
				const firstCollector = interaction.channel.createMessageComponentCollector({firstFilter, time: timeoutTime});
				const lastCollector = interaction.channel.createMessageComponentCollector({lastFilter, time: timeoutTime});

				previousCollector.on('collect', async i => {
					if (i.customId === "previous") {
						const nextEmbed = buildEmbed(playerInfo)
						currentPage = currentPage - 1;
						if (currentPage < 1) {
							currentPage = 1;
						}
						if (currentPage > maxPage) {
							currentPage = maxPage;
						}
						const disableNext = (currentPage === maxPage);
						const disablePrevious = (currentPage === 1);
						buttons = buildPagination(currentPage, maxPage, disablePrevious, disableNext);
						slicedData = getPageData(cachedData, currentPage, pageLength);
						playerRankSongListReport.build(slicedData, summaryData, nextEmbed);
						await i.update({embeds: [nextEmbed], components: [buttons]})
					}
				});

				nextCollector.on('collect', async i => {
					if (i.customId === "next") {
						const nextEmbed = buildEmbed(playerInfo)
						currentPage = currentPage + 1;
						if (currentPage > maxPage) {
							currentPage = maxPage;
						}
						const disableNext = (currentPage === maxPage);
						const disablePrevious = (currentPage === 1);
						buttons = buildPagination(currentPage, maxPage, disablePrevious, disableNext);
						slicedData = getPageData(cachedData, currentPage, pageLength);
						playerRankSongListReport.build(slicedData, summaryData, nextEmbed);
						await i.update({embeds: [nextEmbed], components: [buttons]})
					}
				});

				firstCollector.on('collect', async i => {
					if (i.customId === "first") {
						const nextEmbed = buildEmbed(playerInfo)
						currentPage = 1;
						const disableNext = false;
						const disablePrevious = true;
						buttons = buildPagination(currentPage, maxPage, disablePrevious, disableNext);
						slicedData = getPageData(cachedData, currentPage, pageLength);
						playerRankSongListReport.build(slicedData, summaryData, nextEmbed);
						await i.update({embeds: [nextEmbed], components: [buttons]})
					}
				});


				lastCollector.on('collect', async i => {
					if (i.customId === "last") {
						const nextEmbed = buildEmbed(playerInfo)
						currentPage = maxPage;
						const disableNext = (currentPage === maxPage);
						const disablePrevious = (currentPage === 1);
						buttons = buildPagination(currentPage, maxPage, disablePrevious, disableNext);
						slicedData = getPageData(cachedData, currentPage, pageLength);
						playerRankSongListReport.build(slicedData, summaryData, nextEmbed);
						await i.update({embeds: [nextEmbed], components: [buttons]})
					}
				});

				previousCollector.on('end', collected => console.log(`Collected ${collected.size} items`));
				nextCollector.on('end', collected => console.log(`Collected ${collected.size} items`));
				firstCollector.on('end', collected => console.log(`Collected ${collected.size} items`));
				lastCollector.on('end', collected => console.log(`Collected ${collected.size} items`));


			});

		} else if (subcommand === "leaderboard") {

			return interaction.editReply(`<@236098541523566593> poggies`)

		} else if (subcommand === "medals-gained") {

			const reportEndpoint = "https://marubot.bluecurse.com/report/player-medals-diff/1";
			fetch(reportEndpoint)
			.then((response) => response.json())
			.then(data => {

				const gainersToShow = 20;
				let gainers = data.filter(x => x.medals_diff > 0)
								.sort((a, b) => b.medals_diff - a.medals_diff)
								.slice(0, gainersToShow);

				let message = "```"

				let embed = new MessageEmbed()
					.setColor("#00FF00")
					.setTitle("Medals gained today")

				gainers.forEach(report => {
					let line = ` +🎖️${report.medals_diff} - ${report.player_name}\n` 
					message += line;
				})
				message += '```'
				embed.setDescription(message);
				interaction.editReply({embeds: [embed]});
			});

		} else if (subcommand === "medals-lost") {

			const reportEndpoint = "https://marubot.bluecurse.com/report/player-medals-diff/1";
			fetch(reportEndpoint)
			.then((response) => response.json())
			.then(data => {

				const losersToShow = 20;
				let losers = data.filter(x => x.medals_diff < 0)
								.sort((a, b) => a.medals_diff - b.medals_diff)
								.slice(0, losersToShow);

				let message = "```"

				let embed = new MessageEmbed()
					.setColor("#FF0000")
					.setTitle("Medals lost today")

				losers.forEach(report => {
					let line = ` -🎖️${Math.abs(report.medals_diff)} - ${report.player_name}\n` 
					message += line;
				})
				message += '```'
				embed.setDescription(message);
				interaction.editReply({embeds: [embed]});
			});

		} else if (subcommand === "star-rankings") {

			const player_id = helpers.extractPlayerId(interaction.options.getString("player_id"));
			const reportEndpoint = "https://marubot.bluecurse.com/report/player-star-rankings/" + player_id;
			fetch(reportEndpoint)
			.then((response) => response.json())
			.then(data => {

				let message = "```"

				let embed = new MessageEmbed()
					.setColor("#FFFF00")
					.setTitle(`Star Rankings for Player ${data.player_name}`)

				message += ` ★0  | Rank ${data.rank_0}\t| 🎖️${data.medals_0}\n`
				message += ` ★1  | Rank ${data.rank_1}\t| 🎖️${data.medals_1}\n`
				message += ` ★2  | Rank ${data.rank_2}\t| 🎖️${data.medals_2}\n`
				message += ` ★3  | Rank ${data.rank_3}\t| 🎖️${data.medals_3}\n`
				message += ` ★4  | Rank ${data.rank_4}\t| 🎖️${data.medals_4}\n`
				message += ` ★5  | Rank ${data.rank_5}\t| 🎖️${data.medals_5}\n`
				message += ` ★6  | Rank ${data.rank_6}\t| 🎖️${data.medals_6}\n`
				message += ` ★7  | Rank ${data.rank_7}\t| 🎖️${data.medals_7}\n`
				message += ` ★8  | Rank ${data.rank_8}\t| 🎖️${data.medals_8}\n`
				message += ` ★9  | Rank ${data.rank_9}\t| 🎖️${data.medals_9}\n`
				message += ` ★10 | Rank ${data.rank_10}\t| 🎖️${data.medals_10}\n`
				message += ` ★11 | Rank ${data.rank_11}\t| 🎖️${data.medals_11}\n`
				message += ` ★12 | Rank ${data.rank_12}\t| 🎖️${data.medals_12}\n`

				message += '```'
				embed.setDescription(message);
				interaction.editReply({embeds: [embed]});
			})
		}


	},
};