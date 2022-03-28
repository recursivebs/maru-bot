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


exports.trimEmbed = trimEmbed;
exports.extractPlayerId = extractPlayerId;
