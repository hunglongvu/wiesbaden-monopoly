"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRent = calculateRent;
exports.ownerHasFullColorGroup = ownerHasFullColorGroup;
const board_config_1 = require("../config/board.config");
/**
 * Calculate rent owed for landing on a property tile.
 * Returns 0 if tile is unowned, mortgaged, or owned by the landing player.
 */
function calculateRent(tile, landingPlayer, allTiles, diceTotal) {
    if (tile.type === 'property') {
        return calculatePropertyRent(tile, landingPlayer, allTiles);
    }
    if (tile.type === 'railroad') {
        return calculateRailroadRent(tile, landingPlayer, allTiles);
    }
    if (tile.type === 'utility') {
        return calculateUtilityRent(tile, landingPlayer, allTiles, diceTotal);
    }
    return null;
}
function calculatePropertyRent(tile, landingPlayer, allTiles) {
    if (!tile.ownerId || tile.ownerId === landingPlayer.id || tile.mortgaged) {
        return null;
    }
    let rentAmount;
    if (tile.houses > 0) {
        // 1-4 houses or hotel (houses = 5 means hotel)
        const houseIndex = tile.houses; // 1-5 maps to rent[1]-rent[5]
        rentAmount = tile.rent[houseIndex];
    }
    else {
        // Base rent - doubles if owner has full color group
        const colorGroupPositions = board_config_1.COLOR_GROUPS[tile.color] ?? [];
        const ownerHasFullGroup = colorGroupPositions.every((pos) => {
            const groupTile = allTiles[pos];
            return (groupTile &&
                (groupTile.type === 'property') &&
                groupTile.ownerId === tile.ownerId &&
                !groupTile.mortgaged);
        });
        rentAmount = ownerHasFullGroup ? tile.rent[0] * 2 : tile.rent[0];
    }
    return { ownerId: tile.ownerId, rentAmount };
}
function calculateRailroadRent(tile, landingPlayer, allTiles) {
    if (!tile.ownerId || tile.ownerId === landingPlayer.id || tile.mortgaged) {
        return null;
    }
    // Count how many railroads the owner has
    const ownedCount = board_config_1.RAILROAD_POSITIONS.filter((pos) => {
        const rr = allTiles[pos];
        return rr && rr.type === 'railroad' && rr.ownerId === tile.ownerId && !rr.mortgaged;
    }).length;
    // 2 railroads on this board → 50€ / 100€ (matches standard Monopoly's 2nd and 4th tier)
    const rentTable = { 1: 50, 2: 100 };
    const rentAmount = rentTable[ownedCount] ?? 25;
    return { ownerId: tile.ownerId, rentAmount };
}
function calculateUtilityRent(tile, landingPlayer, allTiles, diceTotal) {
    if (!tile.ownerId || tile.ownerId === landingPlayer.id || tile.mortgaged) {
        return null;
    }
    // Count how many utilities the owner has
    const ownedCount = board_config_1.UTILITY_POSITIONS.filter((pos) => {
        const ut = allTiles[pos];
        return ut && ut.type === 'utility' && ut.ownerId === tile.ownerId && !ut.mortgaged;
    }).length;
    const multiplier = ownedCount >= 2 ? 10 : 4;
    const rentAmount = multiplier * diceTotal;
    return { ownerId: tile.ownerId, rentAmount };
}
/**
 * Check if an owner has the full color group (all tiles owned and none mortgaged).
 */
function ownerHasFullColorGroup(color, ownerId, allTiles) {
    const positions = board_config_1.COLOR_GROUPS[color] ?? [];
    return positions.every((pos) => {
        const t = allTiles[pos];
        return (t &&
            t.type === 'property' &&
            t.ownerId === ownerId &&
            !t.mortgaged);
    });
}
//# sourceMappingURL=rentCalculation.js.map