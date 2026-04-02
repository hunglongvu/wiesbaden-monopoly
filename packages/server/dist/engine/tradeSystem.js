"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTradeOffer = createTradeOffer;
exports.validateTrade = validateTrade;
exports.executeTrade = executeTrade;
exports.rejectTrade = rejectTrade;
exports.acceptTrade = acceptTrade;
const uuid_1 = require("uuid");
/**
 * Create a new trade offer.
 */
function createTradeOffer(fromPlayerId, toPlayerId, offerMoney, offerProperties, requestMoney, requestProperties) {
    return {
        id: (0, uuid_1.v4)(),
        fromPlayerId,
        toPlayerId,
        offerMoney,
        offerProperties,
        requestMoney,
        requestProperties,
        status: 'pending',
    };
}
/**
 * Validate a trade offer - checks ownership, funds, and property availability.
 */
function validateTrade(offer, players, tiles) {
    const fromPlayer = players.find((p) => p.id === offer.fromPlayerId);
    const toPlayer = players.find((p) => p.id === offer.toPlayerId);
    if (!fromPlayer || !toPlayer) {
        return { valid: false, message: 'Player not found' };
    }
    if (fromPlayer.isBankrupt || toPlayer.isBankrupt) {
        return { valid: false, message: 'Cannot trade with bankrupt player' };
    }
    // Check offering player has enough money
    if (fromPlayer.money < offer.offerMoney) {
        return { valid: false, message: 'Not enough money to offer' };
    }
    // Check requesting player has enough money
    if (toPlayer.money < offer.requestMoney) {
        return { valid: false, message: 'Other player does not have enough money' };
    }
    // Check offering player owns offered properties
    for (const pos of offer.offerProperties) {
        const tile = tiles[pos];
        if (!tile) {
            return { valid: false, message: `Tile at position ${pos} not found` };
        }
        const ownedTile = tile;
        if (ownedTile.ownerId !== offer.fromPlayerId) {
            return { valid: false, message: `You do not own property at position ${pos}` };
        }
    }
    // Check requesting player owns requested properties
    for (const pos of offer.requestProperties) {
        const tile = tiles[pos];
        if (!tile) {
            return { valid: false, message: `Tile at position ${pos} not found` };
        }
        const ownedTile = tile;
        if (ownedTile.ownerId !== offer.toPlayerId) {
            return { valid: false, message: `Other player does not own property at position ${pos}` };
        }
    }
    return { valid: true, message: 'Trade is valid' };
}
/**
 * Execute a trade offer - transfer money and properties.
 */
function executeTrade(offer, players, tiles) {
    const validation = validateTrade(offer, players, tiles);
    if (!validation.valid) {
        return { success: false, message: validation.message };
    }
    // Transfer money
    let updatedPlayers = players.map((p) => {
        if (p.id === offer.fromPlayerId) {
            return {
                ...p,
                money: p.money - offer.offerMoney + offer.requestMoney,
            };
        }
        if (p.id === offer.toPlayerId) {
            return {
                ...p,
                money: p.money + offer.offerMoney - offer.requestMoney,
            };
        }
        return p;
    });
    // Transfer properties
    let updatedTiles = tiles.map((t, i) => {
        if (offer.offerProperties.includes(i)) {
            return { ...t, ownerId: offer.toPlayerId };
        }
        if (offer.requestProperties.includes(i)) {
            return { ...t, ownerId: offer.fromPlayerId };
        }
        return t;
    });
    const fromPlayer = players.find((p) => p.id === offer.fromPlayerId);
    const toPlayer = players.find((p) => p.id === offer.toPlayerId);
    return {
        success: true,
        message: `Handel zwischen ${fromPlayer?.name} und ${toPlayer?.name} abgeschlossen`,
        updatedPlayers,
        updatedTiles,
    };
}
/**
 * Reject a trade offer.
 */
function rejectTrade(offer) {
    return { ...offer, status: 'rejected' };
}
/**
 * Accept a trade offer (status update).
 */
function acceptTrade(offer) {
    return { ...offer, status: 'accepted' };
}
//# sourceMappingURL=tradeSystem.js.map