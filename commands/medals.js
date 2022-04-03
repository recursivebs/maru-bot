const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const groupBy = require('group-by');
const helpers = require('../helpers');
const playerRankSongListReport = require('../report-builders/player-rank-song-list-report')

const getPageData = (d, page, page_length) => d.slice((page - 1) * page_length, ((page - 1) * page_length) + page_length);

const compute_medal_completion = (current_medals, total_medals) => {
	let ratio = ((current_medals / total_medals) * 100).toFixed(2);
	return ratio;
}

const generate_spaces = (in_str, max_spaces) => {
	let len = ("" + in_str).length;
	if ((max_spaces - len) < 0) {
		return "";
	}
	let strSpaces = "";
	for (let i = 0; i < (max_spaces - len); i++) {
		strSpaces += " ";
	}
	return strSpaces;
}

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
			let player_data = {}
			let star_report = []
			fetch(reportEndpoint)
			.then((response) => response.json())
			.then(data => {
				player_data = data;
				const starReport = "https://marubot.bluecurse.com/report/total-medals-by-star";
				return fetch(starReport);
			})
			.then((response) => response.json())
			.then(data => {

				star_report = data;

				let message = "```"

				let embed = new MessageEmbed()
					.setColor("#FFFF00")
					.setTitle(`Star Rankings for Player ${player_data.player_name}`)

				if (player_data.rank_0 > 0) {
					message += ` ★0  | ️CA #${player_data.rank_0}${generate_spaces(player_data.rank_0, 5)}| 🎖️${player_data.medals_0}${generate_spaces(player_data.medals_0, 6)}| ${compute_medal_completion(player_data.rank_0, star_report[0].total_medals)}% (of ${star_report[0].total_medals})\n`
				}
				if (player_data.rank_1 > 0) {
					message += ` ★1  | ️CA #${player_data.rank_1}${generate_spaces(player_data.rank_1, 5)}| 🎖️${player_data.medals_1}${generate_spaces(player_data.medals_1, 6)}| ${compute_medal_completion(player_data.rank_1, star_report[1].total_medals)}% (of ${star_report[1].total_medals})\n`
				}
				if (player_data.rank_2 > 0) {
					message += ` ★2  | ️CA #${player_data.rank_2}${generate_spaces(player_data.rank_2, 5)}| 🎖️${player_data.medals_2}${generate_spaces(player_data.medals_2, 6)}| ${compute_medal_completion(player_data.rank_2, star_report[2].total_medals)}% (of ${star_report[2].total_medals})\n`
				}
				if (player_data.rank_3 > 0) {
					message += ` ★3  | ️CA #${player_data.rank_3}${generate_spaces(player_data.rank_3, 5)}| 🎖️${player_data.medals_3}${generate_spaces(player_data.medals_3, 6)}| ${compute_medal_completion(player_data.rank_3, star_report[3].total_medals)}% (of ${star_report[3].total_medals})\n`
				}
				if (player_data.rank_4 > 0) {
					message += ` ★4  | ️CA #${player_data.rank_4}${generate_spaces(player_data.rank_4, 5)}| 🎖️${player_data.medals_4}${generate_spaces(player_data.medals_4, 6)}| ${compute_medal_completion(player_data.rank_4, star_report[4].total_medals)}% (of ${star_report[4].total_medals})\n`
				}
				if (player_data.rank_5 > 0) {
					message += ` ★5  | ️CA #${player_data.rank_5}${generate_spaces(player_data.rank_5, 5)}| 🎖️${player_data.medals_5}${generate_spaces(player_data.medals_5, 6)}| ${compute_medal_completion(player_data.rank_5, star_report[5].total_medals)}% (of ${star_report[5].total_medals})\n`
				}
				if (player_data.rank_6 > 0) {
					message += ` ★6  | ️CA #${player_data.rank_6}${generate_spaces(player_data.rank_6, 5)}| 🎖️${player_data.medals_6}${generate_spaces(player_data.medals_6, 6)}| ${compute_medal_completion(player_data.rank_6, star_report[6].total_medals)}% (of ${star_report[6].total_medals})\n`
				}
				if (player_data.rank_7 > 0) {
					message += ` ★7  | ️CA #${player_data.rank_7}${generate_spaces(player_data.rank_7, 5)}| 🎖️${player_data.medals_7}${generate_spaces(player_data.medals_7, 6)}| ${compute_medal_completion(player_data.rank_7, star_report[7].total_medals)}% (of ${star_report[7].total_medals})\n`
				}
				if (player_data.rank_8 > 0) {
					message += ` ★8  | ️CA #${player_data.rank_8}${generate_spaces(player_data.rank_8, 5)}| 🎖️${player_data.medals_8}${generate_spaces(player_data.medals_8, 6)}| ${compute_medal_completion(player_data.rank_8, star_report[8].total_medals)}% (of ${star_report[8].total_medals})\n`
				}
				if (player_data.rank_9 > 0) {
					message += ` ★9  | ️CA #${player_data.rank_9}${generate_spaces(player_data.rank_9, 5)}| 🎖️${player_data.medals_9}${generate_spaces(player_data.medals_9, 6)}| ${compute_medal_completion(player_data.rank_9, star_report[9].total_medals)}% (of ${star_report[9].total_medals})\n`
				}
				if (player_data.rank_10 > 0) {
					message += ` ★10 | ️CA #${player_data.rank_10}${generate_spaces(player_data.rank_10, 5)}| 🎖️${player_data.medals_10}${generate_spaces(player_data.medals_10, 6)}| ${compute_medal_completion(player_data.rank_10, star_report[10].total_medals)}% (of ${star_report[10].total_medals})\n`
				}
				if (player_data.rank_11 > 0) {
					message += ` ★11 | ️CA #${player_data.rank_11}${generate_spaces(player_data.rank_11, 5)}| 🎖️${player_data.medals_11}${generate_spaces(player_data.medals_11, 6)}| ${compute_medal_completion(player_data.rank_11, star_report[11].total_medals)}% (of ${star_report[11].total_medals})\n`
				}
				if (player_data.rank_12 > 0) {
					message += ` ★12 | ️CA #${player_data.rank_12}${generate_spaces(player_data.rank_12, 5)}| 🎖️${player_data.medals_12}${generate_spaces(player_data.medals_12, 6)}| ${compute_medal_completion(player_data.rank_12, star_report[12].total_medals)}% (of ${star_report[12].total_medals})\n`
				}

				message += '```'
				embed.setDescription(message);
				interaction.editReply({embeds: [embed]});
			})
		}


	},
};