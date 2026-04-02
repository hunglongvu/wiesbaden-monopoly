import { describe, it, expect } from 'vitest';
import { checkWinCondition, checkLastPlayerStanding, getRanking } from '../src/engine/winCondition';
import { calculateNetWorth } from '../src/engine/propertyManagement';
import { Player, Tile, PropertyTile, RailroadTile } from '../src/engine/types';
import { BOARD_TILES, DEFAULT_CONFIG } from '../src/config/board.config';

const makePlayer = (id: string, money = 1000, isBankrupt = false): Player => ({
  id,
  name: `Player ${id}`,
  color: '#ff0000',
  money,
  position: 0,
  inJail: false,
  jailTurns: 0,
  isBankrupt,
  consecutiveDoubles: 0,
});

const makeTiles = (): Tile[] => BOARD_TILES.map((t) => ({ ...t })) as Tile[];

describe('Win Condition', () => {
  describe('calculateNetWorth', () => {
    it('player with cash only: netWorth = cash', () => {
      const player = makePlayer('p1', 1500);
      const tiles = makeTiles();
      expect(calculateNetWorth(player, tiles)).toBe(1500);
    });

    it('player with properties: netWorth = cash + property prices', () => {
      const player = makePlayer('p1', 1000);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1'; // price: 40
      (tiles[5] as RailroadTile).ownerId = 'p1'; // price: 130
      expect(calculateNetWorth(player, tiles)).toBe(1000 + 40 + 130);
    });

    it('includes building values (half of housePrice each)', () => {
      const player = makePlayer('p1', 1000);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1'; // price: 40, housePrice: 30
      (tiles[1] as PropertyTile).houses = 3;
      // 3 × (30 / 2) = 45
      expect(calculateNetWorth(player, tiles)).toBe(1000 + 40 + 45);
    });

    it('hotel counts as one housePrice/2', () => {
      const player = makePlayer('p1', 1000);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1'; // price: 40, housePrice: 30
      (tiles[1] as PropertyTile).houses = 5; // hotel
      // hotel = 30/2 = 15
      expect(calculateNetWorth(player, tiles)).toBe(1000 + 40 + 15);
    });

    it('mortgaged property worth is half price', () => {
      const player = makePlayer('p1', 1000);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1'; // price: 40
      (tiles[1] as PropertyTile).mortgaged = true;
      expect(calculateNetWorth(player, tiles)).toBe(1000 + 20); // 40/2 = 20
    });

    it('does not count properties owned by other players', () => {
      const player = makePlayer('p1', 1000);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p2'; // owned by p2
      expect(calculateNetWorth(player, tiles)).toBe(1000);
    });
  });

  describe('checkWinCondition', () => {
    it('returns null when no player has reached threshold', () => {
      const players = [makePlayer('p1', 1000), makePlayer('p2', 900)];
      const tiles = makeTiles();
      const winner = checkWinCondition(players, tiles, 8000);
      expect(winner).toBeNull();
    });

    it('returns winner when net worth reaches threshold', () => {
      const players = [makePlayer('p1', 8000), makePlayer('p2', 1000)];
      const tiles = makeTiles();
      const winner = checkWinCondition(players, tiles, 8000);
      expect(winner).not.toBeNull();
      expect(winner!.id).toBe('p1');
    });

    it('includes property values in win condition check', () => {
      const player = makePlayer('p1', 5000);
      const tiles = makeTiles();
      // Give player all properties (positions 1-39 that are purchasable)
      for (let i = 1; i <= 39; i++) {
        const tile = tiles[i];
        if (
          tile.type === 'property' ||
          tile.type === 'railroad' ||
          tile.type === 'utility'
        ) {
          (tile as PropertyTile | RailroadTile).ownerId = 'p1';
        }
      }
      const players = [player, makePlayer('p2', 1000)];
      const netWorth = calculateNetWorth(player, tiles);
      // Total property value is well over 4000, so netWorth >> 8000
      expect(netWorth).toBeGreaterThan(8000);
      const winner = checkWinCondition(players, tiles, 8000);
      expect(winner!.id).toBe('p1');
    });

    it('ignores bankrupt players', () => {
      const players = [makePlayer('p1', 10000, true), makePlayer('p2', 500)];
      const tiles = makeTiles();
      const winner = checkWinCondition(players, tiles, 8000);
      expect(winner).toBeNull(); // bankrupt player is not eligible
    });

    it('win triggered at exactly threshold value', () => {
      const players = [makePlayer('p1', 8000)];
      const tiles = makeTiles();
      const winner = checkWinCondition(players, tiles, 8000);
      expect(winner).not.toBeNull();
    });
  });

  describe('checkLastPlayerStanding', () => {
    it('returns winner when only one non-bankrupt player remains', () => {
      const players = [
        makePlayer('p1', 1000, false),
        makePlayer('p2', 0, true),
        makePlayer('p3', 0, true),
      ];
      const winner = checkLastPlayerStanding(players);
      expect(winner).not.toBeNull();
      expect(winner!.id).toBe('p1');
    });

    it('returns null when multiple players remain', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3', 0, true)];
      const winner = checkLastPlayerStanding(players);
      expect(winner).toBeNull();
    });
  });

  describe('getRanking', () => {
    it('ranks players by net worth descending', () => {
      const player1 = makePlayer('p1', 3000);
      const player2 = makePlayer('p2', 5000);
      const players = [player1, player2];
      const tiles = makeTiles();
      const ranking = getRanking(players, tiles);
      expect(ranking[0].player.id).toBe('p2');
      expect(ranking[1].player.id).toBe('p1');
      expect(ranking[0].rank).toBe(1);
      expect(ranking[1].rank).toBe(2);
    });
  });
});
