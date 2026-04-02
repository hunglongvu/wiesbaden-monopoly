import { describe, it, expect } from 'vitest';
import { createDeck, drawCard, applyCardEffect, shuffleDeck } from '../src/engine/cardSystem';
import { ActionCard, Player, Tile, PropertyTile } from '../src/engine/types';
import { BOARD_TILES, DEFAULT_CONFIG } from '../src/config/board.config';

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'p1',
  name: 'Test Player',
  color: '#ff0000',
  money: 1000,
  position: 15,
  inJail: false,
  jailTurns: 0,
  isBankrupt: false,
  consecutiveDoubles: 0,
  ...overrides,
});

const makeOtherPlayer = (id = 'p2'): Player => ({
  id,
  name: 'Other Player',
  color: '#0000ff',
  money: 500,
  position: 10,
  inJail: false,
  jailTurns: 0,
  isBankrupt: false,
  consecutiveDoubles: 0,
});

const makeTiles = (): Tile[] => BOARD_TILES.map((t) => ({ ...t })) as Tile[];

describe('Card System', () => {
  describe('createDeck', () => {
    it('creates community chest deck with 16 cards', () => {
      const deck = createDeck('community_chest');
      expect(deck.length).toBe(16);
    });

    it('creates chance deck with 16 cards', () => {
      const deck = createDeck('chance');
      expect(deck.length).toBe(16);
    });

    it('assigns unique ids to each card', () => {
      const deck = createDeck('chance');
      const ids = deck.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(16);
    });
  });

  describe('drawCard', () => {
    it('draws the top card', () => {
      const deck = createDeck('chance');
      const firstCard = deck[0];
      const result = drawCard(deck);
      expect(result).not.toBeNull();
      expect(result!.card.id).toBe(firstCard.id);
    });

    it('card cycles to bottom after drawing', () => {
      const deck = createDeck('chance');
      const firstCard = deck[0];
      const result = drawCard(deck);
      expect(result!.remainingDeck[result!.remainingDeck.length - 1].id).toBe(firstCard.id);
    });

    it('returns null for empty deck', () => {
      const result = drawCard([]);
      expect(result).toBeNull();
    });
  });

  describe('applyCardEffect - collect_from_bank', () => {
    it('adds money to player', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'community_chest',
        type: 'collect_from_bank',
        amount: 100,
        text: 'Test',
      };
      const player = makePlayer();
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.updatedPlayer.money).toBe(1100);
    });
  });

  describe('applyCardEffect - pay_to_jackpot', () => {
    it('deducts money from player', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'community_chest',
        type: 'pay_to_jackpot',
        amount: 50,
        text: 'Test',
      };
      const player = makePlayer();
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.updatedPlayer.money).toBe(950);
    });

    it('increases jackpot', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'community_chest',
        type: 'pay_to_jackpot',
        amount: 50,
        text: 'Test',
      };
      const player = makePlayer();
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.jackpotIncrease).toBe(50);
    });
  });

  describe('applyCardEffect - go_to_jail', () => {
    it('sends player to jail', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'chance',
        type: 'go_to_jail',
        text: 'Gehe ins Gefängnis',
      };
      const player = makePlayer();
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.goToJail).toBe(true);
      expect(result.updatedPlayer.inJail).toBe(true);
      expect(result.updatedPlayer.position).toBe(DEFAULT_CONFIG.jailPosition);
    });
  });

  describe('applyCardEffect - move_to', () => {
    it('moves player to specified position', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'chance',
        type: 'move_to',
        position: 39,
        text: 'Fahre zum Schlossplatz',
      };
      const player = makePlayer({ position: 15 });
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.updatedPlayer.position).toBe(39);
    });

    it('community_chest move_to position 0 is exact landing (400€)', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'community_chest',
        type: 'move_to',
        position: 0,
        text: 'Gehe zu Los. Erhalte 400€',
      };
      const player = makePlayer({ position: 15 });
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.landedOnGo).toBe(true);
      expect(result.goBonus).toBe(400);
    });

    it('chance move_to position 0 gives passing GO bonus (200€)', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'chance',
        type: 'move_to',
        position: 0,
        text: 'Fahre zu Los',
      };
      const player = makePlayer({ position: 15 });
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      // This is a chance card moving to GO - treated as passing GO for cards that aren't exact landing
      // Per spec: "Fahre zu Los" in chance = passing GO (200€)
      expect(result.goBonus).toBe(DEFAULT_CONFIG.goPassReward);
    });

    it('awards GO pass bonus when moving back past start', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'chance',
        type: 'move_to',
        position: 5,
        text: 'Test',
      };
      const player = makePlayer({ position: 25 });
      // Moving from 25 to 5 passes GO
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.passedGo).toBe(true);
    });
  });

  describe('applyCardEffect - collect_from_players', () => {
    it('collects money from each other player', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'community_chest',
        type: 'collect_from_players',
        amount: 20,
        text: 'Geburtstag',
      };
      const player = makePlayer();
      const other1 = makeOtherPlayer('p2');
      const other2 = makeOtherPlayer('p3');
      const result = applyCardEffect(card, player, [player, other1, other2], makeTiles(), DEFAULT_CONFIG);
      // Player collects 20 from each of 2 others = 40
      expect(result.updatedPlayer.money).toBe(1000 + 40);
      // Each other player pays 20
      const updatedOther1 = result.updatedPlayers.find((p) => p.id === 'p2')!;
      const updatedOther2 = result.updatedPlayers.find((p) => p.id === 'p3')!;
      expect(updatedOther1.money).toBe(500 - 20);
      expect(updatedOther2.money).toBe(500 - 20);
    });
  });

  describe('applyCardEffect - repair_costs', () => {
    it('charges per house and per hotel', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'community_chest',
        type: 'repair_costs',
        houseCost: 25,
        hotelCost: 80,
        text: 'Reparaturen',
      };
      const player = makePlayer({ money: 2000 });
      const tiles = makeTiles();
      // Give player properties with houses
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).houses = 2; // 2 × 25 = 50
      (tiles[3] as PropertyTile).ownerId = 'p1';
      (tiles[3] as PropertyTile).houses = 5; // hotel: 80

      const result = applyCardEffect(card, player, [player], tiles, DEFAULT_CONFIG);
      expect(result.updatedPlayer.money).toBe(2000 - 50 - 80); // 1870
      expect(result.jackpotIncrease).toBe(130);
    });

    it('charges nothing if player has no buildings', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'community_chest',
        type: 'repair_costs',
        houseCost: 25,
        hotelCost: 80,
        text: 'Reparaturen',
      };
      const player = makePlayer();
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.updatedPlayer.money).toBe(1000);
      expect(result.jackpotIncrease).toBe(0);
    });
  });

  describe('applyCardEffect - move_back', () => {
    it('moves player back specified spaces', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'chance',
        type: 'move_back',
        spaces: 3,
        text: 'Gehe 3 zurück',
      };
      const player = makePlayer({ position: 22 });
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.newPosition).toBe(19);
    });
  });

  describe('applyCardEffect - move_to_nearest_railroad', () => {
    it('moves to nearest railroad ahead', () => {
      const card: ActionCard = {
        id: '1',
        deckType: 'community_chest',
        type: 'move_to_nearest_railroad',
        text: 'Test',
      };
      const player = makePlayer({ position: 6 }); // Between pos 5 and 15
      const result = applyCardEffect(card, player, [player], makeTiles(), DEFAULT_CONFIG);
      expect(result.newPosition).toBe(15); // Nearest RR ahead of 6 is 15
    });
  });
});
