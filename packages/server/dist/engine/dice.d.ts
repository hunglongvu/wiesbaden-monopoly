export interface DiceRoll {
    die1: number;
    die2: number;
    total: number;
    isDoubles: boolean;
}
/**
 * Roll two dice, each producing a value between 1 and 6.
 */
export declare function rollDice(): DiceRoll;
/**
 * Create a deterministic dice roll (for testing).
 */
export declare function createDiceRoll(die1: number, die2: number): DiceRoll;
//# sourceMappingURL=dice.d.ts.map