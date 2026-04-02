import { describe, it, expect } from 'vitest';
import { calculateMovement, movePlayer, movePlayerTo, findNearestRailroad, moveBack } from '../src/engine/movement';
import { Player } from '../src/engine/types';
import { DEFAULT_CONFIG } from '../src/config/board.config';

const makePlayer = (position: number, inJail = false): Player => ({
  id: 'p1',
  name: 'Test Player',
  color: '#ff0000',
  money: 1000,
  position,
  inJail,
  jailTurns: 0,
  isBankrupt: false,
  consecutiveDoubles: 0,
});

describe('Movement', () => {
  describe('calculateMovement', () => {
    it('moves player forward by steps', () => {
      const result = calculateMovement(5, 6, false, DEFAULT_CONFIG);
      expect(result.newPosition).toBe(11);
    });

    it('wraps around the board (position > 40)', () => {
      // Start at 38, move 5 → should land at 3
      const result = calculateMovement(38, 5, false, DEFAULT_CONFIG);
      expect(result.newPosition).toBe(3);
    });

    it('wraps around at exactly 40 (lands on GO)', () => {
      const result = calculateMovement(38, 2, false, DEFAULT_CONFIG);
      expect(result.newPosition).toBe(0);
      expect(result.landedOnGo).toBe(true);
    });

    it('passing GO gives 200€ bonus', () => {
      const result = calculateMovement(38, 5, false, DEFAULT_CONFIG);
      expect(result.passedGo).toBe(true);
      expect(result.goBonus).toBe(200);
    });

    it('landing exactly on GO gives 400€ bonus', () => {
      const result = calculateMovement(38, 2, false, DEFAULT_CONFIG);
      expect(result.landedOnGo).toBe(true);
      expect(result.goBonus).toBe(400);
    });

    it('passing GO gives 200, NOT 400', () => {
      const result = calculateMovement(37, 5, false, DEFAULT_CONFIG);
      // 37 + 5 = 42 → position 2
      expect(result.newPosition).toBe(2);
      expect(result.passedGo).toBe(true);
      expect(result.landedOnGo).toBe(false);
      expect(result.goBonus).toBe(200);
    });

    it('no GO bonus when not passing or landing on GO', () => {
      const result = calculateMovement(5, 6, false, DEFAULT_CONFIG);
      expect(result.passedGo).toBe(false);
      expect(result.landedOnGo).toBe(false);
      expect(result.goBonus).toBe(0);
    });

    it('does not award GO bonus for movement within first half of board', () => {
      const result = calculateMovement(0, 10, false, DEFAULT_CONFIG);
      expect(result.newPosition).toBe(10);
      expect(result.passedGo).toBe(false);
      expect(result.goBonus).toBe(0);
    });
  });

  describe('movePlayer', () => {
    it('updates player position', () => {
      const player = makePlayer(5);
      const { player: updated } = movePlayer(player, 6, DEFAULT_CONFIG);
      expect(updated.position).toBe(11);
    });

    it('adds GO pass bonus to player money', () => {
      const player = makePlayer(38);
      const { player: updated } = movePlayer(player, 5, DEFAULT_CONFIG);
      expect(updated.money).toBe(1000 + 200); // pass GO
    });

    it('adds GO landing bonus to player money', () => {
      const player = makePlayer(38);
      const { player: updated } = movePlayer(player, 2, DEFAULT_CONFIG);
      expect(updated.money).toBe(1000 + 400); // land on GO
    });

    it('does not add GO bonus when not crossing GO', () => {
      const player = makePlayer(5);
      const { player: updated } = movePlayer(player, 3, DEFAULT_CONFIG);
      expect(updated.money).toBe(1000);
    });
  });

  describe('movePlayerTo', () => {
    it('moves player directly to target position', () => {
      const player = makePlayer(10);
      const { player: updated } = movePlayerTo(player, 20, DEFAULT_CONFIG, false);
      expect(updated.position).toBe(20);
    });

    it('awards GO pass bonus when moving backward across GO', () => {
      const player = makePlayer(30);
      const { player: updated, movement } = movePlayerTo(player, 5, DEFAULT_CONFIG, false);
      expect(movement.passedGo).toBe(true);
      expect(updated.money).toBe(1000 + 200);
    });

    it('no GO bonus when moving forward without crossing GO', () => {
      const player = makePlayer(5);
      const { player: updated, movement } = movePlayerTo(player, 15, DEFAULT_CONFIG, false);
      expect(movement.passedGo).toBe(false);
      expect(updated.money).toBe(1000);
    });

    it('community_chest move_to GO is exact landing (400€)', () => {
      const player = makePlayer(10);
      const { player: updated, movement } = movePlayerTo(player, 0, DEFAULT_CONFIG, true);
      expect(movement.landedOnGo).toBe(true);
      expect(updated.money).toBe(1000 + 400);
    });
  });

  describe('findNearestRailroad', () => {
    it('finds railroad ahead of position', () => {
      expect(findNearestRailroad(1)).toBe(5);
      expect(findNearestRailroad(6)).toBe(15);
      expect(findNearestRailroad(16)).toBe(25);
      expect(findNearestRailroad(26)).toBe(35);
    });

    it('wraps to first railroad when past last railroad', () => {
      expect(findNearestRailroad(36)).toBe(5); // wrap to Hauptbahnhof
    });
  });

  describe('moveBack', () => {
    it('moves back without wrapping', () => {
      expect(moveBack(10, 3)).toBe(7);
    });

    it('wraps around board when moving back past position 0', () => {
      expect(moveBack(2, 3)).toBe(39);
    });
  });
});
