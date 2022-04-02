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
		}


	},
};