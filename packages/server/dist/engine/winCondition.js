"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWinCondition = checkWinCondition;
exports.checkLastPlayerStanding = checkLastPlayerStanding;
exports.getRanking = getRanking;
const propertyManagement_1 = require("./propertyManagement");
/**
 * Check if any player has won the game.
 * Win condition: net worth >= winConditionNetWorth
 */
function checkWinCondition(players, tiles, winConditionNetWorth) {
    const activePlayers = players.filter((p) => !p.isBankrupt);
    for (const player of activePlayers) {
        const netWorth = (0, propertyManagement_1.calculateNetWorth)(player, tiles);
        if (netWorth >= winConditionNetWorth) {
            return player;
        }
    }
    return null;
}
/**
 * Check if only one player remains (all others bankrupt).
 */
function checkLastPlayerStanding(players) {
    const activePlayers = players.filter((p) => !p.isBankrupt);
    if (activePlayers.length === 1) {
        return activePlayers[0];
    }
    return null;
}
/**
 * Get the player with the highest net worth (for end-game ranking).
 */
function getRanking(players, tiles) {
    const ranked = players
        .map((p) => ({
        player: p,
        netWorth: (0, propertyManagement_1.calculateNetWorth)(p, tiles),
    }))
        .sort((a, b) => b.netWorth - a.netWorth)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    return ranked;
}
//# sourceMappingURL=winCondition.js.map