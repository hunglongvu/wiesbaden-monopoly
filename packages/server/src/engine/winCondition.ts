import { Player, GameState, Tile } from './types';
import { calculateNetWorth } from './propertyManagement';

/**
 * Check if any player has won the game.
 * Win condition: net worth >= winConditionNetWorth
 */
export function checkWinCondition(
  players: Player[],
  tiles: Tile[],
  winConditionNetWorth: number
): Player | null {
  const activePlayers = players.filter((p) => !p.isBankrupt);

  for (const player of activePlayers) {
    const netWorth = calculateNetWorth(player, tiles);
    if (netWorth >= winConditionNetWorth) {
      return player;
    }
  }

  return null;
}

/**
 * Check if only one player remains (all others bankrupt).
 */
export function checkLastPlayerStanding(players: Player[]): Player | null {
  const activePlayers = players.filter((p) => !p.isBankrupt);
  if (activePlayers.length === 1) {
    return activePlayers[0];
  }
  return null;
}

/**
 * Get the player with the highest net worth (for end-game ranking).
 */
export function getRanking(
  players: Player[],
  tiles: Tile[]
): Array<{ player: Player; netWorth: number; rank: number }> {
  const ranked = players
    .map((p) => ({
      player: p,
      netWorth: calculateNetWorth(p, tiles),
    }))
    .sort((a, b) => b.netWorth - a.netWorth)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return ranked;
}
