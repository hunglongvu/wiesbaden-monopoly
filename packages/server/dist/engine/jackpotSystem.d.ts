import { JackpotState } from './types';
/**
 * Add money to the jackpot (from taxes, penalties, jail fees).
 */
export declare function addToJackpot(jackpot: JackpotState, amount: number): JackpotState;
/**
 * Collect the entire jackpot (when landing on Free Parking).
 * Returns the jackpot amount and resets to 0.
 */
export declare function collectJackpot(jackpot: JackpotState): {
    amount: number;
    newJackpot: JackpotState;
};
/**
 * Reset jackpot to 0.
 */
export declare function resetJackpot(): JackpotState;
/**
 * Create initial jackpot state.
 */
export declare function createJackpot(): JackpotState;
//# sourceMappingURL=jackpotSystem.d.ts.map