import { Tile, Player, PendingAction } from './types';
export interface TileResolutionResult {
    pendingAction?: PendingAction;
    playerUpdates: Partial<Player>;
    jackpotIncrease: number;
    tileEvents: string[];
    goToJail: boolean;
    drawCard?: 'chance' | 'community_chest';
}
/**
 * Resolve what happens when a player lands on a tile.
 * Returns the actions that need to happen.
 */
export declare function resolveTileLanding(player: Player, tile: Tile, allTiles: Tile[], diceTotal: number, config: {
    jailPosition: number;
    freeParkingPosition: number;
}): TileResolutionResult;
//# sourceMappingURL=tileResolver.d.ts.map