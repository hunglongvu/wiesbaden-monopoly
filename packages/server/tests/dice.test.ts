import { describe, it, expect } from 'vitest';
import { rollDice, createDiceRoll } from '../src/engine/dice';

describe('Dice', () => {
  describe('rollDice', () => {
    it('returns die1 between 1 and 6', () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDice();
        expect(roll.die1).toBeGreaterThanOrEqual(1);
        expect(roll.die1).toBeLessThanOrEqual(6);
      }
    });

    it('returns die2 between 1 and 6', () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDice();
        expect(roll.die2).toBeGreaterThanOrEqual(1);
        expect(roll.die2).toBeLessThanOrEqual(6);
      }
    });

    it('returns total between 2 and 12', () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDice();
        expect(roll.total).toBeGreaterThanOrEqual(2);
        expect(roll.total).toBeLessThanOrEqual(12);
      }
    });

    it('total equals die1 + die2', () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDice();
        expect(roll.total).toBe(roll.die1 + roll.die2);
      }
    });

    it('isDoubles is true when both dice are equal', () => {
      // We can't force doubles, but we test via createDiceRoll
      const doubles = createDiceRoll(3, 3);
      expect(doubles.isDoubles).toBe(true);

      const notDoubles = createDiceRoll(2, 4);
      expect(notDoubles.isDoubles).toBe(false);
    });
  });

  describe('createDiceRoll', () => {
    it('creates valid dice roll', () => {
      const roll = createDiceRoll(4, 6);
      expect(roll.die1).toBe(4);
      expect(roll.die2).toBe(6);
      expect(roll.total).toBe(10);
      expect(roll.isDoubles).toBe(false);
    });

    it('detects doubles correctly', () => {
      const roll = createDiceRoll(5, 5);
      expect(roll.isDoubles).toBe(true);
      expect(roll.total).toBe(10);
    });

    it('throws for invalid die values below 1', () => {
      expect(() => createDiceRoll(0, 3)).toThrow();
    });

    it('throws for invalid die values above 6', () => {
      expect(() => createDiceRoll(3, 7)).toThrow();
    });

    it('handles minimum dice roll (1+1=2)', () => {
      const roll = createDiceRoll(1, 1);
      expect(roll.total).toBe(2);
      expect(roll.isDoubles).toBe(true);
    });

    it('handles maximum dice roll (6+6=12)', () => {
      const roll = createDiceRoll(6, 6);
      expect(roll.total).toBe(12);
      expect(roll.isDoubles).toBe(true);
    });
  });
});
