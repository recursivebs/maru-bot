const fetch = require('node-fetch');
const helpers = require('../helpers');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pp-calc')
		.setDescription('Calculate pp.')
		.addNumberOption(option =>
			option.setName("stars")
				.setDescription("Stars of the song")
				.setRequired(true)
			)
		.addNumberOption(option =>
			option.setName("acc")
				.setDescription("Target acc %")
				.setRequired(true)
			),
	async execute(interaction) {
        const acc = interaction.options.getNumber("acc");
        const stars = interaction.options.getNumber("stars");
        const pp = helpers.computePP(stars, acc);
        return interaction.reply(`${pp} pp`);
	},
};