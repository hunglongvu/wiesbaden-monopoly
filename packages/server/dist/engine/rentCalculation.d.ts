import { Tile, Player } from './types';
/**
 * Calculate rent owed for landing on a property tile.
 * Returns 0 if tile is unowned, mortgaged, or owned by the landing player.
 */
export declare function calculateRent(tile: Tile, landingPlayer: Player, allTiles: Tile[], diceTotal: number): {
    ownerId: string;
    rentAmount: number;
} | null;
/**
 * Check if an owner has the full color group (all tiles owned and none mortgaged).
 */
export declare function ownerHasFullColorGroup(color: string, ownerId: string, allTiles: Tile[]): boolean;
//# sourceMappingURL=rentCalculation.d.ts.map