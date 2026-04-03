"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARD_SIZE = void 0;
exports.calculateMovement = calculateMovement;
exports.movePlayer = movePlayer;
exports.movePlayerTo = movePlayerTo;
exports.findNearestRailroad = findNearestRailroad;
exports.moveBack = moveBack;
exports.BOARD_SIZE = 28;
/**
 * Calculate movement result for a player moving `steps` spaces.
 * Handles wrapping around the board and GO detection.
 */
function calculateMovement(currentPosition, steps, isInJail, config) {
    // Jail position is treated as position 10 for movement (just visiting)
    const startPos = isInJail ? config.goPosition + 10 : currentPosition; // jail is at 10
    const newPosition = (startPos + steps) % exports.BOARD_SIZE;
    // Check if we passed or landed on GO
    const passedGo = startPos + steps >= exports.BOARD_SIZE;
    const landedOnGo = newPosition === config.goPosition;
    let goBonus = 0;
    if (landedOnGo) {
        goBonus = config.goLandReward; // 400€ for landing exactly on GO
    }
    else if (passedGo) {
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
function movePlayer(player, steps, config) {
    const movement = calculateMovement(player.position, steps, false, config);
    const updatedPlayer = {
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
function movePlayerTo(player, targetPosition, config, isExactLanding = false) {
    const currentPos = player.position;
    const passedGo = targetPosition < currentPos && !player.inJail;
    const landedOnGo = targetPosition === config.goPosition;
    let goBonus = 0;
    if (isExactLanding && landedOnGo) {
        goBonus = config.goLandReward;
    }
    else if (passedGo && !landedOnGo) {
        goBonus = config.goPassReward;
    }
    else if (landedOnGo && !isExactLanding) {
        // Passing GO via card that says "advance to GO" - treat as exact landing per community_chest card 3
        goBonus = config.goPassReward;
    }
    const updatedPlayer = {
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
function findNearestRailroad(currentPosition) {
    const railroadPositions = [4, 18];
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
function moveBack(currentPosition, spaces) {
    let newPos = currentPosition - spaces;
    if (newPos < 0) {
        newPos = exports.BOARD_SIZE + newPos;
    }
    return newPos;
}
//# sourceMappingURL=movement.js.map