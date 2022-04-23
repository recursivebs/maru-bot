const fetch = require('node-fetch');
const helpers = require('../helpers');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pp-calc-reverse')
		.setDescription('Calculate acc needed for pp.')
		.addNumberOption(option =>
			option.setName("stars")
				.setDescription("Stars of the song")
				.setRequired(true)
			)
		.addNumberOption(option =>
			option.setName("pp")
				.setDescription("Desired pp")
				.setRequired(true)
			),
	async execute(interaction) {

        const pp = interaction.options.getNumber("pp");
        const stars = interaction.options.getNumber("stars");

        let maxAcc = 100;
        let minAcc = 0;

        let testAcc = 50;

        let keepGoing = true
        let tries = 0;
        const maxTries = 100;

        while (keepGoing && tries < maxTries) {
            let testPP = helpers.computePP(stars, testAcc)
            if (testPP === pp) {
                keepGoing = false;
            } else {
                if (testPP > pp) {
                    maxAcc = testAcc;
                } else {
                    minAcc = testAcc;
                }
                testAcc = (maxAcc + minAcc) / 2;
            }
            tries++;
        }
        testAcc = testAcc.toFixed(2);

        return interaction.reply(`≈${testAcc}%`);

	},
};