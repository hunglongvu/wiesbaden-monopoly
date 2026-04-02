import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Tile,
  TurnState,
  PendingAction,
  PropertyTile,
  RailroadTile,
  UtilityTile,
  Auction,
  TradeOffer,
  ActionCard,
} from './types';
import { BOARD_TILES, DEFAULT_CONFIG } from '../config/board.config';
import { rollDice, DiceRoll } from './dice';
import { calculateMovement, movePlayerTo, findNearestRailroad, moveBack } from './movement';
import { resolveTileLanding } from './tileResolver';
import { calculateRent } from './rentCalculation';
import {
  buildHouse,
  mortgageProperty,
  unmortgageProperty,
  sellHouse,
  calculateNetWorth,
  transferAllAssets,
  releaseAssetsToBank,
} from './propertyManagement';
import { sendToJail, payJailFee, processJailRoll } from './jailSystem';
import { addToJackpot, collectJackpot, createJackpot } from './jackpotSystem';
import { createDeck, drawCard, applyCardEffect } from './cardSystem';
import {
  startAuction,
  processBid,
  processPass,
  getNextBidder,
  shouldEndAuction,
  resolveAuction,
} from './auctionSystem';
import {
  createTradeOffer,
  validateTrade,
  executeTrade,
  rejectTrade,
} from './tradeSystem';
import { checkWinCondition, checkLastPlayerStanding } from './winCondition';
import { advanceToNextPlayer, createInitialTurnState } from './turnManager';

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

export function createGame(): GameState {
  const tiles = BOARD_TILES.map((t) => ({ ...t })) as Tile[];

  return {
    id: uuidv4(),
    players: [],
    tiles,
    currentTurn: {
      playerId: '',
      phase: 'waiting_for_roll',
      doublesCount: 0,
      mustRollAgain: false,
    },
    jackpot: createJackpot(),
    pendingTrades: [],
    gamePhase: 'lobby',
    eventLog: [],
    chanceDeck: createDeck('chance'),
    communityChestDeck: createDeck('community_chest'),
    config: { ...DEFAULT_CONFIG },
  };
}

export function addPlayer(state: GameState, playerId: string, playerName: string): GameState {
  if (state.players.length >= 4) {
    throw new Error('Game is full (max 4 players)');
  }
  if (state.gamePhase !== 'lobby') {
    throw new Error('Game already started');
  }
  if (state.players.find((p) => p.id === playerId)) {
    throw new Error('Player already in game');
  }

  const newPlayer: Player = {
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

export function startGame(state: GameState): GameState {
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
    currentTurn: createInitialTurnState(firstPlayer.id),
  }, `Spiel gestartet! ${firstPlayer.name} beginnt.`);
}

// ─── Main action handlers ────────────────────────────────────────────────────

export function handleRollDice(state: GameState, playerId: string): GameState {
  if (state.gamePhase !== 'playing') throw new Error('Game not in progress');
  if (state.currentTurn.playerId !== playerId) throw new Error('Not your turn');
  if (state.currentTurn.phase !== 'waiting_for_roll') {
    throw new Error('Cannot roll dice now');
  }

  const player = getPlayer(state, playerId);
  const dice = rollDice();

  // ── In-jail roll ──
  if (player.inJail) {
    return handleJailRoll(state, player, dice);
  }

  // ── Normal roll ──
  return handleNormalRoll(state, player, dice);
}

