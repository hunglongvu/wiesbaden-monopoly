import { TradeOffer, Player, Tile } from './types';
/**
 * Create a new trade offer.
 */
export declare function createTradeOffer(fromPlayerId: string, toPlayerId: string, offerMoney: number, offerProperties: number[], requestMoney: number, requestProperties: number[]): TradeOffer;
/**
 * Validate a trade offer - checks ownership, funds, and property availability.
 */
export declare function validateTrade(offer: TradeOffer, players: Player[], tiles: Tile[]): {
    valid: boolean;
    message: string;
};
/**
 * Execute a trade offer - transfer money and properties.
 */
export declare function executeTrade(offer: TradeOffer, players: Player[], tiles: Tile[]): {
    success: boolean;
    message: string;
    updatedPlayers?: Player[];
    updatedTiles?: Tile[];
};
/**
 * Reject a trade offer.
 */
export declare function rejectTrade(offer: TradeOffer): TradeOffer;
/**
 * Accept a trade offer (status update).
 */
export declare function acceptTrade(offer: TradeOffer): TradeOffer;
//# sourceMappingURL=tradeSystem.d.ts.map