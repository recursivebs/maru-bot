const fetch = require('node-fetch');
const fs = require('fs');
const helpers = require('../helpers');
const { MessageAttachment, MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const playerRankSongListReport = require('../report-builders/player-rank-song-list-report');
const { setFlagsFromString } = require('v8');


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


module.exports = {
	data: new SlashCommandBuilder()
		.setName('replay-analyzer')
		.setDescription('Analyze a replay!')
		.addSubcommand(subcommand =>
			subcommand
				.setName("acc-chart")
				.setDescription("Display the acc chart for a leaderboard.")
				.addStringOption(option =>
					option.setName("player_id")
						.setDescription("Scoresaber ID of player.")
						.setRequired(true)
					)
				.addNumberOption(option =>
					option.setName("leaderboard_id")
						.setDescription("Scoresaber ID of leaderboard, if the song is ranked and your replay is available.")
					)
				.addStringOption(option =>
					option.setName("file_url")
						.setDescription("Replay file URL ID of leaderboard. Upload to discord/some other file service first!")
					)
                ,
			)
		.addSubcommand(subcommand =>
			subcommand
				.setName("acc-chart-detailed")
				.setDescription("Display the acc chart split up per hand for a leaderboard.")
				.addStringOption(option =>
					option.setName("player_id")
						.setDescription("Scoresaber ID of player.")
						.setRequired(true)
					)
				.addNumberOption(option =>
					option.setName("leaderboard_id")
						.setDescription("Scoresaber ID of leaderboard.")
						.setRequired(true)
					)
				.addStringOption(option =>
					option.setName("file_url")
						.setDescription("Replay file URL ID of leaderboard. Upload to discord/some other file service first!")
					)
                ,
			)
            .addSubcommand(subcommand =>
                subcommand
                    .setName("hitscore")
                    .setDescription("Display the hitscore table for a leaderboard.")
                    .addStringOption(option =>
                        option.setName("player_id")
                            .setDescription("Scoresaber ID of player.")
                            .setRequired(true)
                        )
                    .addNumberOption(option =>
                        option.setName("leaderboard_id")
                            .setDescription("Scoresaber ID of leaderboard.")
                        )
                    .addStringOption(option =>
                        option.setName("file_url")
                            .setDescription("Replay file URL ID of leaderboard. Upload to discord/some other file service first!")
                        ),
                )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("hitscore-top10")
                    .setDescription("Display the top10 hitscore graph for a leaderboard.")
                    .addNumberOption(option =>
                        option.setName("leaderboard_id")
                            .setDescription("Leaderboard ID of map that we want to build the graph for.")
                            .setRequired(true)
                        ),
                ),
	async execute(interaction) {

		await interaction.deferReply();
		const subcommand = interaction.options.getSubcommand()

        try {

            if (subcommand === "acc-chart") {

                let player_id = helpers.extractPlayerId(interaction.options.getString("player_id"));
                let file_url = interaction.options.getString("file_url");

                let leaderboard_id = interaction.options.getNumber("leaderboard_id");
                if (isNaN(leaderboard_id)) {
                    leaderboard_id = -1;
                }

                let perfect_acc = interaction.options.getNumber("perfect_acc");
                if (isNaN(perfect_acc)) {
                    perfect_acc = 98.5;
                }

                let good_acc = interaction.options.getNumber("good_acc");
                if (isNaN(good_acc)) {
                    good_acc = 97.5;
                }

                let normal_acc = interaction.options.getNumber("normal_acc");
                if (isNaN(normal_acc)) {
                    normal_acc = 96.8;
                }

                let ok_acc = interaction.options.getNumber("ok_acc");
                if (isNaN(ok_acc)) {
                    ok_acc = 96.0;
                }

                const registrationEndpoint = `https://marubot.bluecurse.com/replay-analyzer?player_id=${player_id}&leaderboard_id=${leaderboard_id}&file_url=${file_url}&perfect_acc=${perfect_acc}&good_acc=${good_acc}&normal_acc=${normal_acc}&ok_acc=${ok_acc}`;
                const mapInfoEndpoint = `https://marubot.bluecurse.com/report/map-info/${leaderboard_id}`
                const playerDataEndpoint = `https://scoresaber.com/api/player/${player_id}/full`

                let mapInfoResponse = await fetch(mapInfoEndpoint)
                let mapInfoData = await mapInfoResponse.json()

                let playerDataResponse = await fetch(playerDataEndpoint)
                let playerData = await playerDataResponse.json()

                let fimg = await fetch(registrationEndpoint)

                if (fimg.status === 400 || fimg.status === "400") {

                    if (leaderboard_id === -1) {
                        const embed = new MessageEmbed()
                            .setURL(`File Replay`)
                            .setTitle(`TODO - Look up map from replay data and add info here`)
                            .setDescription(`Played by ${playerData.name}`)
                            .addField('No replay available', 'Sorry!')
                        await interaction.editReply({embeds: [embed]});
                        return
                    } else {
                        const embed = new MessageEmbed()
                            .setURL(`https://www.scoresaber.com/leaderboard/${leaderboard_id}`)
                            .setTitle(`${mapInfoData.artist_name} - ${mapInfoData.song_name} [${mapInfoData.difficulty}, ⭐${mapInfoData.stars}] mapped by ${mapInfoData.level_author_name}`)
                            .setDescription(`Played by ${playerData.name}`)
                            .addField('No replay available', 'Sorry!')
                            .setThumbnail(mapInfoData.cover_image);
                        await interaction.editReply({embeds: [embed]});
                        return
                    }

                }

                let fBuffer = await fimg.arrayBuffer()
                let fimgb = Buffer.from(fBuffer)
                const filename = `${player_id}_${leaderboard_id}_acc-graph.png`
                let attachment = new MessageAttachment(fimgb, filename)

                if (leaderboard_id === -1) {
                    const embed = new MessageEmbed()
                        .setURL(`File Replay`)
                        .setTitle(`TODO - Look up map from replay data and add info here`)
                        .setDescription(`Played by ${playerData.name}`)
                        .setImage(`attachment://${filename}`);
                    await interaction.editReply({embeds: [embed], files: [attachment]});
                    return
                } else {
                    const embed = new MessageEmbed()
                        .setURL(`https://www.scoresaber.com/leaderboard/${leaderboard_id}`)
                        .setTitle(`${mapInfoData.artist_name} - ${mapInfoData.song_name} [${mapInfoData.difficulty}, ⭐${mapInfoData.stars}] mapped by ${mapInfoData.level_author_name}`)
                        .setDescription(`Played by ${playerData.name}`)
                        .setThumbnail(mapInfoData.cover_image)
                        .setImage(`attachment://${filename}`);
                    await interaction.editReply({embeds: [embed], files: [attachment]});
                }

                await interaction.editReply({embeds: [embed], files: [attachment]});

            } else if (subcommand === "acc-chart-detailed") {

                let player_id = helpers.extractPlayerId(interaction.options.getString("player_id"));

                let file_url = interaction.options.getString("file_url");

                let leaderboard_id = interaction.options.getNumber("leaderboard_id");
                if (isNaN(leaderboard_id)) {
                    leaderboard_id = -1;
                }

                let perfect_acc = interaction.options.getNumber("perfect_acc");
                if (isNaN(perfect_acc)) {
                    perfect_acc = 98.5;
                }

                let good_acc = interaction.options.getNumber("good_acc");
                if (isNaN(good_acc)) {
                    good_acc = 97.5;
                }

                let normal_acc = interaction.options.getNumber("normal_acc");
                if (isNaN(normal_acc)) {
                    normal_acc = 96.8;
                }

                let ok_acc = interaction.options.getNumber("ok_acc");
                if (isNaN(ok_acc)) {
                    ok_acc = 96.0;
                }

                const registrationEndpoint = `https://marubot.bluecurse.com/replay-analyzer?player_id=${player_id}&leaderboard_id=${leaderboard_id}&file_url=${file_url}&perfect_acc=${perfect_acc}&good_acc=${good_acc}&normal_acc=${normal_acc}&ok_acc=${ok_acc}`;
                const mapInfoEndpoint = `https://marubot.bluecurse.com/report/map-info/${leaderboard_id}`
                const playerDataEndpoint = `https://scoresaber.com/api/player/${player_id}/full`

                let mapInfoResponse = await fetch(mapInfoEndpoint)
                let mapInfoData = await mapInfoResponse.json()

                let playerDataResponse = await fetch(playerDataEndpoint)
                let playerData = await playerDataResponse.json()

                let fimg = await fetch(registrationEndpoint)
                console.log(fimg.status)
                if (fimg.status === 400 || fimg.status === "400") {

                    if (leaderboard_id === -1) {
                        const embed = new MessageEmbed()
                            .setURL(`File Replay`)
                            .setTitle(`TODO - Look up map from replay data and add info here`)
                            .setDescription(`Played by ${playerData.name}`)
                            .addField('No replay available', 'Sorry!')
                        await interaction.editReply({embeds: [embed]});
                        return
                    } else {
                        const embed = new MessageEmbed()
                            .setURL(`https://www.scoresaber.com/leaderboard/${leaderboard_id}`)
                            .setTitle(`${mapInfoData.artist_name} - ${mapInfoData.song_name} [${mapInfoData.difficulty}, ⭐${mapInfoData.stars}] mapped by ${mapInfoData.level_author_name}`)
                            .setDescription(`Played by ${playerData.name}`)
                            .addField('No replay available', 'Sorry!')
                            .setThumbnail(mapInfoData.cover_image);
                        await interaction.editReply({embeds: [embed]});
                        return
                    }
                }

                let fBuffer = await fimg.arrayBuffer()
                let fimgb = Buffer.from(fBuffer)
                const filename = `${player_id}_${leaderboard_id}_acc-graph.png`
                let attachment = new MessageAttachment(fimgb, filename)

                if (leaderboard_id === -1) {
                    const embed = new MessageEmbed()
                        .setURL(`File Replay`)
                        .setTitle(`TODO - Look up map from replay data and add info here`)
                        .setDescription(`Played by ${playerData.name}`)
                        .setImage(`attachment://${filename}`);
                    await interaction.editReply({embeds: [embed], files: [attachment]});
                    return
                } else {
                    const embed = new MessageEmbed()
                        .setURL(`https://www.scoresaber.com/leaderboard/${leaderboard_id}`)
                        .setTitle(`${mapInfoData.artist_name} - ${mapInfoData.song_name} [${mapInfoData.difficulty}, ⭐${mapInfoData.stars}] mapped by ${mapInfoData.level_author_name}`)
                        .setDescription(`Played by ${playerData.name}`)
                        .setThumbnail(mapInfoData.cover_image)
                        .setImage(`attachment://${filename}`);
                    await interaction.editReply({embeds: [embed], files: [attachment]});
                }


            } else if (subcommand === "hitscore") {

                let player_id = helpers.extractPlayerId(interaction.options.getString("player_id"));

                let file_url = interaction.options.getString("file_url");

                let leaderboard_id = interaction.options.getNumber("leaderboard_id");
                if (isNaN(leaderboard_id)) {
                    leaderboard_id = -1;
                }

                let replayEndpoint = ""
                if (leaderboard_id === -1) {
                    replayEndpoint = `https://sspreviewdecode.azurewebsites.net/?link=${file_url}`;
                } else {
                    replayEndpoint = `https://marubot.bluecurse.com/replay/${player_id}/${leaderboard_id}`;
                }

                const mapInfoEndpoint = `https://marubot.bluecurse.com/report/map-info/${leaderboard_id}`
                const playerDataEndpoint = `https://scoresaber.com/api/player/${player_id}/full`


                let mapInfoData = {};
                if (leaderboard_id === -1) {
                    let mapInfoResponse = await fetch(mapInfoEndpoint)
                    mapInfoData = await mapInfoResponse.json()
                }

                let playerDataResponse = await fetch(playerDataEndpoint)
                let playerData = await playerDataResponse.json()

                let replayDataResponse = await fetch(replayEndpoint)
                let replayData = await replayDataResponse.json()
                if (replayData.error && replayData.error === "No replay available") {
                    if (leaderboard_id === 1) {
                        const embed = new MessageEmbed()
                            .setURL(`File Replay`)
                            .setTitle(`TODO - Look up map from replay data and add info here`)
                            .setDescription(`Played by ${playerData.name}`)
                            .addField('No replay available', 'Sorry!')
                        await interaction.editReply({embeds: [embed]});
                        return
                    } else {
                        const embed = new MessageEmbed()
                            .setURL(`https://www.scoresaber.com/leaderboard/${leaderboard_id}`)
                            .setTitle(`${mapInfoData.artist_name} - ${mapInfoData.song_name} [${mapInfoData.difficulty}, ⭐${mapInfoData.stars}] mapped by ${mapInfoData.level_author_name}`)
                            .setDescription(`Played by ${playerData.name}`)
                            .addField('No replay available', 'Sorry!')
                            .setThumbnail(mapInfoData.cover_image);
                        await interaction.editReply({embeds: [embed]});
                        return
                    }
                }

                const countBy = (arr, fn) =>
                    arr.map(typeof fn === 'function' ? fn : val => val[fn]).reduce((acc, val, i) => {
                        acc[val] = (acc[val] || 0) + 1;
                        return acc;
                    }, {});

                const countedData = countBy(replayData.scores.filter(y => y > 0), Math.floor)
                const keys = Object.keys(countedData).reverse()
                const values = Object.values(countedData).reverse()

                let hitscoreMessage = "```"

                const totalNotes = values.reduce((x, y) => x + y, 0)
                const getPercentage = (val) => ((+val / totalNotes) * 100).toFixed(2)

                for (let i = 0; i < keys.length; i++) {
                    hitscoreMessage += `${generate_spaces(keys[i], 3)}${keys[i]}: ${values[i]}${generate_spaces(values[i], 5)} | ${generate_spaces(getPercentage(values[i]), 5)}${getPercentage(values[i])}%\n`
                }

                hitscoreMessage += "```"

                if (leaderboard_id === -1) {
                    const embed = new MessageEmbed()
                        .setURL(`File Replay`)
                        .setTitle(`TODO - Look up map from replay data and add info here`)
                        .setDescription(`Played by ${playerData.name}`)
                        .addField('Hitscores', hitscoreMessage)
                    await interaction.editReply({embeds: [embed]});
                } else {
                    const embed = new MessageEmbed()
                        .setURL(`https://www.scoresaber.com/leaderboard/${leaderboard_id}`)
                        .setTitle(`${mapInfoData.artist_name} - ${mapInfoData.song_name} [${mapInfoData.difficulty}, ⭐${mapInfoData.stars}] mapped by ${mapInfoData.level_author_name}`)
                        .setDescription(`Played by ${playerData.name}`)
                        .addField('Hitscores', hitscoreMessage)
                        .setThumbnail(mapInfoData.cover_image);
                    await interaction.editReply({embeds: [embed]});
                }

            } else if (subcommand === "hitscore-top10") {

                let leaderboard_id = interaction.options.getNumber("leaderboard_id");
                if (isNaN(leaderboard_id)) {
                    leaderboard_id = 280301; // ov
                }

                const registrationEndpoint = `https://marubot.bluecurse.com/report/hitscore-comparison/${leaderboard_id}`;
                const mapInfoEndpoint = `https://marubot.bluecurse.com/report/map-info/${leaderboard_id}`

                let mapInfoResponse = await fetch(mapInfoEndpoint)
                let mapInfoData = await mapInfoResponse.json()

                let fimg = await fetch(registrationEndpoint)
                console.log("1")
                if (fimg.status === 400 || fimg.status === "400") {
                    console.log("2")
                    const embed = new MessageEmbed()
                        .setURL(`https://www.scoresaber.com/leaderboard/${leaderboard_id}`)
                        .setTitle(`${mapInfoData.artist_name} - ${mapInfoData.song_name} [${mapInfoData.difficulty}, ⭐${mapInfoData.stars}] mapped by ${mapInfoData.level_author_name}`)
                        .addField('No replay available', 'Sorry!')
                        .setThumbnail(mapInfoData.cover_image);
                    await interaction.editReply({embeds: [embed]});
                    return
                }
                console.log("3")

                let fBuffer = await fimg.arrayBuffer()
                let fimgb = Buffer.from(fBuffer)
                const filename = `${leaderboard_id}_hitscore-top10.png`
                let attachment = new MessageAttachment(fimgb, filename)

                const embed = new MessageEmbed()
                    .setURL(`https://www.scoresaber.com/leaderboard/${leaderboard_id}`)
                    .setTitle(`${mapInfoData.artist_name} - ${mapInfoData.song_name} [${mapInfoData.difficulty}, ⭐${mapInfoData.stars}] mapped by ${mapInfoData.level_author_name}`)
                    .setDescription(`Top 10 Hitscore Comparison`)
                    .setThumbnail(mapInfoData.cover_image)
                    .setImage(`attachment://${filename}`);

                await interaction.editReply({embeds: [embed], files: [attachment]});

            }

        } catch (e) {
            console.log(e);
            interaction.editReply(`An error occurred ;; the bot is probably updating data right now and I haven't had time to fix, please try again in a minute or two :)`);
        }

	},
};