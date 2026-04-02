"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTileLanding = resolveTileLanding;
const rentCalculation_1 = require("./rentCalculation");
/**
 * Resolve what happens when a player lands on a tile.
 * Returns the actions that need to happen.
 */
function resolveTileLanding(player, tile, allTiles, diceTotal, config) {
    const result = {
        playerUpdates: {},
        jackpotIncrease: 0,
        tileEvents: [],
        goToJail: false,
    };
    switch (tile.type) {
        case 'go':
            // GO bonus already handled in movement
            result.tileEvents.push(`${player.name} ist auf Los gelandet`);
            break;
        case 'jail':
            // Just visiting - nothing happens
            result.tileEvents.push(`${player.name} besucht das Gefängnis`);
            break;
        case 'go_to_jail':
            result.goToJail = true;
            result.tileEvents.push(`${player.name} muss ins Gefängnis!`);
            break;
        case 'free_parking':
            // Jackpot collected - handled in game engine
            result.tileEvents.push(`${player.name} landet auf Freiparken`);
            break;
        case 'tax': {
            const taxTile = tile;
            result.pendingAction = { type: 'pay_tax', amount: taxTile.amount };
            result.tileEvents.push(`${player.name} muss Steuer zahlen: ${taxTile.amount}€`);
            break;
        }
        case 'chance':
            result.drawCard = 'chance';
            result.tileEvents.push(`${player.name} zieht eine Ereigniskarte`);
            break;
        case 'community_chest':
            result.drawCard = 'community_chest';
            result.tileEvents.push(`${player.name} zieht eine Gemeinschaftskarte`);
            break;
        case 'property':
        case 'railroad':
        case 'utility': {
            const purchasable = tile;
            if (!purchasable.ownerId) {
                // Unowned - player can buy or go to auction
                result.pendingAction = {
                    type: 'buy_property',
                    tilePosition: tile.position,
                };
                result.tileEvents.push(`${player.name} landet auf ${tile.name} (unbesessen)`);
            }
            else if (purchasable.ownerId === player.id) {
                // Own property - can build a house (special rule)
                if (tile.type === 'property' && !purchasable.mortgaged) {
                    const prop = tile;
                    if (prop.houses < 5) {
                        result.pendingAction = {
                            type: 'build_house',
                            tilePosition: tile.position,
                        };
                        result.tileEvents.push(`${player.name} landet auf eigener Immobilie ${tile.name} - Haus bauen möglich`);
                    }
                    else {
                        result.tileEvents.push(`${player.name} landet auf eigener Immobilie ${tile.name} (Hotel bereits vorhanden)`);
                    }
                }
                else {
                    result.tileEvents.push(`${player.name} landet auf eigener Immobilie ${tile.name}`);
                }
            }
            else {
                // Owned by another player - pay rent
                const rentResult = (0, rentCalculation_1.calculateRent)(tile, player, allTiles, diceTotal);
                if (rentResult && !purchasable.mortgaged) {
                    result.pendingAction = {
                        type: 'pay_rent',
                        amount: rentResult.rentAmount,
                        toPlayerId: rentResult.ownerId,
                        tilePosition: tile.position,
                    };
                    result.tileEvents.push(`${player.name} muss Miete zahlen: ${rentResult.rentAmount}€`);
                }
                else {
                    result.tileEvents.push(`${player.name} landet auf ${tile.name} (verpfändet - keine Miete)`);
                }
            }
            break;
        }
    }
    return result;
}
//# sourceMappingURL=tileResolver.js.map