"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAuction = startAuction;
exports.processBid = processBid;
exports.processPass = processPass;
exports.getNextBidder = getNextBidder;
exports.shouldEndAuction = shouldEndAuction;
exports.resolveAuction = resolveAuction;
/**
 * Start an auction for a property.
 */
function startAuction(tilePosition, players, startingBidderId, minimumBid) {
    return {
        tilePosition,
        bids: {},
        currentBidder: startingBidderId,
        minimumBid,
        highestBid: 0,
        highestBidderId: undefined,
        passedPlayers: [],
        active: true,
    };
}
/**
 * Process a bid in the auction.
 */
function processBid(auction, playerId, bidAmount, player) {
    if (!auction.active) {
        return { success: false, message: 'Auction is not active' };
    }
    if (auction.currentBidder !== playerId) {
        return { success: false, message: 'It is not your turn to bid' };
    }
    const minRequired = Math.max(auction.minimumBid, auction.highestBid + 1);
    if (bidAmount < minRequired) {
        return {
            success: false,
            message: `Bid must be at least ${minRequired}€`,
        };
    }
    if (bidAmount > player.money) {
        return { success: false, message: 'Not enough money for this bid' };
    }
    const updatedAuction = {
        ...auction,
        bids: { ...auction.bids, [playerId]: bidAmount },
        highestBid: bidAmount,
        highestBidderId: playerId,
    };
    return { success: true, message: `Bid of ${bidAmount}€ placed`, updatedAuction };
}
/**
 * Process a pass in the auction.
 */
function processPass(auction, playerId) {
    const passedPlayers = [...auction.passedPlayers, playerId];
    return {
        updatedAuction: {
            ...auction,
            passedPlayers,
        },
    };
}
/**
 * Get the next active bidder after the current one.
 * Returns null if auction should end.
 */
function getNextBidder(auction, activePlayers) {
    const eligiblePlayers = activePlayers.filter((p) => !p.isBankrupt && !auction.passedPlayers.includes(p.id));
    if (eligiblePlayers.length === 0)
        return null;
    if (eligiblePlayers.length === 1) {
        // Only one bidder left - they win if they have a bid
        if (auction.highestBidderId === eligiblePlayers[0].id)
            return null;
        return eligiblePlayers[0].id;
    }
    const currentIndex = eligiblePlayers.findIndex((p) => p.id === auction.currentBidder);
    const nextIndex = (currentIndex + 1) % eligiblePlayers.length;
    return eligiblePlayers[nextIndex].id;
}
/**
 * Check if the auction should end.
 * Ends when all players except possibly the highest bidder have passed.
 */
function shouldEndAuction(auction, activePlayers) {
    const eligiblePlayers = activePlayers.filter((p) => !p.isBankrupt && !auction.passedPlayers.includes(p.id));
    // Auction ends if no eligible players remain, or only the highest bidder is left
    if (eligiblePlayers.length === 0)
        return true;
    if (eligiblePlayers.length === 1 &&
        eligiblePlayers[0].id === auction.highestBidderId) {
        return true;
    }
    return false;
}
/**
 * Resolve the auction - transfer property to winning bidder.
 */
function resolveAuction(auction, players, tiles) {
    if (!auction.highestBidderId || auction.highestBid === 0) {
        // No bids placed - property stays with bank
        return {
            success: false,
            message: 'No bids placed, property remains with bank',
        };
    }
    const winner = players.find((p) => p.id === auction.highestBidderId);
    if (!winner) {
        return { success: false, message: 'Winner not found' };
    }
    if (winner.money < auction.highestBid) {
        return { success: false, message: 'Winner cannot afford winning bid' };
    }
    const updatedPlayers = players.map((p) => {
        if (p.id === auction.highestBidderId) {
            return { ...p, money: p.money - auction.highestBid };
        }
        return p;
    });
    const updatedTiles = tiles.map((t, i) => {
        if (i === auction.tilePosition) {
            return { ...t, ownerId: auction.highestBidderId };
        }
        return t;
    });
    const tile = tiles[auction.tilePosition];
    return {
        success: true,
        message: `${winner.name} gewann die Auktion für ${auction.highestBid}€`,
        updatedPlayers,
        updatedTiles,
        winnerId: auction.highestBidderId,
    };
}
//# sourceMappingURL=auctionSystem.js.map