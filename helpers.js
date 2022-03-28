const trimEmbed = (str, max) => ((str.length > max) ? `${str.slice(0, max - 3)}...` : str);

const extractPlayerId = (str) => {
    if (!str) {
        return "0"
    }
    try {
        let id = str.replaceAll("https://", "")
                    .replaceAll("http://", "")
                    .replaceAll("www.", "")
                    .replaceAll("scoresaber.com/u/", "")
                    .split("?")[0];
        if (id && id.length > 0) {
            return id.replace(/\D+/g, '');
        }
        return "0";
    } catch {
        return "0";
    }
}


const computeMedalsForSpecificRank = (rank, numScores) => {
    return computeFactorForMedals(rank) * numScores;
}

const computeFactorForMedals = (rank) => {
    let factor = 1;
    if (+rank === 1) {
        factor = 10;
    }
    if (+rank === 2) {
        factor = 8;
    }
    if (+rank === 3) {
        factor = 6;
    }
    if (+rank === 4) {
        factor = 5;
    }
    if (+rank === 5) {
        factor = 4;
    }
    if (+rank === 6) {
        factor = 3;
    }
    if (+rank === 7) {
        factor = 2;
    }
    return factor;
}


exports.trimEmbed = trimEmbed;
exports.extractPlayerId = extractPlayerId;
exports.computeMedalsForSpecificRank = computeMedalsForSpecificRank;
exports.computeFactorForMedals = computeFactorForMedals;
