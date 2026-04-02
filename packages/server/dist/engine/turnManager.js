"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceToNextPlayer = advanceToNextPlayer;
exports.createInitialTurnState = createInitialTurnState;
exports.isTurnComplete = isTurnComplete;
exports.resetDoublesForNewTurn = resetDoublesForNewTurn;
/**
 * Advance to the next player's turn.
 */
function advanceToNextPlayer(currentPlayerId, players) {
    const activePlayers = players.filter((p) => !p.isBankrupt);
    const currentIndex = activePlayers.findIndex((p) => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    return activePlayers[nextIndex].id;
}
/**
 * Create initial turn state for a player.
 */
function createInitialTurnState(playerId) {
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
function isTurnComplete(turnState) {
    return turnState.phase === 'end_turn';
}
/**
 * Reset doubles count for a player at start of their turn.
 * (consecutiveDoubles is tracked on the player for jail detection)
 */
function resetDoublesForNewTurn(player) {
    // Don't reset here - it needs to persist for jail tracking
    // Only reset when a non-doubles roll occurs or jail is triggered
    return player;
}
//# sourceMappingURL=turnManager.js.map