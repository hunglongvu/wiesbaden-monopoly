"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollDice = rollDice;
exports.createDiceRoll = createDiceRoll;
/**
 * Roll two dice, each producing a value between 1 and 6.
 */
function rollDice() {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    return {
        die1,
        die2,
        total: die1 + die2,
        isDoubles: die1 === die2,
    };
}
/**
 * Create a deterministic dice roll (for testing).
 */
function createDiceRoll(die1, die2) {
    if (die1 < 1 || die1 > 6 || die2 < 1 || die2 > 6) {
        throw new Error(`Invalid dice values: ${die1}, ${die2}`);
    }
    return {
        die1,
        die2,
        total: die1 + die2,
        isDoubles: die1 === die2,
    };
}
//# sourceMappingURL=dice.js.map