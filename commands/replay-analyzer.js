const fetch = require('node-fetch');
const fs = require('fs');
const helpers = require('../helpers');
const { MessageAttachment, MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

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
				.addStringOption(option =>
					option.setName("leaderboard_id")
						.setDescription("Scoresaber ID of leaderboard.")
						.setRequired(true)
					)
                .addNumberOption(option =>
                    option.setName("perfect_acc")
                          .setDescription("Perfect acc threshold")
                          .setRequired(false)
                    )
                .addNumberOption(option =>
                    option.setName("good_acc")
                          .setDescription("Good acc threshold")
                          .setRequired(false)
                    )
                .addNumberOption(option =>
                    option.setName("normal_acc")
                          .setDescription("Normal acc threshold")
                          .setRequired(false)
                    )
                .addNumberOption(option =>
                    option.setName("ok_acc")
                          .setDescription("Ok acc threshold")
                          .setRequired(false)
                    ),
			),
	async execute(interaction) {

		await interaction.deferReply();

        let player_id = helpers.extractPlayerId(interaction.options.getString("player_id"));
        let leaderboard_id = interaction.options.getString("leaderboard_id");

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


        const registrationEndpoint = `https://marubot.bluecurse.com/replay-analyzer?player_id=${player_id}&leaderboard_id=${leaderboard_id}&perfect_acc=${perfect_acc}&good_acc=${good_acc}&normal_acc=${normal_acc}&ok_acc=${ok_acc}`;
        let fimg = await fetch(registrationEndpoint)
        let fimgb = Buffer.from(await fimg.arrayBuffer())
        const filename = `${player_id}_${leaderboard_id}_acc-graph.png`
        let attachment = new MessageAttachment(fimgb, filename)

        const embed = new MessageEmbed()
            .setTitle('Acc Graph')
            .setImage(`attachment://${filename}`);

        interaction.editReply({embeds: [embed], files: [attachment]});

	},
};