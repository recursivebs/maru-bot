const { SlashCommandBuilder } = require('@discordjs/builders');
const helpers = require('../helpers');
const fetch = require('node-fetch');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('enralis')
		.setDescription('simmulates what enralis would say')
		.addStringOption(option =>
			option.setName("player")
				.setDescription("player")
				.setRequired(true)
			),
	async execute(interaction) {
        const player_id = helpers.extractPlayerId(interaction.options.getString("player"));
        const playerInfoEndpoint = `https://marubot.bluecurse.com/report/player-medals/player-id/${player_id}`
        const playerRankSongListEndpoint = `https://marubot.bluecurse.com/report/player-rank-song-list/player-id/${player_id}`

        let playerinfo = {};

        let reply = "";

        await fetch(playerInfoEndpoint)
			.then((response) => response.json())
			.then(data => {

				playerinfo = data;

				if (data.length <= 0) {
					reply = `**peepo DETECT** <:bibblesInspect:959216919569899562> failure!! you may have good A_C_C but you have terrible *bot using skills* smh my head try again`;
                    return;
				}

                const medal_rank  = playerinfo.medal_rank;
                const medals = playerinfo.medals;
                const num_10s = playerinfo.num_10s;
                const num_1s = playerinfo.num_1s;
                const num_2s = playerinfo.num_2s;
                const num_3s = playerinfo.num_3s;
                const num_4s = playerinfo.num_4s;
                const num_5s = playerinfo.num_5s;
                const num_6s = playerinfo.num_6s;
                const num_7s = playerinfo.num_7s;
                const num_8s = playerinfo.num_8s;
                const num_9s = playerinfo.num_9s;
                const player_id = playerinfo.player_id;
                let player_name = playerinfo.player_name;
                const rounded_rank = Math.ceil(medal_rank / 10) * 10;

                if (Math.random() < 0.7){
                    player_name = player_name.replace("hyren", "Hyren Underscore VR");
                    player_name = player_name.replace("recursive", "Recursive Underscore VR");
                }
                

                const responses = [
                    `Wow, is that THE rank number ${medal_rank} player ${player_name} Acc player with ${medals} medals??!`,
                    `WOW IS THAT ${player_name} THE BEATSABERER`.toUpperCase(),
                    `PEEPO **DETECT** # top ${rounded_rank} player!!! Can we give it up for ${player_name}, the pro **Beat Saber** *(by Beat Games)* player?!`,
                    `Have you heard of the game **Beat Saber**, for Virtual Reality? Released on <t:1525219920:F> by Beat Games made in *Unity*? Well, ${player_name} certainly does! Not only do they **know this super popular rhythm game**, they also have ${medals} medals 😳`,
                    `You think you have what it takes to beat ${player_name}? They have ${medals} medals...can you do that?! :speak_no_evil:`,
                    `If you think you have scores :100: to flex :muscle: you haven't seen ${player_name} yet. Top ${rounded_rank} medal grinder and **A C C** champ is here to **BEST** your *flex* :chart_with_upwards_trend: :white_check_mark:`,
                    `If ${player_name} had green as their top HSV colour, they'd be a **GREEN GAMER**!! Top of the M stands for **Top of the Map** with ${medals} medals :shushing_face: `
                ];

                reply = responses[Math.floor(Math.random()*responses.length)];

                reply = helpers.sass(reply);

                if (Math.random() < 0.3){
                    reply = reply.replace('b', '🅱️');
                    reply = reply.replace('B', '🅱️');
                }

				return fetch(playerRankSongListEndpoint);

			})
			.then((response) => response.json())
			.then(data => {

                

                return;


            });

            await interaction.reply(reply);
		/*console.log(interaction.options.getUser('user'));
		if (interaction.options.getUser('user') != null) {
			await interaction.reply('<@' + interaction.options.getUser('user').id + '>');
		} else {
			await interaction.reply('<@' + interaction.user + '>');
        }*/
	}
};