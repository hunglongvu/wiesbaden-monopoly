import { JackpotState } from './types';

/**
 * Add money to the jackpot (from taxes, penalties, jail fees).
 */
export function addToJackpot(jackpot: JackpotState, amount: number): JackpotState {
  return { amount: jackpot.amount + amount };
}

/**
 * Collect the entire jackpot (when landing on Free Parking).
 * Returns the jackpot amount and resets to 0.
 */
export function collectJackpot(jackpot: JackpotState): { amount: number; newJackpot: JackpotState } {
  const amount = jackpot.amount;
  return { amount, newJackpot: { amount: 0 } };
}

/**
 * Reset jackpot to 0.
 */
export function resetJackpot(): JackpotState {
  return { amount: 0 };
}

/**
 * Create initial jackpot state.
 */
export function createJackpot(): JackpotState {
  return { amount: 0 };
}