function handleJailRoll(state: GameState, player: Player, dice: DiceRoll): GameState {
  const result = processJailRoll(
    player,
    dice.die1,
    dice.die2,
    state.config.jailBuyoutCost,
    state.config.maxJailTurns
  );

  let newState = updatePlayer(state, result.player);

  if (result.jackpotIncrease > 0) {
    newState = { ...newState, jackpot: addToJackpot(newState.jackpot, result.jackpotIncrease) };
  }

  newState = addLog(newState, result.message);

  if (!result.exitJail) {
    // Stay in jail - end turn
    const nextPlayerId = advanceToNextPlayer(player.id, newState.players);
    newState = {
      ...newState,
      currentTurn: {
        ...createInitialTurnState(nextPlayerId),
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

function handleNormalRoll(state: GameState, player: Player, dice: DiceRoll): GameState {
  let newDoublesCount = state.currentTurn.doublesCount;

  if (dice.isDoubles) {
    newDoublesCount += 1;

    // 3 consecutive doubles → jail
    if (newDoublesCount >= 3) {
      const jailedPlayer = sendToJail(player, state.config.jailPosition);
      let newState = updatePlayer(state, jailedPlayer);
      newState = addLog(newState, `${player.name} würfelt zum dritten Mal Pasch - ins Gefängnis!`);
      const nextPlayerId = advanceToNextPlayer(player.id, newState.players);
      return {
        ...newState,
        currentTurn: createInitialTurnState(nextPlayerId),
      };
    }
  } else {
    newDoublesCount = 0;
    // Reset consecutive doubles on player
    const updatedPlayer: Player = { ...player, consecutiveDoubles: 0 };
    state = updatePlayer(state, updatedPlayer);
  }

  let newState = {
    ...state,
    currentTurn: {
      ...state.currentTurn,
      diceRoll: [dice.die1, dice.die2] as [number, number],
      isDoubles: dice.isDoubles,
      doublesCount: newDoublesCount,
      mustRollAgain: dice.isDoubles,
      phase: 'moving' as const,
    },
  };

  return applyMovement(newState, player.id, dice.total, dice.total);
}

function applyMovement(state: GameState, playerId: string, steps: number, diceTotal: number): GameState {
  const player = getPlayer(state, playerId);
  const movement = calculateMovement(
    player.position,
    steps,
    false,
    state.config
  );

  let updatedPlayer: Player = {
    ...player,
    position: movement.newPosition,
    money: player.money + movement.goBonus,
  };

  let newState = updatePlayer(state, updatedPlayer);

  if (movement.landedOnGo) {
    newState = addLog(newState, `${player.name} landet auf Los und erhält ${movement.goBonus}€!`);
  } else if (movement.passedGo) {
    newState = addLog(newState, `${player.name} passiert Los und erhält ${movement.goBonus}€`);
  }

  // Resolve tile landing
  return resolveLanding(newState, updatedPlayer.id, movement.newPosition, diceTotal);
}

function resolveLanding(state: GameState, playerId: string, position: number, diceTotal: number): GameState {
  const player = getPlayer(state, playerId);
  const tile = state.tiles[position];

  // Handle go_to_jail first
  if (tile.type === 'go_to_jail') {
    const jailedPlayer = sendToJail(player, state.config.jailPosition);
    let newState = updatePlayer(state, jailedPlayer);
    newState = addLog(newState, `${player.name} muss ins Gefängnis!`);
    const nextPlayerId = advanceToNextPlayer(playerId, newState.players);
    return { ...newState, currentTurn: createInitialTurnState(nextPlayerId) };
  }

  // Free parking - collect jackpot
  if (tile.type === 'free_parking') {
    const { amount, newJackpot } = collectJackpot(state.jackpot);
    let updatedPlayer = getPlayer(state, playerId);
    updatedPlayer = { ...updatedPlayer, money: updatedPlayer.money + amount };
    let newState = updatePlayer({ ...state, jackpot: newJackpot }, updatedPlayer);
    newState = addLog(newState, `${player.name} landet auf Freiparken und erhält den Jackpot: ${amount}€!`);
    return setPhase(newState, 'end_turn');
  }

  // Tax
  if (tile.type === 'tax') {
    const taxTile = tile as any;
    const amount = taxTile.amount as number;
    const updatedPlayer = { ...player, money: player.money - amount };
    let newState = updatePlayer(state, updatedPlayer);
    newState = { ...newState, jackpot: addToJackpot(newState.jackpot, amount) };
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

function handleCardDraw(
  state: GameState,
  playerId: string,
  deckType: 'chance' | 'community_chest',
  diceTotal: number
): GameState {
  const deck = deckType === 'chance' ? state.chanceDeck : state.communityChestDeck;
  const drawn = drawCard(deck);
  if (!drawn) return setPhase(state, 'end_turn');

  const { card, remainingDeck } = drawn;

  let newState = deckType === 'chance'
    ? { ...state, chanceDeck: remainingDeck }
    : { ...state, communityChestDeck: remainingDeck };

  newState = addLog(newState, `${getPlayer(state, playerId).name} zieht: "${card.text}"`);
  newState = { ...newState, lastCardEvent: { card, drawnBy: playerId } };

  const player = getPlayer(newState, playerId);
  const effectResult = applyCardEffect(
    card,
    player,
    newState.players,
    newState.tiles,
    newState.config
  );

  // Apply all player updates
  newState = { ...newState, players: effectResult.updatedPlayers };

  if (effectResult.jackpotIncrease > 0) {
    newState = { ...newState, jackpot: addToJackpot(newState.jackpot, effectResult.jackpotIncrease) };
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
    } else if (effectResult.passedGo) {
      newState = addLog(newState, `${player.name} passiert Los und erhält ${effectResult.goBonus}€`);
    }

    // Resolve the tile we moved to (but skip card tiles to avoid infinite loop)
    const newTile = newState.tiles[newPos];
    if (
      newTile.type !== 'chance' &&
      newTile.type !== 'community_chest'
    ) {
      return resolveLanding(newState, playerId, newPos, diceTotal);
    }
  }

  return setPhase(newState, 'end_turn');
}

function handlePurchasableLanding(
  state: GameState,
  playerId: string,
  position: number,
  diceTotal: number
): GameState {
  const player = getPlayer(state, playerId);
  const tile = state.tiles[position];
  const purchasable = tile as PropertyTile | RailroadTile | UtilityTile;

  if (!purchasable.ownerId) {
    // Unowned - offer to buy
    return setPendingAction(state, { type: 'buy_property', tilePosition: position });
  }

  if (purchasable.ownerId === playerId) {
    // Own property - build option (only for property tiles)
    if (tile.type === 'property' && !purchasable.mortgaged) {
      const prop = tile as PropertyTile;
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

  const rentResult = calculateRent(tile, player, state.tiles, diceTotal);
  if (!rentResult) return setPhase(state, 'end_turn');

  return setPendingAction(state, {
    type: 'pay_rent',
    amount: rentResult.rentAmount,
    toPlayerId: rentResult.ownerId,
    tilePosition: position,
  });
}

// ─── Action handlers ─────────────────────────────────────────────────────────

export function handleBuyProperty(state: GameState, playerId: string): GameState {
  if (state.currentTurn.playerId !== playerId) throw new Error('Not your turn');

  const pending = state.currentTurn.pendingAction;
  if (!pending || pending.type !== 'buy_property') throw new Error('No buy pending');

  const player = getPlayer(state, playerId);
  const tile = state.tiles[pending.tilePosition];
  const purchasable = tile as PropertyTile | RailroadTile | UtilityTile;

  if (player.money < purchasable.price) {
    // Cannot afford - go to auction
    return handleDeclineProperty(state, playerId);
  }

  const updatedPlayer: Player = { ...player, money: player.money - purchasable.price };
  const updatedTiles = state.tiles.map((t, i) =>
    i === pending.tilePosition ? { ...t, ownerId: playerId } as Tile : t
  );

  let newState = updatePlayer({ ...state, tiles: updatedTiles }, updatedPlayer);
  newState = addLog(newState, `${player.name} kauft ${tile.name} für ${purchasable.price}€`);

  return checkAndEndTurn(newState, playerId);
}

export function handleDeclineProperty(state: GameState, playerId: string): GameState {
  if (state.currentTurn.playerId !== playerId) throw new Error('Not your turn');

  const pending = state.currentTurn.pendingAction;
  if (!pending || pending.type !== 'buy_property') throw new Error('No buy pending');

  const tile = state.tiles[pending.tilePosition];
  const newState = {
    ...state,
    currentTurn: {
      ...state.currentTurn,
      pendingAction: undefined,
    },
  };

  return checkAndEndTurn(
    addLog(newState, `${state.players.find(p => p.id === playerId)?.name} überspringt ${tile.name}`),
    playerId
  );
}

export function handleAuctionBid(state: GameState, playerId: string, amount: number): GameState {
  if (!state.auction || !state.auction.active) throw new Error('No auction in progress');
  if (state.auction.currentBidder !== playerId) throw new Error('Not your turn to bid');

  const player = getPlayer(state, playerId);
  const result = processBid(state.auction, playerId, amount, player);

  if (!result.success) throw new Error(result.message);

  let newAuction = result.updatedAuction!;
  newAuction = advanceAuction(newAuction, state.players);

  let newState: GameState = { ...state, auction: newAuction };
  newState = addLog(newState, `${player.name} bietet ${amount}€`);

  if (shouldEndAuction(newAuction, state.players.filter((p) => !p.isBankrupt))) {
    return finalizeAuction(newState);
  }

  return newState;
}

export function handleAuctionPass(state: GameState, playerId: string): GameState {
  if (!state.auction || !state.auction.active) throw new Error('No auction in progress');
  if (state.auction.currentBidder !== playerId) throw new Error('Not your turn to bid');

  const player = getPlayer(state, playerId);
  const { updatedAuction } = processPass(state.auction, playerId);
  const newAuction = advanceAuction(updatedAuction, state.players);

  let newState: GameState = { ...state, auction: newAuction };
  newState = addLog(newState, `${player.name} passt bei der Auktion`);

  if (shouldEndAuction(newAuction, state.players.filter((p) => !p.isBankrupt))) {
    return finalizeAuction(newState);
  }

  return newState;
}

function advanceAuction(auction: Auction, players: Player[]): Auction {
  const activePlayers = players.filter((p) => !p.isBankrupt);
  const nextBidder = getNextBidder(auction, activePlayers);
  if (nextBidder) {
    return { ...auction, currentBidder: nextBidder };
  }
  return auction;
}

function finalizeAuction(state: GameState): GameState {
  if (!state.auction) return state;

  const result = resolveAuction(state.auction, state.players, state.tiles);

  let newState: GameState;

  if (result.success && result.updatedPlayers && result.updatedTiles) {
    const { auction: _removed, ...rest } = state;
    newState = {
      ...rest,
      players: result.updatedPlayers,
      tiles: result.updatedTiles,
    };
    newState = addLog(newState, result.message);
  } else {
    const { auction: _removed, ...rest } = state;
    newState = { ...rest };
    newState = addLog(newState, result.message);
  }

  return checkAndEndTurn(newState, state.currentTurn.playerId);
}

export function handleConfirmAction(state: GameState, playerId: string): GameState {
  if (state.currentTurn.playerId !== playerId) throw new Error('Not your turn');

  const pending = state.currentTurn.pendingAction;
  if (!pending) return checkAndEndTurn(state, playerId);

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

function handlePayRent(
  state: GameState,
  playerId: string,
  amount: number,
  toPlayerId: string
): GameState {
  const player = getPlayer(state, playerId);
  const toPlayer = getPlayer(state, toPlayerId);

  if (player.money < amount) {
    // Attempt bankruptcy resolution
    return handleBankruptcy(state, playerId, toPlayerId, amount);
  }

  const updatedPayer: Player = { ...player, money: player.money - amount };
  const updatedReceiver: Player = { ...toPlayer, money: toPlayer.money + amount };

  let newState = updatePlayer(state, updatedPayer);
  newState = updatePlayer(newState, updatedReceiver);
  newState = addLog(newState, `${player.name} zahlt ${amount}€ Miete an ${toPlayer.name}`);

  return checkAndEndTurn(newState, playerId);
}

function handlePayTax(state: GameState, playerId: string, amount: number): GameState {
  const player = getPlayer(state, playerId);

  if (player.money < amount) {
    return handleBankruptcy(state, playerId, undefined, amount);
  }

  const updatedPlayer: Player = { ...player, money: player.money - amount };
  let newState = updatePlayer(state, updatedPlayer);
  newState = { ...newState, jackpot: addToJackpot(newState.jackpot, amount) };
  newState = addLog(newState, `${player.name} zahlt ${amount}€ Steuer → Jackpot`);

  return checkAndEndTurn(newState, playerId);
}

function handlePayRepairs(state: GameState, playerId: string, amount: number): GameState {
  const player = getPlayer(state, playerId);

  if (player.money < amount) {
    return handleBankruptcy(state, playerId, undefined, amount);
  }

  const updatedPlayer: Player = { ...player, money: player.money - amount };
  let newState = updatePlayer(state, updatedPlayer);
  newState = { ...newState, jackpot: addToJackpot(newState.jackpot, amount) };
  newState = addLog(newState, `${player.name} zahlt ${amount}€ Reparaturkosten → Jackpot`);

  return checkAndEndTurn(newState, playerId);
}

export function handlePayJailFee(state: GameState, playerId: string): GameState {
  if (state.currentTurn.playerId !== playerId) throw new Error('Not your turn');
  if (state.currentTurn.phase !== 'waiting_for_roll') throw new Error('Wrong phase');

  const player = getPlayer(state, playerId);
  const result = payJailFee(player, state.config.jailBuyoutCost);

  if (!result.success || !result.player) throw new Error(result.message);

  let newState = updatePlayer(state, result.player);
  newState = { ...newState, jackpot: addToJackpot(newState.jackpot, result.jackpotIncrease ?? 0) };
  newState = addLog(newState, `${player.name} zahlt ${state.config.jailBuyoutCost}€ Kaution → Jackpot`);

  // Player can now roll normally this turn
  return newState;
}

export function handleBuildHouse(state: GameState, playerId: string, tilePosition: number): GameState {
  if (state.currentTurn.playerId !== playerId) throw new Error('Not your turn');

  const pending = state.currentTurn.pendingAction;
  if (!pending || pending.type !== 'build_house' || pending.tilePosition !== tilePosition) {
    throw new Error('Cannot build house here now');
  }

  const player = getPlayer(state, playerId);
  const result = buildHouse(player, tilePosition, state.tiles);

  if (!result.success || !result.updatedPlayer || !result.updatedTiles) {
    throw new Error(result.message);
  }

  let newState = updatePlayer({ ...state, tiles: result.updatedTiles }, result.updatedPlayer);
  newState = addLog(newState, `${player.name}: ${result.message}`);

  return checkAndEndTurn(newState, playerId);
}

export function handleDeclineBuild(state: GameState, playerId: string): GameState {
  if (state.currentTurn.playerId !== playerId) throw new Error('Not your turn');
  return checkAndEndTurn(state, playerId);
}

export function handleMortgageProperty(state: GameState, playerId: string, tilePosition: number): GameState {
  const player = getPlayer(state, playerId);
  const result = mortgageProperty(player, tilePosition, state.tiles);

  if (!result.success || !result.updatedPlayer || !result.updatedTiles) {
    throw new Error(result.message);
  }

  let newState = updatePlayer({ ...state, tiles: result.updatedTiles }, result.updatedPlayer);
  const tile = state.tiles[tilePosition];
  return addLog(newState, `${player.name} verpfändet ${tile.name}: ${result.message}`);
}

export function handleUnmortgageProperty(state: GameState, playerId: string, tilePosition: number): GameState {
  const player = getPlayer(state, playerId);
  const result = unmortgageProperty(player, tilePosition, state.tiles, state.config.mortgageInterestRate);

  if (!result.success || !result.updatedPlayer || !result.updatedTiles) {
    throw new Error(result.message);
  }

  let newState = updatePlayer({ ...state, tiles: result.updatedTiles }, result.updatedPlayer);
  const tile = state.tiles[tilePosition];
  return addLog(newState, `${player.name} löst ${tile.name} aus: ${result.message}`);
}

export function handleSellHouse(state: GameState, playerId: string, tilePosition: number): GameState {
  const player = getPlayer(state, playerId);
  const result = sellHouse(player, tilePosition, state.tiles);

  if (!result.success || !result.updatedPlayer || !result.updatedTiles) {
    throw new Error(result.message);
  }

  let newState = updatePlayer({ ...state, tiles: result.updatedTiles }, result.updatedPlayer);
  const tile = state.tiles[tilePosition];
  return addLog(newState, `${player.name} verkauft Haus auf ${tile.name}: ${result.message}`);
}

export function handleProposeTrade(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
  offerMoney: number,
  offerProperties: number[],
  requestMoney: number,
  requestProperties: number[]
): GameState {
  const offer = createTradeOffer(
    fromPlayerId,
    toPlayerId,
    offerMoney,
    offerProperties,
    requestMoney,
    requestProperties
  );

  const validation = validateTrade(offer, state.players, state.tiles);
  if (!validation.valid) throw new Error(validation.message);

  const fromPlayer = getPlayer(state, fromPlayerId);
  const toPlayer = getPlayer(state, toPlayerId);

  let newState = { ...state, pendingTrades: [...state.pendingTrades, offer] };
  return addLog(newState, `${fromPlayer.name} schlägt einen Handel mit ${toPlayer.name} vor`);
}

export function handleAcceptTrade(state: GameState, playerId: string, tradeId: string): GameState {
  const offer = state.pendingTrades.find((t) => t.id === tradeId);
  if (!offer) throw new Error('Trade not found');
  if (offer.toPlayerId !== playerId) throw new Error('Not your trade to accept');

  const result = executeTrade(offer, state.players, state.tiles);
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

export function handleRejectTrade(state: GameState, playerId: string, tradeId: string): GameState {
  const offer = state.pendingTrades.find((t) => t.id === tradeId);
  if (!offer) throw new Error('Trade not found');
  if (offer.toPlayerId !== playerId) throw new Error('Not your trade to reject');

  const fromPlayer = getPlayer(state, offer.fromPlayerId);
  const newState = {
    ...state,
    pendingTrades: state.pendingTrades.filter((t) => t.id !== tradeId),
  };

  return addLog(newState, `${getPlayer(state, playerId).name} lehnt den Handel mit ${fromPlayer.name} ab`);
}

export function handleEndTurn(state: GameState, playerId: string): GameState {
  if (state.currentTurn.playerId !== playerId) throw new Error('Not your turn');
  if (state.currentTurn.phase !== 'end_turn' && state.currentTurn.phase !== 'waiting_for_roll') {
    throw new Error('Cannot end turn now');
  }

  return advanceTurn(state, playerId);
}

// ─── Bankruptcy handling ──────────────────────────────────────────────────────

function handleBankruptcy(
  state: GameState,
  bankruptPlayerId: string,
  creditorId: string | undefined,
  debtAmount: number
): GameState {
  const player = getPlayer(state, bankruptPlayerId);
  let newState = addLog(state, `${player.name} ist bankrott!`);

  if (creditorId) {
    const creditor = getPlayer(state, creditorId);
    const result = transferAllAssets(player, creditor, state.tiles);
    newState = {
      ...newState,
      players: newState.players.map((p) => {
        if (p.id === bankruptPlayerId) return result.updatedFromPlayer;
        if (p.id === creditorId) return result.updatedToPlayer;
        return p;
      }),
      tiles: result.updatedTiles,
    };
    newState = addLog(newState, `Alle Besitztümer von ${player.name} gehen an ${creditor.name}`);
  } else {
    const result = releaseAssetsToBank(player, state.tiles);
    newState = updatePlayer({ ...newState, tiles: result.updatedTiles }, result.updatedPlayer);
    newState = addLog(newState, `Alle Besitztümer von ${player.name} werden versteigert`);
  }

  // Check if game should end
  const winner = checkLastPlayerStanding(newState.players);
  if (winner) {
    return addLog({ ...newState, gamePhase: 'finished', winner: winner.id },
      `${winner.name} hat gewonnen - alle anderen Spieler sind bankrott!`);
  }

  return advanceTurn(newState, bankruptPlayerId);
}

// ─── Turn advancement ─────────────────────────────────────────────────────────

function checkAndEndTurn(state: GameState, playerId: string): GameState {
  // Check win condition
  const winner = checkWinCondition(
    state.players,
    state.tiles,
    state.config.winConditionNetWorth
  );

  if (winner) {
    return addLog(
      { ...state, gamePhase: 'finished', winner: winner.id },
      `${winner.name} hat gewonnen mit einem Nettovermögen von ${calculateNetWorth(winner, state.tiles)}€!`
    );
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

function advanceTurn(state: GameState, currentPlayerId: string): GameState {
  if (state.gamePhase === 'finished') return state;

  const nextPlayerId = advanceToNextPlayer(currentPlayerId, state.players);
  return {
    ...state,
    currentTurn: createInitialTurnState(nextPlayerId),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);
  return player;
}

function updatePlayer(state: GameState, player: Player): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === player.id ? player : p)),
  };
}

function setPhase(state: GameState, phase: TurnState['phase']): GameState {
  return {
    ...state,
    currentTurn: { ...state.currentTurn, phase, pendingAction: undefined },
  };
}

function setPendingAction(state: GameState, action: PendingAction): GameState {
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

function addLog(state: GameState, message: string): GameState {
  const log = [...state.eventLog, message];
  return { ...state, eventLog: log.slice(-50) }; // keep last 50 events
}
