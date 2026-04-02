import { Player, Tile } from './types';
/**
 * Check if any player has won the game.
 * Win condition: net worth >= winConditionNetWorth
 */
export declare function checkWinCondition(players: Player[], tiles: Tile[], winConditionNetWorth: number): Player | null;
/**
 * Check if only one player remains (all others bankrupt).
 */
export declare function checkLastPlayerStanding(players: Player[]): Player | null;
/**
 * Get the player with the highest net worth (for end-game ranking).
 */
export declare function getRanking(players: Player[], tiles: Tile[]): Array<{
    player: Player;
    netWorth: number;
    rank: number;
}>;
//# sourceMappingURL=winCondition.d.ts.map