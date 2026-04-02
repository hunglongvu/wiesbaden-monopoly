"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNetWorth = calculateNetWorth;
exports.mortgageProperty = mortgageProperty;
exports.unmortgageProperty = unmortgageProperty;
exports.buildHouse = buildHouse;
exports.sellHouse = sellHouse;
exports.getPlayerProperties = getPlayerProperties;
exports.transferAllAssets = transferAllAssets;
exports.releaseAssetsToBank = releaseAssetsToBank;
/**
 * Calculate net worth of a player.
 * Net worth = cash + sum(property prices) + sum(house/hotel values) - sum(mortgage values)
 */
function calculateNetWorth(player, allTiles) {
    let worth = player.money;
    for (const tile of allTiles) {
        if (tile.type === 'property') {
            const prop = tile;
            if (prop.ownerId === player.id) {
                if (prop.mortgaged) {
                    // Mortgaged property: worth is the mortgage value (half price)
                    worth += Math.floor(prop.price / 2);
                }
                else {
                    worth += prop.price;
                    // Add house/hotel values (half of house price each)
                    if (prop.houses > 0 && prop.houses < 5) {
                        worth += prop.houses * Math.floor(prop.housePrice / 2);
                    }
                    else if (prop.houses === 5) {
                        // hotel
                        worth += Math.floor(prop.housePrice / 2);
                    }
                }
            }
        }
        else if (tile.type === 'railroad') {
            const rr = tile;
            if (rr.ownerId === player.id) {
                if (rr.mortgaged) {
                    worth += Math.floor(rr.price / 2);
                }
                else {
                    worth += rr.price;
                }
            }
        }
        else if (tile.type === 'utility') {
            const ut = tile;
            if (ut.ownerId === player.id) {
                if (ut.mortgaged) {
                    worth += Math.floor(ut.price / 2);
                }
                else {
                    worth += ut.price;
                }
            }
        }
    }
    return worth;
}
/**
 * Mortgage a property. Returns half the purchase price.
 */
function mortgageProperty(player, tilePosition, tiles) {
    const tile = tiles[tilePosition];
    if (!tile) {
        return { success: false, message: 'Tile not found' };
    }
    if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') {
        return { success: false, message: 'Cannot mortgage this type of tile' };
    }
    const purchasable = tile;
    if (purchasable.ownerId !== player.id) {
        return { success: false, message: 'You do not own this property' };
    }
    if (purchasable.mortgaged) {
        return { success: false, message: 'Property is already mortgaged' };
    }
    // Cannot mortgage a property with houses/hotels
    if (tile.type === 'property') {
        const prop = tile;
        if (prop.houses > 0) {
            return { success: false, message: 'Must sell houses/hotels before mortgaging' };
        }
    }
    const mortgageValue = Math.floor(purchasable.price / 2);
    const updatedTiles = tiles.map((t, i) => {
        if (i === tilePosition) {
            return { ...t, mortgaged: true };
        }
        return t;
    });
    const updatedPlayer = {
        ...player,
        money: player.money + mortgageValue,
    };
    return { success: true, message: `Mortgaged for ${mortgageValue}€`, updatedPlayer, updatedTiles };
}
/**
 * Unmortgage a property. Costs mortgage value + 10% interest.
 */
function unmortgageProperty(player, tilePosition, tiles, interestRate) {
    const tile = tiles[tilePosition];
    if (!tile) {
        return { success: false, message: 'Tile not found' };
    }
    if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') {
        return { success: false, message: 'Cannot unmortgage this type of tile' };
    }
    const purchasable = tile;
    if (purchasable.ownerId !== player.id) {
        return { success: false, message: 'You do not own this property' };
    }
    if (!purchasable.mortgaged) {
        return { success: false, message: 'Property is not mortgaged' };
    }
    const mortgageValue = Math.floor(purchasable.price / 2);
    const unmortgageCost = Math.ceil(mortgageValue * (1 + interestRate));
    if (player.money < unmortgageCost) {
        return { success: false, message: `Not enough money. Need ${unmortgageCost}€` };
    }
    const updatedTiles = tiles.map((t, i) => {
        if (i === tilePosition) {
            return { ...t, mortgaged: false };
        }
        return t;
    });
    const updatedPlayer = {
        ...player,
        money: player.money - unmortgageCost,
    };
    return {
        success: true,
        message: `Unmortgaged for ${unmortgageCost}€`,
        updatedPlayer,
        updatedTiles,
    };
}
/**
 * Build a house on a property. Only allowed when landing exactly on own tile.
 */
