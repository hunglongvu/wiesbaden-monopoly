import { Player, TurnState, GameState } from './types';

/**
 * Advance to the next player's turn.
 */
export function advanceToNextPlayer(
  currentPlayerId: string,
  players: Player[]
): string {
  const activePlayers = players.filter((p) => !p.isBankrupt);
  const currentIndex = activePlayers.findIndex((p) => p.id === currentPlayerId);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].id;
}

/**
 * Create initial turn state for a player.
 */
export function createInitialTurnState(playerId: string): TurnState {
  return {
    playerId,
    phase: 'waiting_for_roll',
    doublesCount: 0,
    mustRollAgain: false,
  };
}

/**
 * Check if turn should end (no more actions pending).
 */
export function isTurnComplete(turnState: TurnState): boolean {
  return turnState.phase === 'end_turn';
}

/**
 * Reset doubles count for a player at start of their turn.
 * (consecutiveDoubles is tracked on the player for jail detection)
 */
export function resetDoublesForNewTurn(player: Player): Player {
  // Don't reset here - it needs to persist for jail tracking
  // Only reset when a non-doubles roll occurs or jail is triggered
  return player;
}
