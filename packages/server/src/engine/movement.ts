import { Player, GameState } from './types';
import { BOARD_TILES } from '../config/board.config';

export const BOARD_SIZE = 40;

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
export function calculateMovement(
  currentPosition: number,
  steps: number,
  isInJail: boolean,
  config: { goPassReward: number; goLandReward: number; goPosition: number }
): MovementResult {
  // Jail position is treated as position 10 for movement (just visiting)
  const startPos = isInJail ? config.goPosition + 10 : currentPosition; // jail is at 10
  const newPosition = (startPos + steps) % BOARD_SIZE;

  // Check if we passed or landed on GO
  const passedGo = startPos + steps >= BOARD_SIZE;
  const landedOnGo = newPosition === config.goPosition;

  let goBonus = 0;
  if (landedOnGo) {
    goBonus = config.goLandReward; // 400€ for landing exactly on GO
  } else if (passedGo) {
    goBonus = config.goPassReward; // 200€ for passing GO
  }

  return {
    newPosition,
    passedGo: passedGo && !landedOnGo,
    landedOnGo,
    goBonus,
  };
}

/**
 * Move a player and apply GO bonus to their money.
 * Returns updated player and movement result.
 */
export function movePlayer(
  player: Player,
  steps: number,
  config: { goPassReward: number; goLandReward: number; goPosition: number }
): { player: Player; movement: MovementResult } {
  const movement = calculateMovement(player.position, steps, false, config);

  const updatedPlayer: Player = {
    ...player,
    position: movement.newPosition,
    money: player.money + movement.goBonus,
  };

  return { player: updatedPlayer, movement };
}

/**
 * Move a player directly to a specific position (e.g., from a card).
 * Detects if GO was passed or landed on.
 */
export function movePlayerTo(
  player: Player,
  targetPosition: number,
  config: { goPassReward: number; goLandReward: number; goPosition: number },
  isExactLanding: boolean = false
): { player: Player; movement: MovementResult } {
  const currentPos = player.position;
  const passedGo = targetPosition < currentPos && !player.inJail;
  const landedOnGo = targetPosition === config.goPosition;

  let goBonus = 0;
  if (isExactLanding && landedOnGo) {
    goBonus = config.goLandReward;
  } else if (passedGo && !landedOnGo) {
    goBonus = config.goPassReward;
  } else if (landedOnGo && !isExactLanding) {
    // Passing GO via card that says "advance to GO" - treat as exact landing per community_chest card 3
    goBonus = config.goPassReward;
  }

  const updatedPlayer: Player = {
    ...player,
    position: targetPosition,
    money: player.money + goBonus,
  };

  return {
    player: updatedPlayer,
    movement: {
      newPosition: targetPosition,
      passedGo: passedGo && !landedOnGo,
      landedOnGo,
      goBonus,
    },
  };
}

/**
 * Find the nearest railroad position ahead of current position.
 */
export function findNearestRailroad(currentPosition: number): number {
  const railroadPositions = [5, 15, 25, 35];
  for (const pos of railroadPositions) {
    if (pos > currentPosition) {
      return pos;
    }
  }
  // Wrap around to first railroad
  return railroadPositions[0];
}

/**
 * Move back a given number of spaces without GO bonus.
 */
export function moveBack(currentPosition: number, spaces: number): number {
  let newPos = currentPosition - spaces;
  if (newPos < 0) {
    newPos = BOARD_SIZE + newPos;
  }
  return newPos;
}
