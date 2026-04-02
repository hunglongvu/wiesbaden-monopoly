"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToJackpot = addToJackpot;
exports.collectJackpot = collectJackpot;
exports.resetJackpot = resetJackpot;
exports.createJackpot = createJackpot;
/**
 * Add money to the jackpot (from taxes, penalties, jail fees).
 */
function addToJackpot(jackpot, amount) {
    return { amount: jackpot.amount + amount };
}
/**
 * Collect the entire jackpot (when landing on Free Parking).
 * Returns the jackpot amount and resets to 0.
 */
function collectJackpot(jackpot) {
    const amount = jackpot.amount;
    return { amount, newJackpot: { amount: 0 } };
}
/**
 * Reset jackpot to 0.
 */
function resetJackpot() {
    return { amount: 0 };
}
/**
 * Create initial jackpot state.
 */
function createJackpot() {
    return { amount: 0 };
}
//# sourceMappingURL=jackpotSystem.js.map