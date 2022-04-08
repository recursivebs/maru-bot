const fetch = require('node-fetch');
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

        const curveV3 = [
            [1, 7],
            [0.999, 5.8],
            [0.9975, 4.7],
            [0.995, 3.76],
            [0.9925, 3.17],
            [0.99, 2.73],
            [0.9875, 2.38],
            [0.985, 2.1],
            [0.9825, 1.88],
            [0.98, 1.71],
            [0.9775, 1.57],
            [0.975, 1.45],
            [0.9725, 1.37],
            [0.97, 1.31],
            [0.965, 1.20],
            [0.96, 1.11],
            [0.955, 1.045],
            [0.95, 1],
            [0.94, 0.94],
            [0.93, 0.885],
            [0.92, 0.835],
            [0.91, 0.79],
            [0.9, 0.75],
            [0.875, 0.655],
            [0.85, 0.57],
            [0.825, 0.51],
            [0.8, 0.47],
            [0.75, 0.4],
            [0.7, 0.34],
            [0.65, 0.29],
            [0.6, 0.25],
            [0, 0],
        ];

        const ppPerStar = 42.117208413;
      
        let fixedAcc;

        if (isNaN(acc)) {
            fixedAcc = 0;
        } else {
            fixedAcc = acc / 100;
        }


        const currentCurve = curveV3;
        const lerp = (x, y, a) => x * (1 - a) + y * a;

        let foundIndex = -1;

        for (let i = 0; i < currentCurve.length; i++) {
            let accToFind = +currentCurve[i][0];
            if (fixedAcc > accToFind) {
                foundIndex = i;
                break;
            }
        }

        let multiplier = 0;

        if (foundIndex === 0) {
            multiplier = +currentCurve[0][1];
        } else if (foundIndex < 0) {
            return interaction.reply(`${0} pp`);
        } else {
            let highAcc = +currentCurve[foundIndex - 1][0];
            let highMult = +currentCurve[foundIndex - 1][1];
            let lowAcc = +currentCurve[foundIndex][0];
            let lowMult = +currentCurve[foundIndex][1];
            let dist = (fixedAcc - lowAcc) / (highAcc - lowAcc);
            multiplier = lerp(lowMult, highMult, dist);
        }


        let pp = stars * ppPerStar * multiplier;
        pp = pp.toFixed(2)

        return interaction.reply(`${pp} pp`);
	},
};