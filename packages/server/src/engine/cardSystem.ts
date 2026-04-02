import { v4 as uuidv4 } from 'uuid';
import { ActionCard, Player, GameState, Tile, PropertyTile } from './types';
import { COMMUNITY_CHEST_CARDS, CHANCE_CARDS } from '../config/cards.config';
import { sendToJail } from './jailSystem';
import { movePlayerTo, findNearestRailroad, moveBack } from './movement';

/**
 * Create and shuffle a deck of cards.
 */
export function createDeck(deckType: 'chance' | 'community_chest'): ActionCard[] {
  const templates = deckType === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
  const deck: ActionCard[] = templates.map((card) => ({
    ...card,
    id: uuidv4(),
  }));
  return shuffleDeck(deck);
}

/**
 * Shuffle a deck using Fisher-Yates algorithm.
 */
export function shuffleDeck(deck: ActionCard[]): ActionCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draw the top card from a deck.
 * Returns the card and the remaining deck (card goes to bottom).
 */
export function drawCard(
  deck: ActionCard[]
): { card: ActionCard; remainingDeck: ActionCard[] } | null {
  if (deck.length === 0) return null;
  const [card, ...rest] = deck;
  return { card, remainingDeck: [...rest, card] }; // card cycles to bottom
}

export interface CardEffectResult {
  updatedPlayer: Player;
  updatedPlayers: Player[];
  updatedTiles: Tile[];
  jackpotIncrease: number;
  goToJail: boolean;
  newPosition?: number;
  passedGo: boolean;
  landedOnGo: boolean;
  goBonus: number;
  message: string;
}

/**
 * Apply a card's effect to the game state.
 */
export function applyCardEffect(
  card: ActionCard,
  player: Player,
  allPlayers: Player[],
  tiles: Tile[],
  config: {
    jailPosition: number;
    goPassReward: number;
    goLandReward: number;
    goPosition: number;
  }
): CardEffectResult {
  let updatedPlayer = { ...player };
  let updatedPlayers = allPlayers.map((p) => ({ ...p }));
  const updatedTiles = [...tiles];
  let jackpotIncrease = 0;
  let goToJail = false;
  let newPosition: number | undefined;
  let passedGo = false;
  let landedOnGo = false;
  let goBonus = 0;
  let message = card.text;

  switch (card.type) {
    case 'collect_from_bank': {
      const amount = card.amount ?? 0;
      updatedPlayer.money += amount;
      message = `${card.text} (+${amount}€)`;
      break;
    }

    case 'pay_to_jackpot': {
      const amount = card.amount ?? 0;
      updatedPlayer.money -= amount;
      jackpotIncrease = amount;
      message = `${card.text} (-${amount}€ → Jackpot)`;
      break;
    }

    case 'collect_from_players': {
      const amount = card.amount ?? 0;
      const otherPlayers = updatedPlayers.filter(
        (p) => p.id !== player.id && !p.isBankrupt
      );
      let totalCollected = 0;
      updatedPlayers = updatedPlayers.map((p) => {
        if (p.id !== player.id && !p.isBankrupt) {
          const pay = Math.min(p.money, amount);
          totalCollected += pay;
          return { ...p, money: p.money - pay };
        }
        return p;
      });
      // Update the current player in updatedPlayers too
      updatedPlayer.money += totalCollected;
      updatedPlayers = updatedPlayers.map((p) =>
        p.id === player.id ? { ...updatedPlayer } : p
      );
      message = `${card.text} (+${totalCollected}€)`;
      break;
    }

    case 'move_to': {
      const targetPos = card.position ?? 0;
      const isGoCard =
        card.deckType === 'community_chest' && targetPos === 0;

      if (isGoCard) {
        // Community chest "Go to GO" → exact landing (400€)
        const result = movePlayerTo(
          updatedPlayer,
          targetPos,
          config,
          true // exact landing
        );
        updatedPlayer = result.player;
        newPosition = result.movement.newPosition;
        passedGo = result.movement.passedGo;
        landedOnGo = result.movement.landedOnGo;
        goBonus = result.movement.goBonus;
      } else {
        // Other move_to cards: check if passing GO
        const result = movePlayerTo(updatedPlayer, targetPos, config, false);
        updatedPlayer = result.player;
        newPosition = result.movement.newPosition;
        passedGo = result.movement.passedGo;
        landedOnGo = result.movement.landedOnGo;
        goBonus = result.movement.goBonus;
      }
      break;
    }

    case 'move_back': {
      const spaces = card.spaces ?? 3;
      const pos = moveBack(updatedPlayer.position, spaces);
      updatedPlayer.position = pos;
      newPosition = pos;
      // No GO bonus for moving backward
      break;
    }

    case 'go_to_jail': {
      updatedPlayer = sendToJail(updatedPlayer, config.jailPosition);
      goToJail = true;
      newPosition = config.jailPosition;
      break;
    }

    case 'repair_costs': {
      const houseCost = card.houseCost ?? 0;
      const hotelCost = card.hotelCost ?? 0;
      let total = 0;

      for (const tile of tiles) {
        if (tile.type === 'property') {
          const prop = tile as PropertyTile;
          if (prop.ownerId === player.id) {
            if (prop.houses === 5) {
              total += hotelCost;
            } else {
              total += prop.houses * houseCost;
            }
          }
        }
      }

      updatedPlayer.money -= total;
      jackpotIncrease = total;
      message = `${card.text} (-${total}€ → Jackpot)`;
      break;
    }

    case 'move_to_nearest_railroad': {
      const nearestRR = findNearestRailroad(updatedPlayer.position);
      const result = movePlayerTo(updatedPlayer, nearestRR, config, false);
      updatedPlayer = result.player;
      newPosition = result.movement.newPosition;
      passedGo = result.movement.passedGo;
      landedOnGo = result.movement.landedOnGo;
      goBonus = result.movement.goBonus;
      break;
    }
  }

  // Sync updatedPlayer back into updatedPlayers
  updatedPlayers = updatedPlayers.map((p) =>
    p.id === updatedPlayer.id ? updatedPlayer : p
  );

  return {
    updatedPlayer,
    updatedPlayers,
    updatedTiles,
    jackpotIncrease,
    goToJail,
    newPosition,
    passedGo,
    landedOnGo,
    goBonus,
    message,
  };
}
