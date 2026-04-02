import { Auction, Player, Tile } from './types';
/**
 * Start an auction for a property.
 */
export declare function startAuction(tilePosition: number, players: Player[], startingBidderId: string, minimumBid: number): Auction;
/**
 * Process a bid in the auction.
 */
export declare function processBid(auction: Auction, playerId: string, bidAmount: number, player: Player): {
    success: boolean;
    message: string;
    updatedAuction?: Auction;
};
/**
 * Process a pass in the auction.
 */
export declare function processPass(auction: Auction, playerId: string): {
    updatedAuction: Auction;
};
/**
 * Get the next active bidder after the current one.
 * Returns null if auction should end.
 */
export declare function getNextBidder(auction: Auction, activePlayers: Player[]): string | null;
/**
 * Check if the auction should end.
 * Ends when all players except possibly the highest bidder have passed.
 */
export declare function shouldEndAuction(auction: Auction, activePlayers: Player[]): boolean;
/**
 * Resolve the auction - transfer property to winning bidder.
 */
export declare function resolveAuction(auction: Auction, players: Player[], tiles: Tile[]): {
    success: boolean;
    message: string;
    updatedPlayers?: Player[];
    updatedTiles?: Tile[];
    winnerId?: string;
};
//# sourceMappingURL=auctionSystem.d.ts.map