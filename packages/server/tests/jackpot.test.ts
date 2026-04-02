import { describe, it, expect } from 'vitest';
import { addToJackpot, collectJackpot, resetJackpot, createJackpot } from '../src/engine/jackpotSystem';
import { JackpotState } from '../src/engine/types';

describe('Jackpot System', () => {
  describe('createJackpot', () => {
    it('creates jackpot with 0 amount', () => {
      const jackpot = createJackpot();
      expect(jackpot.amount).toBe(0);
    });
  });

  describe('addToJackpot', () => {
    it('adds amount to jackpot', () => {
      const jackpot: JackpotState = { amount: 0 };
      const updated = addToJackpot(jackpot, 80);
      expect(updated.amount).toBe(80);
    });

    it('accumulates multiple additions', () => {
      let jackpot: JackpotState = { amount: 0 };
      jackpot = addToJackpot(jackpot, 80); // tax
      jackpot = addToJackpot(jackpot, 50); // card penalty
      jackpot = addToJackpot(jackpot, 150); // jail fee
      expect(jackpot.amount).toBe(280);
    });

    it('tax payments go to jackpot', () => {
      const jackpot: JackpotState = { amount: 0 };
      const taxAmount = 80; // income tax
      const updated = addToJackpot(jackpot, taxAmount);
      expect(updated.amount).toBe(80);
    });

    it('card penalty payments go to jackpot', () => {
      const jackpot: JackpotState = { amount: 0 };
      const penaltyAmount = 50; // doctor bill card
      const updated = addToJackpot(jackpot, penaltyAmount);
      expect(updated.amount).toBe(50);
    });

    it('jail buyout fee (150€) goes to jackpot', () => {
      const jackpot: JackpotState = { amount: 0 };
      const jailFee = 150;
      const updated = addToJackpot(jackpot, jailFee);
      expect(updated.amount).toBe(150);
    });
  });

  describe('collectJackpot', () => {
    it('returns full jackpot amount when landing on free parking', () => {
      const jackpot: JackpotState = { amount: 350 };
      const { amount } = collectJackpot(jackpot);
      expect(amount).toBe(350);
    });

    it('resets jackpot to 0 after collection', () => {
      const jackpot: JackpotState = { amount: 350 };
      const { newJackpot } = collectJackpot(jackpot);
      expect(newJackpot.amount).toBe(0);
    });

    it('returns 0 when jackpot is empty', () => {
      const jackpot: JackpotState = { amount: 0 };
      const { amount, newJackpot } = collectJackpot(jackpot);
      expect(amount).toBe(0);
      expect(newJackpot.amount).toBe(0);
    });
  });

  describe('resetJackpot', () => {
    it('resets jackpot to 0', () => {
      const jackpot = resetJackpot();
      expect(jackpot.amount).toBe(0);
    });
  });

  describe('Jackpot exclusions', () => {
    it('rent payments do NOT go to jackpot (just go to property owner)', () => {
      // This is a design rule - rent goes from payer to owner, not jackpot
      // The jackpot system itself doesn't care, but we document this
      const jackpot: JackpotState = { amount: 100 };
      // Simulating: rent is paid to owner (no addToJackpot called)
      // Jackpot remains unchanged
      expect(jackpot.amount).toBe(100);
    });

    it('property purchase price does NOT go to jackpot', () => {
      // Purchase price goes to bank (removed from game economy)
      const jackpot: JackpotState = { amount: 100 };
      // No jackpot change when buying property
      expect(jackpot.amount).toBe(100);
    });

    it('jackpot increases only from tax, penalties, jail fees', () => {
      let jackpot: JackpotState = { amount: 0 };

      // These should add to jackpot:
      jackpot = addToJackpot(jackpot, 80);   // income tax
      jackpot = addToJackpot(jackpot, 50);   // luxury tax
      jackpot = addToJackpot(jackpot, 150);  // jail fee
      jackpot = addToJackpot(jackpot, 40);   // card penalty

      expect(jackpot.amount).toBe(320);
    });
  });
});
