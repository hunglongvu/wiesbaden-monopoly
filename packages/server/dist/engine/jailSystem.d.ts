import { Player } from './types';
export interface JailResult {
    player: Player;
    jackpotIncrease: number;
    message: string;
}
/**
 * Send a player to jail.
 */
export declare function sendToJail(player: Player, jailPosition: number): Player;
/**
 * Attempt to pay the jail fee (150€ → jackpot).
 */
export declare function payJailFee(player: Player, jailBuyoutCost: number): {
    success: boolean;
    message: string;
    player?: Player;
    jackpotIncrease?: number;
};
/**
 * Process a dice roll while in jail.
 * Returns whether player exits jail, moves normally, or stays in jail.
 */
export declare function processJailRoll(player: Player, die1: number, die2: number, jailBuyoutCost: number, maxJailTurns: number): {
    exitJail: boolean;
    mustPayFee: boolean;
    player: Player;
    jackpotIncrease: number;
    steps: number;
    message: string;
};
/**
 * Check if a player must exit jail this turn (has been in 3 turns).
 */
export declare function mustExitJail(player: Player, maxJailTurns: number): boolean;
//# sourceMappingURL=jailSystem.d.ts.map