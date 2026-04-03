import { Player } from './types';
export declare const BOARD_SIZE = 28;
export interface MovementResult {
    newPosition: number;
    passedGo: boolean;
    landedOnGo: boolean;
    goBonus: number;
}
/**
 * Calculate movement result for a player moving `steps` spaces.
 * Handles wrapping around the board and GO detection.
 */
export declare function calculateMovement(currentPosition: number, steps: number, isInJail: boolean, config: {
    goPassReward: number;
    goLandReward: number;
    goPosition: number;
}): MovementResult;
/**
 * Move a player and apply GO bonus to their money.
 * Returns updated player and movement result.
 */
export declare function movePlayer(player: Player, steps: number, config: {
    goPassReward: number;
    goLandReward: number;
    goPosition: number;
}): {
    player: Player;
    movement: MovementResult;
};
/**
 * Move a player directly to a specific position (e.g., from a card).
 * Detects if GO was passed or landed on.
 */
export declare function movePlayerTo(player: Player, targetPosition: number, config: {
    goPassReward: number;
    goLandReward: number;
    goPosition: number;
}, isExactLanding?: boolean): {
    player: Player;
    movement: MovementResult;
};
/**
 * Find the nearest railroad position ahead of current position.
 */
export declare function findNearestRailroad(currentPosition: number): number;
/**
 * Move back a given number of spaces without GO bonus.
 */
export declare function moveBack(currentPosition: number, spaces: number): number;
//# sourceMappingURL=movement.d.ts.map