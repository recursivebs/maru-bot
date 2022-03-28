const trimEmbed = (str, max) => ((str.length > max) ? `${str.slice(0, max - 3)}...` : str);
exports.trimEmbed = trimEmbed;