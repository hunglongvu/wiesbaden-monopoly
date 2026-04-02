import { Player, TurnState } from './types';
/**
 * Advance to the next player's turn.
 */
export declare function advanceToNextPlayer(currentPlayerId: string, players: Player[]): string;
/**
 * Create initial turn state for a player.
 */
export declare function createInitialTurnState(playerId: string): TurnState;
/**
 * Check if turn should end (no more actions pending).
 */
export declare function isTurnComplete(turnState: TurnState): boolean;
/**
 * Reset doubles count for a player at start of their turn.
 * (consecutiveDoubles is tracked on the player for jail detection)
 */
export declare function resetDoublesForNewTurn(player: Player): Player;
//# sourceMappingURL=turnManager.d.ts.map