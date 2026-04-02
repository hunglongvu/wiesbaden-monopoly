import { describe, it, expect } from 'vitest';
import {
  buildHouse,
  mortgageProperty,
  unmortgageProperty,
  sellHouse,
  calculateNetWorth,
} from '../src/engine/propertyManagement';
import { calculateRent } from '../src/engine/rentCalculation';
import { Player, Tile, PropertyTile, RailroadTile, UtilityTile } from '../src/engine/types';
import { BOARD_TILES, DEFAULT_CONFIG } from '../src/config/board.config';

const makePlayer = (id = 'p1', money = 1000): Player => ({
  id,
  name: 'Test',
  color: '#ff0000',
  money,
  position: 1,
  inJail: false,
  jailTurns: 0,
  isBankrupt: false,
  consecutiveDoubles: 0,
});

const makeTiles = (): Tile[] => BOARD_TILES.map((t) => ({ ...t })) as Tile[];

describe('Property Management', () => {
  describe('buildHouse', () => {
    it('builds a house on own unimproved property', () => {
      const player = makePlayer('p1', 500);
      const tiles = makeTiles();
      // Position 1: Biebricher Allee, housePrice: 30
      (tiles[1] as PropertyTile).ownerId = 'p1';

      const result = buildHouse(player, 1, tiles);
      expect(result.success).toBe(true);
      expect((result.updatedTiles![1] as PropertyTile).houses).toBe(1);
      expect(result.updatedPlayer!.money).toBe(500 - 30);
    });

    it('builds houses step by step: 0→1→2→3→4→hotel', () => {
      let tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      let player = makePlayer('p1', 10000);

      for (let expected = 1; expected <= 5; expected++) {
        const result = buildHouse(player, 1, tiles);
        expect(result.success).toBe(true);
        expect((result.updatedTiles![1] as PropertyTile).houses).toBe(expected);
        player = result.updatedPlayer!;
        tiles = result.updatedTiles!;
      }
    });

    it('cannot build more than one house per action (only increments by 1)', () => {
      const player = makePlayer('p1', 500);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1';

      const result = buildHouse(player, 1, tiles);
      expect(result.success).toBe(true);
      expect((result.updatedTiles![1] as PropertyTile).houses).toBe(1);
      // Still only 1 house, not more
    });

    it('fails when building on a mortgaged property', () => {
      const player = makePlayer('p1', 500);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).mortgaged = true;

      const result = buildHouse(player, 1, tiles);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/mortgaged/i);
    });

    it('fails when not enough money', () => {
      const player = makePlayer('p1', 10); // housePrice is 30
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1';

      const result = buildHouse(player, 1, tiles);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/money|enough/i);
    });

    it('fails when player does not own the property', () => {
      const player = makePlayer('p1', 500);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p2';

      const result = buildHouse(player, 1, tiles);
      expect(result.success).toBe(false);
    });

    it('fails when hotel (5) already built', () => {
      const player = makePlayer('p1', 500);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).houses = 5;

      const result = buildHouse(player, 1, tiles);
      expect(result.success).toBe(false);
    });

    it('builds without requiring full color group', () => {
      // Only own one of the two brown properties
      const player = makePlayer('p1', 500);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      // tiles[3] is NOT owned by p1

      const result = buildHouse(player, 1, tiles);
      expect(result.success).toBe(true);
    });
  });

  describe('Rent calculation - properties', () => {
    const makeRentSetup = () => {
      const tiles = makeTiles();
      const landingPlayer = makePlayer('p2');
      return { tiles, landingPlayer };
    };

    it('returns null if property is unowned', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result).toBeNull();
    });

    it('returns null if landing player owns the property', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      (tiles[1] as PropertyTile).ownerId = 'p2';
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result).toBeNull();
    });

    it('returns null if property is mortgaged', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).mortgaged = true;
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result).toBeNull();
    });

    it('returns base rent for unimproved property without full color group', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      (tiles[1] as PropertyTile).ownerId = 'p1'; // pos 1, only one of brown group
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result).not.toBeNull();
      expect(result!.rentAmount).toBe(2); // base rent for Biebricher Allee
    });

    it('doubles base rent when owner has full color group', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      // Brown group: positions 1 and 3
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[3] as PropertyTile).ownerId = 'p1';
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(4); // 2 * 2 = 4
    });

    it('charges 1-house rent with 1 house', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).houses = 1;
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(10); // rent[1] = 10
    });

    it('charges 2-house rent with 2 houses', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).houses = 2;
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(30); // rent[2] = 30
    });

    it('charges 3-house rent with 3 houses', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).houses = 3;
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(90); // rent[3] = 90
    });

    it('charges 4-house rent with 4 houses', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).houses = 4;
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(160); // rent[4] = 160
    });

    it('charges hotel rent with 5 (hotel)', () => {
      const { tiles, landingPlayer } = makeRentSetup();
      (tiles[1] as PropertyTile).ownerId = 'p1';
      (tiles[1] as PropertyTile).houses = 5;
      const result = calculateRent(tiles[1], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(250); // rent[5] = 250
    });
  });

  describe('Rent calculation - railroads', () => {
    it('charges 25€ for 1 railroad owned', () => {
      const tiles = makeTiles();
      const landingPlayer = makePlayer('p2');
      (tiles[5] as RailroadTile).ownerId = 'p1';
      const result = calculateRent(tiles[5], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(25);
    });

    it('charges 50€ for 2 railroads owned', () => {
      const tiles = makeTiles();
      const landingPlayer = makePlayer('p2');
      (tiles[5] as RailroadTile).ownerId = 'p1';
      (tiles[15] as RailroadTile).ownerId = 'p1';
      const result = calculateRent(tiles[5], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(50);
    });

    it('charges 75€ for 3 railroads owned', () => {
      const tiles = makeTiles();
      const landingPlayer = makePlayer('p2');
      (tiles[5] as RailroadTile).ownerId = 'p1';
      (tiles[15] as RailroadTile).ownerId = 'p1';
      (tiles[25] as RailroadTile).ownerId = 'p1';
      const result = calculateRent(tiles[5], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(75);
    });

    it('charges 100€ for 4 railroads owned', () => {
      const tiles = makeTiles();
      const landingPlayer = makePlayer('p2');
      (tiles[5] as RailroadTile).ownerId = 'p1';
      (tiles[15] as RailroadTile).ownerId = 'p1';
      (tiles[25] as RailroadTile).ownerId = 'p1';
      (tiles[35] as RailroadTile).ownerId = 'p1';
      const result = calculateRent(tiles[5], landingPlayer, tiles, 6);
      expect(result!.rentAmount).toBe(100);
    });

    it('returns null for mortgaged railroad', () => {
      const tiles = makeTiles();
      const landingPlayer = makePlayer('p2');
      (tiles[5] as RailroadTile).ownerId = 'p1';
      (tiles[5] as RailroadTile).mortgaged = true;
      const result = calculateRent(tiles[5], landingPlayer, tiles, 6);
      expect(result).toBeNull();
    });
  });

  describe('Rent calculation - utilities', () => {
    it('charges 4x dice for 1 utility owned', () => {
      const tiles = makeTiles();
      const landingPlayer = makePlayer('p2');
      (tiles[12] as UtilityTile).ownerId = 'p1';
      const result = calculateRent(tiles[12], landingPlayer, tiles, 8);
      expect(result!.rentAmount).toBe(32); // 4 * 8
    });

    it('charges 10x dice for 2 utilities owned', () => {
      const tiles = makeTiles();
      const landingPlayer = makePlayer('p2');
      (tiles[12] as UtilityTile).ownerId = 'p1';
      (tiles[28] as UtilityTile).ownerId = 'p1';
      const result = calculateRent(tiles[12], landingPlayer, tiles, 8);
      expect(result!.rentAmount).toBe(80); // 10 * 8
    });
  });

  describe('calculateNetWorth', () => {
    it('net worth with cash only equals cash', () => {
      const player = makePlayer('p1', 1500);
      const tiles = makeTiles();
      expect(calculateNetWorth(player, tiles)).toBe(1500);
    });

    it('net worth includes owned property prices', () => {
      const player = makePlayer('p1', 1000);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1'; // price: 40
      expect(calculateNetWorth(player, tiles)).toBe(1000 + 40);
    });

    it('net worth includes house values (half of housePrice)', () => {
      const player = makePlayer('p1', 1000);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1'; // price: 40, housePrice: 30
      (tiles[1] as PropertyTile).houses = 2;
      // 2 houses × (30/2) = 30
      expect(calculateNetWorth(player, tiles)).toBe(1000 + 40 + 30);
    });

    it('mortgaged property counts as half its price', () => {
      const player = makePlayer('p1', 1000);
      const tiles = makeTiles();
      (tiles[1] as PropertyTile).ownerId = 'p1'; // price: 40
      (tiles[1] as PropertyTile).mortgaged = true;
      expect(calculateNetWorth(player, tiles)).toBe(1000 + 20);
    });
  });
});
