const moment = require('moment');
const helpers = require('../helpers')

var groupBy = require('group-by');

const cleanseQuotes = (str) => str.replaceAll('"', "‟").replaceAll("'", "’")

const getTimeSetStr = (song) => {
    let x = moment(song.time_set).fromNow(true);
    x = x.replaceAll("a few seconds ago", "just now");
    x = x.replaceAll(" months", "mo");
    x = x.replaceAll("a month", "1mo");
    x = x.replaceAll("a day", "1d");
    x = x.replaceAll("a year", "1y");
    x = x.replaceAll("an hour", "1h");
    x = x.replaceAll("a minute", "1m");
    x = x.replaceAll(" seconds", "s");
    x = x.replaceAll(" hours", "h");
    x = x.replaceAll(" minutes", "min");
    x = x.replaceAll(" years", "y");
    x = x.replaceAll(" days", "d");
    return x;
}

const shortenDifficulty = (data) => {
    if (data.difficulty === "Expert+") {
        return "E+";
    }
    if (data.difficulty === "Expert") {
        return "Ex";
    }
    if (data.difficulty === "Hard") {
        return "Ha";
    }
    if (data.difficulty === "Normal") {
        return "No";
    }
    return "Es";
}

const shortenString = (str, maxLen) => {
    if (str.length > maxLen) {
        return `${str.substring(0, maxLen)}...`;
    }
    return str;
}

const buildReport = (data, summaryData, embed) => {
    const groupedData = groupBy(data, 'rank')
    let reportText = ""
    for (const [key, value] of Object.entries(groupedData)) {
        let fieldValue = ""
        value.forEach(song => {
            let percent = 0.00;
            if (song.max_score > 0) {
                percent = (song.base_score / song.max_score) * 100;
            }
            percent = `${percent.toFixed(2)}%`
            const maxArtistCharacters = 18;
            const maxSongCharacters = 32;
            const artistName = shortenString(cleanseQuotes(song.artist_name), maxArtistCharacters);
            const mapperName = shortenString(cleanseQuotes(song.level_author_name), maxArtistCharacters);
            const songName = shortenString(cleanseQuotes(song.song_name), maxSongCharacters);
            const diffName = shortenDifficulty(song);
            const cleansedStars = (+song.stars).toFixed(2);
            const timeSetStr = getTimeSetStr(song);
            songLineText = `★${cleansedStars} | ${diffName} | ${timeSetStr} | ${percent} | ${songName} [${mapperName}]`
            fieldValue += `${songLineText}\n`
        })
        fieldValue = "```python\n" + fieldValue + "```"
        embed.addField(`CA Rank #${key}s - ${summaryData[`${key}`]} x ${helpers.computeFactorForMedals(key)} = 🎖️${helpers.computeMedalsForSpecificRank(`${key}`, summaryData[`${key}`])}`, fieldValue, false)
    }
}

exports.build = buildReport;