function buildHouse(player, tilePosition, tiles) {
    const tile = tiles[tilePosition];
    if (!tile || tile.type !== 'property') {
        return { success: false, message: 'Not a property tile' };
    }
    const prop = tile;
    if (prop.ownerId !== player.id) {
        return { success: false, message: 'You do not own this property' };
    }
    if (prop.mortgaged) {
        return { success: false, message: 'Cannot build on a mortgaged property' };
    }
    if (prop.houses >= 5) {
        return { success: false, message: 'Already has a hotel (maximum)' };
    }
    if (player.money < prop.housePrice) {
        return { success: false, message: `Not enough money. Need ${prop.housePrice}€` };
    }
    const updatedTiles = tiles.map((t, i) => {
        if (i === tilePosition) {
            return { ...t, houses: t.houses + 1 };
        }
        return t;
    });
    const updatedPlayer = {
        ...player,
        money: player.money - prop.housePrice,
    };
    const levelName = prop.houses + 1 === 5 ? 'Hotel' : `${prop.houses + 1} Haus/Häuser`;
    return {
        success: true,
        message: `Gebaut: ${levelName} auf ${prop.name}`,
        updatedPlayer,
        updatedTiles,
    };
}
/**
 * Sell a house/hotel back at half the building cost.
 */
function sellHouse(player, tilePosition, tiles) {
    const tile = tiles[tilePosition];
    if (!tile || tile.type !== 'property') {
        return { success: false, message: 'Not a property tile' };
    }
    const prop = tile;
    if (prop.ownerId !== player.id) {
        return { success: false, message: 'You do not own this property' };
    }
    if (prop.houses === 0) {
        return { success: false, message: 'No houses or hotel to sell' };
    }
    const sellValue = Math.floor(prop.housePrice / 2);
    const updatedTiles = tiles.map((t, i) => {
        if (i === tilePosition) {
            return { ...t, houses: t.houses - 1 };
        }
        return t;
    });
    const updatedPlayer = {
        ...player,
        money: player.money + sellValue,
    };
    return {
        success: true,
        message: `Verkauft für ${sellValue}€`,
        updatedPlayer,
        updatedTiles,
    };
}
/**
 * Get all properties owned by a player.
 */
function getPlayerProperties(playerId, tiles) {
    return tiles.filter((t) => {
        if (t.type === 'property')
            return t.ownerId === playerId;
        if (t.type === 'railroad')
            return t.ownerId === playerId;
        if (t.type === 'utility')
            return t.ownerId === playerId;
        return false;
    });
}
/**
 * Transfer all assets from one player to another (bankruptcy to player).
 */
function transferAllAssets(fromPlayer, toPlayer, tiles) {
    const updatedTiles = tiles.map((t) => {
        if ((t.type === 'property' && t.ownerId === fromPlayer.id) ||
            (t.type === 'railroad' && t.ownerId === fromPlayer.id) ||
            (t.type === 'utility' && t.ownerId === fromPlayer.id)) {
            return { ...t, ownerId: toPlayer.id };
        }
        return t;
    });
    const updatedToPlayer = {
        ...toPlayer,
        money: toPlayer.money + fromPlayer.money,
    };
    const updatedFromPlayer = {
        ...fromPlayer,
        money: 0,
        isBankrupt: true,
    };
    return { updatedFromPlayer, updatedToPlayer, updatedTiles };
}
/**
 * Release all assets of bankrupt player back to bank (clear ownerId).
 */
function releaseAssetsToBank(player, tiles) {
    const updatedTiles = tiles.map((t) => {
        if ((t.type === 'property' && t.ownerId === player.id) ||
            (t.type === 'railroad' && t.ownerId === player.id) ||
            (t.type === 'utility' && t.ownerId === player.id)) {
            const cleared = { ...t, ownerId: undefined };
            if (cleared.type === 'property') {
                cleared.houses = 0;
                cleared.mortgaged = false;
            }
            else if (cleared.type === 'railroad') {
                cleared.mortgaged = false;
            }
            else if (cleared.type === 'utility') {
                cleared.mortgaged = false;
            }
            return cleared;
        }
        return t;
    });
    const updatedPlayer = {
        ...player,
        money: 0,
        isBankrupt: true,
    };
    return { updatedPlayer, updatedTiles };
}
//# sourceMappingURL=propertyManagement.js.map