import { Player, Tile } from './types';
export interface MortgageResult {
    success: boolean;
    message: string;
    mortgageValue?: number;
}
export interface UnmortgageResult {
    success: boolean;
    message: string;
    cost?: number;
}
export interface SellHouseResult {
    success: boolean;
    message: string;
    proceeds?: number;
}
/**
 * Calculate net worth of a player.
 * Net worth = cash + sum(property prices) + sum(house/hotel values) - sum(mortgage values)
 */
export declare function calculateNetWorth(player: Player, allTiles: Tile[]): number;
/**
 * Mortgage a property. Returns half the purchase price.
 */
export declare function mortgageProperty(player: Player, tilePosition: number, tiles: Tile[]): {
    success: boolean;
    message: string;
    updatedPlayer?: Player;
    updatedTiles?: Tile[];
};
/**
 * Unmortgage a property. Costs mortgage value + 10% interest.
 */
export declare function unmortgageProperty(player: Player, tilePosition: number, tiles: Tile[], interestRate: number): {
    success: boolean;
    message: string;
    updatedPlayer?: Player;
    updatedTiles?: Tile[];
};
/**
 * Build a house on a property. Only allowed when landing exactly on own tile.
 */
export declare function buildHouse(player: Player, tilePosition: number, tiles: Tile[]): {
    success: boolean;
    message: string;
    updatedPlayer?: Player;
    updatedTiles?: Tile[];
};
/**
 * Sell a house/hotel back at half the building cost.
 */
export declare function sellHouse(player: Player, tilePosition: number, tiles: Tile[]): {
    success: boolean;
    message: string;
    updatedPlayer?: Player;
    updatedTiles?: Tile[];
};
/**
 * Get all properties owned by a player.
 */
export declare function getPlayerProperties(playerId: string, tiles: Tile[]): Tile[];
/**
 * Transfer all assets from one player to another (bankruptcy to player).
 */
export declare function transferAllAssets(fromPlayer: Player, toPlayer: Player, tiles: Tile[]): {
    updatedFromPlayer: Player;
    updatedToPlayer: Player;
    updatedTiles: Tile[];
};
/**
 * Release all assets of bankrupt player back to bank (clear ownerId).
 */
export declare function releaseAssetsToBank(player: Player, tiles: Tile[]): {
    updatedPlayer: Player;
    updatedTiles: Tile[];
};
//# sourceMappingURL=propertyManagement.d.ts.map