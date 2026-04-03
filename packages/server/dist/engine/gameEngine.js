"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGame = createGame;
exports.addPlayer = addPlayer;
exports.startGame = startGame;
exports.handleRollDice = handleRollDice;
exports.handleBuyProperty = handleBuyProperty;
exports.handleDeclineProperty = handleDeclineProperty;
exports.handleAuctionBid = handleAuctionBid;
exports.handleAuctionPass = handleAuctionPass;
exports.handleConfirmAction = handleConfirmAction;
exports.handlePayJailFee = handlePayJailFee;
exports.handleBuildHouse = handleBuildHouse;
exports.handleDeclineBuild = handleDeclineBuild;
exports.handleMortgageProperty = handleMortgageProperty;
exports.handleUnmortgageProperty = handleUnmortgageProperty;
exports.handleSellHouse = handleSellHouse;
exports.handleProposeTrade = handleProposeTrade;
exports.handleAcceptTrade = handleAcceptTrade;
exports.handleRejectTrade = handleRejectTrade;
exports.handleEndTurn = handleEndTurn;
const uuid_1 = require("uuid");
const board_config_1 = require("../config/board.config");
const dice_1 = require("./dice");
const movement_1 = require("./movement");
const rentCalculation_1 = require("./rentCalculation");
const propertyManagement_1 = require("./propertyManagement");
const jailSystem_1 = require("./jailSystem");
const jackpotSystem_1 = require("./jackpotSystem");
const cardSystem_1 = require("./cardSystem");
const auctionSystem_1 = require("./auctionSystem");
const tradeSystem_1 = require("./tradeSystem");
const winCondition_1 = require("./winCondition");
const turnManager_1 = require("./turnManager");
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
function createGame() {
    const tiles = board_config_1.BOARD_TILES.map((t) => ({ ...t }));
    return {
        id: (0, uuid_1.v4)(),
        players: [],
        tiles,
        currentTurn: {
            playerId: '',
            phase: 'waiting_for_roll',
            doublesCount: 0,
            mustRollAgain: false,
        },
        jackpot: (0, jackpotSystem_1.createJackpot)(),
        pendingTrades: [],
        gamePhase: 'lobby',
        eventLog: [],
        chanceDeck: (0, cardSystem_1.createDeck)('chance'),
        communityChestDeck: (0, cardSystem_1.createDeck)('community_chest'),
        config: { ...board_config_1.DEFAULT_CONFIG },
    };
}
function addPlayer(state, playerId, playerName) {
    if (state.players.length >= 4) {
        throw new Error('Game is full (max 4 players)');
    }
    if (state.gamePhase !== 'lobby') {
        throw new Error('Game already started');
    }
    if (state.players.find((p) => p.id === playerId)) {
        throw new Error('Player already in game');
    }
    const newPlayer = {
        id: playerId,
        name: playerName,
        color: PLAYER_COLORS[state.players.length],
        money: state.config.startMoney,
        position: 0,
        inJail: false,
        jailTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
    };
    return addLog({ ...state, players: [...state.players, newPlayer] }, `${playerName} ist dem Spiel beigetreten`);
}
function startGame(state) {
    if (state.players.length < 2) {
        throw new Error('Need at least 2 players to start');
    }
    if (state.gamePhase !== 'lobby') {
        throw new Error('Game already started');
    }
    const firstPlayer = state.players[0];
    return addLog({
        ...state,
        gamePhase: 'playing',
        currentTurn: (0, turnManager_1.createInitialTurnState)(firstPlayer.id),
    }, `Spiel gestartet! ${firstPlayer.name} beginnt.`);
}
// ─── Main action handlers ────────────────────────────────────────────────────
function handleRollDice(state, playerId) {
    if (state.gamePhase !== 'playing')
        throw new Error('Game not in progress');
    if (state.currentTurn.playerId !== playerId)
        throw new Error('Not your turn');
    if (state.currentTurn.phase !== 'waiting_for_roll') {
        throw new Error('Cannot roll dice now');
    }
    const player = getPlayer(state, playerId);
    const dice = (0, dice_1.rollDice)();
    // ── In-jail roll ──
    if (player.inJail) {
        return handleJailRoll(state, player, dice);
    }
    // ── Normal roll ──
    return handleNormalRoll(state, player, dice);
}
function handleJailRoll(state, player, dice) {
    const result = (0, jailSystem_1.processJailRoll)(player, dice.die1, dice.die2, state.config.jailBuyoutCost, state.config.maxJailTurns);
    let newState = updatePlayer(state, result.player);
    if (result.jackpotIncrease > 0) {
        newState = { ...newState, jackpot: (0, jackpotSystem_1.addToJackpot)(newState.jackpot, result.jackpotIncrease) };
    }
    newState = addLog(newState, result.message);
    if (!result.exitJail) {
        // Stay in jail - end turn
        const nextPlayerId = (0, turnManager_1.advanceToNextPlayer)(player.id, newState.players);
        newState = {
            ...newState,
            currentTurn: {
                ...(0, turnManager_1.createInitialTurnState)(nextPlayerId),
                diceRoll: [dice.die1, dice.die2],
            },
        };
        return newState;
    }
    // Exit jail and move
    newState = {
        ...newState,
        currentTurn: {
            ...newState.currentTurn,
            diceRoll: [dice.die1, dice.die2],
            isDoubles: dice.isDoubles,
            doublesCount: dice.isDoubles ? 1 : 0,
            phase: 'moving',
        },
    };
    return applyMovement(newState, result.player.id, result.steps, dice.total);
}
function handleNormalRoll(state, player, dice) {
    let newDoublesCount = state.currentTurn.doublesCount;
    if (dice.isDoubles) {
        newDoublesCount += 1;
        // 3 consecutive doubles → jail
        if (newDoublesCount >= 3) {
            const jailedPlayer = (0, jailSystem_1.sendToJail)(player, state.config.jailPosition);
            let newState = updatePlayer(state, jailedPlayer);
            newState = addLog(newState, `${player.name} würfelt zum dritten Mal Pasch - ins Gefängnis!`);
            const nextPlayerId = (0, turnManager_1.advanceToNextPlayer)(player.id, newState.players);
            return {
                ...newState,
                currentTurn: (0, turnManager_1.createInitialTurnState)(nextPlayerId),
            };
        }
    }
    else {
        newDoublesCount = 0;
        // Reset consecutive doubles on player
        const updatedPlayer = { ...player, consecutiveDoubles: 0 };
        state = updatePlayer(state, updatedPlayer);
    }
    let newState = {
        ...state,
        currentTurn: {
            ...state.currentTurn,
            diceRoll: [dice.die1, dice.die2],
            isDoubles: dice.isDoubles,
            doublesCount: newDoublesCount,
            mustRollAgain: dice.isDoubles,
            phase: 'moving',
        },
    };
    return applyMovement(newState, player.id, dice.total, dice.total);
}
function applyMovement(state, playerId, steps, diceTotal) {
    const player = getPlayer(state, playerId);
    const movement = (0, movement_1.calculateMovement)(player.position, steps, false, state.config);
    let updatedPlayer = {
        ...player,
        position: movement.newPosition,
        money: player.money + movement.goBonus,
    };
    let newState = updatePlayer(state, updatedPlayer);
    if (movement.landedOnGo) {
        newState = addLog(newState, `${player.name} landet auf Los und erhält ${movement.goBonus}€!`);
    }
    else if (movement.passedGo) {
        newState = addLog(newState, `${player.name} passiert Los und erhält ${movement.goBonus}€`);
    }
    // Resolve tile landing
    return resolveLanding(newState, updatedPlayer.id, movement.newPosition, diceTotal);
}
function resolveLanding(state, playerId, position, diceTotal) {
    const player = getPlayer(state, playerId);
    const tile = state.tiles[position];
    // Handle go_to_jail first
    if (tile.type === 'go_to_jail') {
        const jailedPlayer = (0, jailSystem_1.sendToJail)(player, state.config.jailPosition);
        let newState = updatePlayer(state, jailedPlayer);
        newState = addLog(newState, `${player.name} muss ins Gefängnis!`);
        const nextPlayerId = (0, turnManager_1.advanceToNextPlayer)(playerId, newState.players);
        return { ...newState, currentTurn: (0, turnManager_1.createInitialTurnState)(nextPlayerId) };
    }
    // Free parking - collect jackpot
    if (tile.type === 'free_parking') {
        const { amount, newJackpot } = (0, jackpotSystem_1.collectJackpot)(state.jackpot);
        let updatedPlayer = getPlayer(state, playerId);
        updatedPlayer = { ...updatedPlayer, money: updatedPlayer.money + amount };
        let newState = updatePlayer({ ...state, jackpot: newJackpot }, updatedPlayer);
        newState = addLog(newState, `${player.name} landet auf Freiparken und erhält den Jackpot: ${amount}€!`);
        return setPhase(newState, 'end_turn');
    }
    // Tax
    if (tile.type === 'tax') {
        const taxTile = tile;
        const amount = taxTile.amount;
        const updatedPlayer = { ...player, money: player.money - amount };
        let newState = updatePlayer(state, updatedPlayer);
        newState = { ...newState, jackpot: (0, jackpotSystem_1.addToJackpot)(newState.jackpot, amount) };
        newState = addLog(newState, `${player.name} zahlt ${amount}€ Steuer → Jackpot`);
        return setPhase(newState, 'end_turn');
    }
    // Chance/Community Chest
    if (tile.type === 'chance' || tile.type === 'community_chest') {
        return handleCardDraw(state, playerId, tile.type, diceTotal);
    }
    // Jail (just visiting)
    if (tile.type === 'jail') {
        const jailState = addLog(state, `${player.name} besucht das Gefängnis`);
        return setPhase(jailState, 'end_turn');
    }
    // GO already handled in applyMovement
    if (tile.type === 'go') {
        return setPhase(state, 'end_turn');
    }
    // Purchasable tiles
    if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
        return handlePurchasableLanding(state, playerId, position, diceTotal);
    }
    return setPhase(state, 'end_turn');
}
function handleCardDraw(state, playerId, deckType, diceTotal) {
    const deck = deckType === 'chance' ? state.chanceDeck : state.communityChestDeck;
    const drawn = (0, cardSystem_1.drawCard)(deck);
    if (!drawn)
        return setPhase(state, 'end_turn');
    const { card, remainingDeck } = drawn;
    let newState = deckType === 'chance'
        ? { ...state, chanceDeck: remainingDeck }
        : { ...state, communityChestDeck: remainingDeck };
    newState = addLog(newState, `${getPlayer(state, playerId).name} zieht: "${card.text}"`);
    newState = { ...newState, lastCardEvent: { card, drawnBy: playerId } };
    const player = getPlayer(newState, playerId);
    const effectResult = (0, cardSystem_1.applyCardEffect)(card, player, newState.players, newState.tiles, newState.config);
    // Apply all player updates
    newState = { ...newState, players: effectResult.updatedPlayers };
    if (effectResult.jackpotIncrease > 0) {
        newState = { ...newState, jackpot: (0, jackpotSystem_1.addToJackpot)(newState.jackpot, effectResult.jackpotIncrease) };
    }
    if (effectResult.goToJail) {
        return addLog(setPhase(newState, 'end_turn'), `${player.name} geht ins Gefängnis`);
    }
    if (effectResult.newPosition !== undefined) {
        // Player was moved - resolve their new tile
        const newPos = effectResult.newPosition;
        newState = addLog(newState, `${player.name} bewegt sich zu Position ${newPos}`);
        if (effectResult.landedOnGo) {
            newState = addLog(newState, `${player.name} landet auf Los und erhält ${effectResult.goBonus}€!`);
        }
        else if (effectResult.passedGo) {
            newState = addLog(newState, `${player.name} passiert Los und erhält ${effectResult.goBonus}€`);
        }
        // Resolve the tile we moved to (but skip card tiles to avoid infinite loop)
        const newTile = newState.tiles[newPos];
        if (newTile.type !== 'chance' &&
            newTile.type !== 'community_chest') {
            return resolveLanding(newState, playerId, newPos, diceTotal);
        }
    }
    return setPhase(newState, 'end_turn');
}
function handlePurchasableLanding(state, playerId, position, diceTotal) {
    const player = getPlayer(state, playerId);
    const tile = state.tiles[position];
    const purchasable = tile;
    if (!purchasable.ownerId) {
        // Unowned - offer to buy
        return setPendingAction(state, { type: 'buy_property', tilePosition: position });
    }
    if (purchasable.ownerId === playerId) {
        // Own property - build option (only for property tiles)
        if (tile.type === 'property' && !purchasable.mortgaged) {
            const prop = tile;
            if (prop.houses < 5) {
                return setPendingAction(state, { type: 'build_house', tilePosition: position });
            }
        }
        return setPhase(state, 'end_turn');
    }
    // Owned by another player - pay rent
    if (purchasable.mortgaged) {
        let newState = addLog(state, `${tile.name} ist verpfändet - keine Miete`);
        return setPhase(newState, 'end_turn');
    }
    const rentResult = (0, rentCalculation_1.calculateRent)(tile, player, state.tiles, diceTotal);
    if (!rentResult)
        return setPhase(state, 'end_turn');
    // Auto-pay rent immediately
    return handlePayRent(state, playerId, rentResult.rentAmount, rentResult.ownerId);
}
// ─── Action handlers ─────────────────────────────────────────────────────────
function handleBuyProperty(state, playerId) {
    if (state.currentTurn.playerId !== playerId)
        throw new Error('Not your turn');
    const pending = state.currentTurn.pendingAction;
    if (!pending || pending.type !== 'buy_property')
        throw new Error('No buy pending');
    const player = getPlayer(state, playerId);
    const tile = state.tiles[pending.tilePosition];
    const purchasable = tile;
    if (player.money < purchasable.price) {
        // Cannot afford - go to auction
        return handleDeclineProperty(state, playerId);
    }
    const updatedPlayer = { ...player, money: player.money - purchasable.price };
    const updatedTiles = state.tiles.map((t, i) => i === pending.tilePosition ? { ...t, ownerId: playerId } : t);
    let newState = updatePlayer({ ...state, tiles: updatedTiles }, updatedPlayer);
    newState = addLog(newState, `${player.name} kauft ${tile.name} für ${purchasable.price}€`);
    return checkAndEndTurn(newState, playerId);
}
function handleDeclineProperty(state, playerId) {
    if (state.currentTurn.playerId !== playerId)
        throw new Error('Not your turn');
    const pending = state.currentTurn.pendingAction;
    if (!pending || pending.type !== 'buy_property')
        throw new Error('No buy pending');
    const tile = state.tiles[pending.tilePosition];
    const newState = {
        ...state,
        currentTurn: {
            ...state.currentTurn,
            pendingAction: undefined,
        },
    };
    return checkAndEndTurn(addLog(newState, `${state.players.find(p => p.id === playerId)?.name} überspringt ${tile.name}`), playerId);
}
function handleAuctionBid(state, playerId, amount) {
    if (!state.auction || !state.auction.active)
        throw new Error('No auction in progress');
    if (state.auction.currentBidder !== playerId)
        throw new Error('Not your turn to bid');
    const player = getPlayer(state, playerId);
    const result = (0, auctionSystem_1.processBid)(state.auction, playerId, amount, player);
    if (!result.success)
        throw new Error(result.message);
    let newAuction = result.updatedAuction;
    newAuction = advanceAuction(newAuction, state.players);
    let newState = { ...state, auction: newAuction };
    newState = addLog(newState, `${player.name} bietet ${amount}€`);
    if ((0, auctionSystem_1.shouldEndAuction)(newAuction, state.players.filter((p) => !p.isBankrupt))) {
        return finalizeAuction(newState);
    }
    return newState;
}
function handleAuctionPass(state, playerId) {
    if (!state.auction || !state.auction.active)
        throw new Error('No auction in progress');
    if (state.auction.currentBidder !== playerId)
        throw new Error('Not your turn to bid');
    const player = getPlayer(state, playerId);
    const { updatedAuction } = (0, auctionSystem_1.processPass)(state.auction, playerId);
    const newAuction = advanceAuction(updatedAuction, state.players);
    let newState = { ...state, auction: newAuction };
    newState = addLog(newState, `${player.name} passt bei der Auktion`);
    if ((0, auctionSystem_1.shouldEndAuction)(newAuction, state.players.filter((p) => !p.isBankrupt))) {
        return finalizeAuction(newState);
    }
    return newState;
}
function advanceAuction(auction, players) {
    const activePlayers = players.filter((p) => !p.isBankrupt);
    const nextBidder = (0, auctionSystem_1.getNextBidder)(auction, activePlayers);
    if (nextBidder) {
        return { ...auction, currentBidder: nextBidder };
    }
    return auction;
}
function finalizeAuction(state) {
    if (!state.auction)
        return state;
    const result = (0, auctionSystem_1.resolveAuction)(state.auction, state.players, state.tiles);
    let newState;
    if (result.success && result.updatedPlayers && result.updatedTiles) {
        const { auction: _removed, ...rest } = state;
        newState = {
            ...rest,
            players: result.updatedPlayers,
            tiles: result.updatedTiles,
        };
        newState = addLog(newState, result.message);
    }
    else {
        const { auction: _removed, ...rest } = state;
        newState = { ...rest };
        newState = addLog(newState, result.message);
    }
    return checkAndEndTurn(newState, state.currentTurn.playerId);
}
function handleConfirmAction(state, playerId) {
    if (state.currentTurn.playerId !== playerId)
        throw new Error('Not your turn');
    const pending = state.currentTurn.pendingAction;
    if (!pending)
        return checkAndEndTurn(state, playerId);
    if (pending.type === 'pay_rent') {
        return handlePayRent(state, playerId, pending.amount, pending.toPlayerId);
    }
    if (pending.type === 'pay_tax') {
        return handlePayTax(state, playerId, pending.amount);
    }
    if (pending.type === 'repair_costs') {
        return handlePayRepairs(state, playerId, pending.amount);
    }
    return checkAndEndTurn(state, playerId);
}
function handlePayRent(state, playerId, amount, toPlayerId) {
    const player = getPlayer(state, playerId);
    const toPlayer = getPlayer(state, toPlayerId);
    if (player.money < amount) {
        // Attempt bankruptcy resolution
        return handleBankruptcy(state, playerId, toPlayerId, amount);
    }
    const updatedPayer = { ...player, money: player.money - amount };
    const updatedReceiver = { ...toPlayer, money: toPlayer.money + amount };
    let newState = updatePlayer(state, updatedPayer);
    newState = updatePlayer(newState, updatedReceiver);
    newState = addLog(newState, `${player.name} zahlt ${amount}€ Miete an ${toPlayer.name}`);
    return checkAndEndTurn(newState, playerId);
}
function handlePayTax(state, playerId, amount) {
    const player = getPlayer(state, playerId);
    if (player.money < amount) {
        return handleBankruptcy(state, playerId, undefined, amount);
    }
    const updatedPlayer = { ...player, money: player.money - amount };
    let newState = updatePlayer(state, updatedPlayer);
    newState = { ...newState, jackpot: (0, jackpotSystem_1.addToJackpot)(newState.jackpot, amount) };
    newState = addLog(newState, `${player.name} zahlt ${amount}€ Steuer → Jackpot`);
    return checkAndEndTurn(newState, playerId);
}
function handlePayRepairs(state, playerId, amount) {
    const player = getPlayer(state, playerId);
    if (player.money < amount) {
        return handleBankruptcy(state, playerId, undefined, amount);
    }
    const updatedPlayer = { ...player, money: player.money - amount };
    let newState = updatePlayer(state, updatedPlayer);
    newState = { ...newState, jackpot: (0, jackpotSystem_1.addToJackpot)(newState.jackpot, amount) };
    newState = addLog(newState, `${player.name} zahlt ${amount}€ Reparaturkosten → Jackpot`);
    return checkAndEndTurn(newState, playerId);
}
function handlePayJailFee(state, playerId) {
    if (state.currentTurn.playerId !== playerId)
        throw new Error('Not your turn');
    if (state.currentTurn.phase !== 'waiting_for_roll')
        throw new Error('Wrong phase');
    const player = getPlayer(state, playerId);
    const result = (0, jailSystem_1.payJailFee)(player, state.config.jailBuyoutCost);
    if (!result.success || !result.player)
        throw new Error(result.message);
    let newState = updatePlayer(state, result.player);
    newState = { ...newState, jackpot: (0, jackpotSystem_1.addToJackpot)(newState.jackpot, result.jackpotIncrease ?? 0) };
    newState = addLog(newState, `${player.name} zahlt ${state.config.jailBuyoutCost}€ Kaution → Jackpot`);
    // Player can now roll normally this turn
    return newState;
}
function handleBuildHouse(state, playerId, tilePosition) {
    if (state.currentTurn.playerId !== playerId)
        throw new Error('Not your turn');
    const pending = state.currentTurn.pendingAction;
    if (!pending || pending.type !== 'build_house' || pending.tilePosition !== tilePosition) {
        throw new Error('Cannot build house here now');
    }
    const player = getPlayer(state, playerId);
    const result = (0, propertyManagement_1.buildHouse)(player, tilePosition, state.tiles);
    if (!result.success || !result.updatedPlayer || !result.updatedTiles) {
        throw new Error(result.message);
    }
    let newState = updatePlayer({ ...state, tiles: result.updatedTiles }, result.updatedPlayer);
    newState = addLog(newState, `${player.name}: ${result.message}`);
    return checkAndEndTurn(newState, playerId);
}
function handleDeclineBuild(state, playerId) {
    if (state.currentTurn.playerId !== playerId)
        throw new Error('Not your turn');
    return checkAndEndTurn(state, playerId);
}
function handleMortgageProperty(state, playerId, tilePosition) {
    const player = getPlayer(state, playerId);
    const result = (0, propertyManagement_1.mortgageProperty)(player, tilePosition, state.tiles);
    if (!result.success || !result.updatedPlayer || !result.updatedTiles) {
        throw new Error(result.message);
    }
    let newState = updatePlayer({ ...state, tiles: result.updatedTiles }, result.updatedPlayer);
    const tile = state.tiles[tilePosition];
    return addLog(newState, `${player.name} verpfändet ${tile.name}: ${result.message}`);
}
function handleUnmortgageProperty(state, playerId, tilePosition) {
    const player = getPlayer(state, playerId);
    const result = (0, propertyManagement_1.unmortgageProperty)(player, tilePosition, state.tiles, state.config.mortgageInterestRate);
    if (!result.success || !result.updatedPlayer || !result.updatedTiles) {
        throw new Error(result.message);
    }
    let newState = updatePlayer({ ...state, tiles: result.updatedTiles }, result.updatedPlayer);
    const tile = state.tiles[tilePosition];
    return addLog(newState, `${player.name} löst ${tile.name} aus: ${result.message}`);
}
function handleSellHouse(state, playerId, tilePosition) {
    const player = getPlayer(state, playerId);
    const result = (0, propertyManagement_1.sellHouse)(player, tilePosition, state.tiles);
    if (!result.success || !result.updatedPlayer || !result.updatedTiles) {
        throw new Error(result.message);
    }
    let newState = updatePlayer({ ...state, tiles: result.updatedTiles }, result.updatedPlayer);
    const tile = state.tiles[tilePosition];
    return addLog(newState, `${player.name} verkauft Haus auf ${tile.name}: ${result.message}`);
}
function handleProposeTrade(state, fromPlayerId, toPlayerId, offerMoney, offerProperties, requestMoney, requestProperties) {
    const offer = (0, tradeSystem_1.createTradeOffer)(fromPlayerId, toPlayerId, offerMoney, offerProperties, requestMoney, requestProperties);
    const validation = (0, tradeSystem_1.validateTrade)(offer, state.players, state.tiles);
    if (!validation.valid)
        throw new Error(validation.message);
    const fromPlayer = getPlayer(state, fromPlayerId);
    const toPlayer = getPlayer(state, toPlayerId);
    let newState = { ...state, pendingTrades: [...state.pendingTrades, offer] };
    return addLog(newState, `${fromPlayer.name} schlägt einen Handel mit ${toPlayer.name} vor`);
}
function handleAcceptTrade(state, playerId, tradeId) {
    const offer = state.pendingTrades.find((t) => t.id === tradeId);
    if (!offer)
        throw new Error('Trade not found');
    if (offer.toPlayerId !== playerId)
        throw new Error('Not your trade to accept');
    const result = (0, tradeSystem_1.executeTrade)(offer, state.players, state.tiles);
    if (!result.success || !result.updatedPlayers || !result.updatedTiles) {
        throw new Error(result.message);
    }
    const newState = {
        ...state,
        players: result.updatedPlayers,
        tiles: result.updatedTiles,
        pendingTrades: state.pendingTrades.filter((t) => t.id !== tradeId),
    };
    return addLog(newState, result.message);
}
function handleRejectTrade(state, playerId, tradeId) {
    const offer = state.pendingTrades.find((t) => t.id === tradeId);
    if (!offer)
        throw new Error('Trade not found');
    if (offer.toPlayerId !== playerId)
        throw new Error('Not your trade to reject');
    const fromPlayer = getPlayer(state, offer.fromPlayerId);
    const newState = {
        ...state,
        pendingTrades: state.pendingTrades.filter((t) => t.id !== tradeId),
    };
    return addLog(newState, `${getPlayer(state, playerId).name} lehnt den Handel mit ${fromPlayer.name} ab`);
}
function handleEndTurn(state, playerId) {
    if (state.currentTurn.playerId !== playerId)
        throw new Error('Not your turn');
    if (state.currentTurn.phase !== 'end_turn' && state.currentTurn.phase !== 'waiting_for_roll') {
        throw new Error('Cannot end turn now');
    }
    return advanceTurn(state, playerId);
}
// ─── Bankruptcy handling ──────────────────────────────────────────────────────
function handleBankruptcy(state, bankruptPlayerId, creditorId, debtAmount) {
    const player = getPlayer(state, bankruptPlayerId);
    let newState = addLog(state, `${player.name} ist bankrott!`);
    if (creditorId) {
        const creditor = getPlayer(state, creditorId);
        const result = (0, propertyManagement_1.transferAllAssets)(player, creditor, state.tiles);
        newState = {
            ...newState,
            players: newState.players.map((p) => {
                if (p.id === bankruptPlayerId)
                    return result.updatedFromPlayer;
                if (p.id === creditorId)
                    return result.updatedToPlayer;
                return p;
            }),
            tiles: result.updatedTiles,
        };
        newState = addLog(newState, `Alle Besitztümer von ${player.name} gehen an ${creditor.name}`);
    }
    else {
        const result = (0, propertyManagement_1.releaseAssetsToBank)(player, state.tiles);
        newState = updatePlayer({ ...newState, tiles: result.updatedTiles }, result.updatedPlayer);
        newState = addLog(newState, `Alle Besitztümer von ${player.name} werden versteigert`);
    }
    // Check if game should end
    const winner = (0, winCondition_1.checkLastPlayerStanding)(newState.players);
    if (winner) {
        return addLog({ ...newState, gamePhase: 'finished', winner: winner.id }, `${winner.name} hat gewonnen - alle anderen Spieler sind bankrott!`);
    }
    return advanceTurn(newState, bankruptPlayerId);
}
// ─── Turn advancement ─────────────────────────────────────────────────────────
function checkAndEndTurn(state, playerId) {
    // Check win condition
    const winner = (0, winCondition_1.checkWinCondition)(state.players, state.tiles, state.config.winConditionNetWorth);
    if (winner) {
        return addLog({ ...state, gamePhase: 'finished', winner: winner.id }, `${winner.name} hat gewonnen mit einem Nettovermögen von ${(0, propertyManagement_1.calculateNetWorth)(winner, state.tiles)}€!`);
    }
    // Set phase to end_turn
    let newState = setPhase(state, 'end_turn');
    // If doubles were rolled and player isn't in jail, don't auto-advance
    if (newState.currentTurn.mustRollAgain) {
        const currentPlayer = getPlayer(newState, playerId);
        if (!currentPlayer.isBankrupt && !currentPlayer.inJail) {
            return {
                ...newState,
                currentTurn: {
                    ...newState.currentTurn,
                    phase: 'waiting_for_roll',
                    pendingAction: undefined,
                    mustRollAgain: false,
                },
            };
        }
    }
    return newState;
}
function advanceTurn(state, currentPlayerId) {
    if (state.gamePhase === 'finished')
        return state;
    const nextPlayerId = (0, turnManager_1.advanceToNextPlayer)(currentPlayerId, state.players);
    return {
        ...state,
        currentTurn: (0, turnManager_1.createInitialTurnState)(nextPlayerId),
    };
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPlayer(state, playerId) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player)
        throw new Error(`Player ${playerId} not found`);
    return player;
}
function updatePlayer(state, player) {
    return {
        ...state,
        players: state.players.map((p) => (p.id === player.id ? player : p)),
    };
}
function setPhase(state, phase) {
    return {
        ...state,
        currentTurn: { ...state.currentTurn, phase, pendingAction: undefined },
    };
}
function setPendingAction(state, action) {
    return {
        ...state,
        currentTurn: {
            ...state.currentTurn,
            phase: action.type === 'build_house' ? 'build_option' :
                action.type === 'buy_property' ? 'buy_or_auction' :
                    'tile_action',
            pendingAction: action,
        },
    };
}
function addLog(state, message) {
    const log = [...state.eventLog, message];
    return { ...state, eventLog: log.slice(-50) }; // keep last 50 events
}
//# sourceMappingURL=gameEngine.js.map