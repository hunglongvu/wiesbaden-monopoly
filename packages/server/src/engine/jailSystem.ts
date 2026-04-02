import { Player, GameState } from './types';

export interface JailResult {
  player: Player;
  jackpotIncrease: number;
  message: string;
}

/**
 * Send a player to jail.
 */
export function sendToJail(player: Player, jailPosition: number): Player {
  return {
    ...player,
    position: jailPosition,
    inJail: true,
    jailTurns: 0,
    consecutiveDoubles: 0,
  };
}

/**
 * Attempt to pay the jail fee (150€ → jackpot).
 */
export function payJailFee(
  player: Player,
  jailBuyoutCost: number
): { success: boolean; message: string; player?: Player; jackpotIncrease?: number } {
  if (!player.inJail) {
    return { success: false, message: 'Player is not in jail' };
  }

  if (player.money < jailBuyoutCost) {
    return { success: false, message: `Not enough money to pay ${jailBuyoutCost}€` };
  }

  const updatedPlayer: Player = {
    ...player,
    money: player.money - jailBuyoutCost,
    inJail: false,
    jailTurns: 0,
    consecutiveDoubles: 0,
  };

  return {
    success: true,
    message: `Bezahlt ${jailBuyoutCost}€ Kaution`,
    player: updatedPlayer,
    jackpotIncrease: jailBuyoutCost,
  };
}

/**
 * Process a dice roll while in jail.
 * Returns whether player exits jail, moves normally, or stays in jail.
 */
export function processJailRoll(
  player: Player,
  die1: number,
  die2: number,
  jailBuyoutCost: number,
  maxJailTurns: number
): {
  exitJail: boolean;
  mustPayFee: boolean;
  player: Player;
  jackpotIncrease: number;
  steps: number;
  message: string;
} {
  const isDoubles = die1 === die2;
  const steps = die1 + die2;
  const newJailTurns = player.jailTurns + 1;

  if (isDoubles) {
    // Rolled doubles: exit jail and move
    const updatedPlayer: Player = {
      ...player,
      inJail: false,
      jailTurns: 0,
      consecutiveDoubles: 0,
    };
    return {
      exitJail: true,
      mustPayFee: false,
      player: updatedPlayer,
      jackpotIncrease: 0,
      steps,
      message: `Pasch! Verlässt Gefängnis und bewegt ${steps} Felder`,
    };
  }

  // Not doubles
  if (newJailTurns >= maxJailTurns) {
    // Third turn in jail - must pay fee and move
    if (player.money < jailBuyoutCost) {
      // Bankrupt situation - still exit but mark as unable to pay (handled upstream)
      const updatedPlayer: Player = {
        ...player,
        inJail: false,
        jailTurns: 0,
        money: player.money - jailBuyoutCost,
      };
      return {
        exitJail: true,
        mustPayFee: true,
        player: updatedPlayer,
        jackpotIncrease: jailBuyoutCost,
        steps,
        message: `3. Runde im Gefängnis - Zahle ${jailBuyoutCost}€ und bewege ${steps} Felder`,
      };
    }

    const updatedPlayer: Player = {
      ...player,
      inJail: false,
      jailTurns: 0,
      money: player.money - jailBuyoutCost,
    };
    return {
      exitJail: true,
      mustPayFee: true,
      player: updatedPlayer,
      jackpotIncrease: jailBuyoutCost,
      steps,
      message: `3. Runde im Gefängnis - Zahle ${jailBuyoutCost}€ und bewege ${steps} Felder`,
    };
  }

  // Stay in jail
  const updatedPlayer: Player = {
    ...player,
    jailTurns: newJailTurns,
  };
  return {
    exitJail: false,
    mustPayFee: false,
    player: updatedPlayer,
    jackpotIncrease: 0,
    steps: 0,
    message: `Im Gefängnis geblieben (Versuch ${newJailTurns}/${maxJailTurns})`,
  };
}

/**
 * Check if a player must exit jail this turn (has been in 3 turns).
 */
export function mustExitJail(player: Player, maxJailTurns: number): boolean {
  return player.inJail && player.jailTurns >= maxJailTurns;
}
