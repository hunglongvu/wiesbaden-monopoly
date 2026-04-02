import { describe, it, expect } from 'vitest';
import { sendToJail, payJailFee, processJailRoll, mustExitJail } from '../src/engine/jailSystem';
import { Player } from '../src/engine/types';
import { DEFAULT_CONFIG } from '../src/config/board.config';

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'p1',
  name: 'Test Player',
  color: '#ff0000',
  money: 1000,
  position: 0,
  inJail: false,
  jailTurns: 0,
  isBankrupt: false,
  consecutiveDoubles: 0,
  ...overrides,
});

describe('Jail System', () => {
  describe('sendToJail', () => {
    it('sets player position to jail position', () => {
      const player = makePlayer({ position: 20 });
      const jailed = sendToJail(player, DEFAULT_CONFIG.jailPosition);
      expect(jailed.position).toBe(10);
    });

    it('sets inJail to true', () => {
      const player = makePlayer();
      const jailed = sendToJail(player, DEFAULT_CONFIG.jailPosition);
      expect(jailed.inJail).toBe(true);
    });

    it('resets consecutiveDoubles to 0', () => {
      const player = makePlayer({ consecutiveDoubles: 2 });
      const jailed = sendToJail(player, DEFAULT_CONFIG.jailPosition);
      expect(jailed.consecutiveDoubles).toBe(0);
    });

    it('resets jailTurns to 0', () => {
      const player = makePlayer({ jailTurns: 2 });
      const jailed = sendToJail(player, DEFAULT_CONFIG.jailPosition);
      expect(jailed.jailTurns).toBe(0);
    });
  });

  describe('payJailFee', () => {
    it('releases player from jail', () => {
      const player = makePlayer({ inJail: true, money: 500 });
      const result = payJailFee(player, DEFAULT_CONFIG.jailBuyoutCost);
      expect(result.success).toBe(true);
      expect(result.player!.inJail).toBe(false);
    });

    it('deducts 150€ from player money', () => {
      const player = makePlayer({ inJail: true, money: 500 });
      const result = payJailFee(player, 150);
      expect(result.player!.money).toBe(350);
    });

    it('jackpot increases by 150€', () => {
      const player = makePlayer({ inJail: true, money: 500 });
      const result = payJailFee(player, 150);
      expect(result.jackpotIncrease).toBe(150);
    });

    it('fails if player is not in jail', () => {
      const player = makePlayer({ inJail: false });
      const result = payJailFee(player, 150);
      expect(result.success).toBe(false);
    });

    it('fails if player cannot afford the fee', () => {
      const player = makePlayer({ inJail: true, money: 100 });
      const result = payJailFee(player, 150);
      expect(result.success).toBe(false);
    });
  });

  describe('processJailRoll', () => {
    it('exits jail on doubles roll', () => {
      const player = makePlayer({ inJail: true, jailTurns: 0 });
      const result = processJailRoll(player, 3, 3, 150, 3);
      expect(result.exitJail).toBe(true);
      expect(result.player.inJail).toBe(false);
      expect(result.steps).toBe(6);
    });

    it('stays in jail on non-doubles roll (first attempt)', () => {
      const player = makePlayer({ inJail: true, jailTurns: 0 });
      const result = processJailRoll(player, 2, 4, 150, 3);
      expect(result.exitJail).toBe(false);
      expect(result.player.inJail).toBe(true);
      expect(result.player.jailTurns).toBe(1);
    });

    it('stays in jail on non-doubles roll (second attempt)', () => {
      const player = makePlayer({ inJail: true, jailTurns: 1 });
      const result = processJailRoll(player, 2, 4, 150, 3);
      expect(result.exitJail).toBe(false);
      expect(result.player.jailTurns).toBe(2);
    });

    it('must pay and exit after 3 failed rolls', () => {
      const player = makePlayer({ inJail: true, jailTurns: 2, money: 500 });
      const result = processJailRoll(player, 2, 4, 150, 3);
      expect(result.exitJail).toBe(true);
      expect(result.mustPayFee).toBe(true);
      expect(result.jackpotIncrease).toBe(150);
      expect(result.player.money).toBe(350);
    });

    it('jail fee on forced exit goes to jackpot', () => {
      const player = makePlayer({ inJail: true, jailTurns: 2, money: 500 });
      const result = processJailRoll(player, 1, 2, 150, 3);
      expect(result.jackpotIncrease).toBe(150);
    });

    it('does not collect steps when staying in jail', () => {
      const player = makePlayer({ inJail: true, jailTurns: 0 });
      const result = processJailRoll(player, 2, 4, 150, 3);
      expect(result.steps).toBe(0);
    });
  });

  describe('mustExitJail', () => {
    it('returns true when player has been in jail for maxJailTurns', () => {
      const player = makePlayer({ inJail: true, jailTurns: 3 });
      expect(mustExitJail(player, 3)).toBe(true);
    });

    it('returns false when player has been in jail for fewer turns', () => {
      const player = makePlayer({ inJail: true, jailTurns: 2 });
      expect(mustExitJail(player, 3)).toBe(false);
    });

    it('returns false when player is not in jail', () => {
      const player = makePlayer({ inJail: false, jailTurns: 5 });
      expect(mustExitJail(player, 3)).toBe(false);
    });
  });

  describe('Three consecutive doubles → jail', () => {
    it('going to jail on 3rd consecutive doubles gives no movement', () => {
      // This tests the game engine behavior: 3 doubles → jail, no move
      // We test the jail system part: after jail, jailTurns starts at 0
      const player = makePlayer({ consecutiveDoubles: 2 });
      const jailed = sendToJail(player, 10);
      expect(jailed.inJail).toBe(true);
      expect(jailed.jailTurns).toBe(0);
      expect(jailed.consecutiveDoubles).toBe(0);
    });
  });
});
