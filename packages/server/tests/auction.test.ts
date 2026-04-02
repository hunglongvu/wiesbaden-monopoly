import { describe, it, expect } from 'vitest';
import {
  startAuction,
  processBid,
  processPass,
  getNextBidder,
  shouldEndAuction,
  resolveAuction,
} from '../src/engine/auctionSystem';
import { Player, Tile } from '../src/engine/types';
import { BOARD_TILES } from '../src/config/board.config';

const makePlayer = (id: string, money = 1000): Player => ({
  id,
  name: `Player ${id}`,
  color: '#ff0000',
  money,
  position: 0,
  inJail: false,
  jailTurns: 0,
  isBankrupt: false,
  consecutiveDoubles: 0,
});

const makeTiles = (): Tile[] => BOARD_TILES.map((t) => ({ ...t })) as Tile[];

describe('Auction System', () => {
  describe('startAuction', () => {
    it('creates auction for a tile', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const auction = startAuction(5, players, 'p1', 1);
      expect(auction.tilePosition).toBe(5);
      expect(auction.active).toBe(true);
      expect(auction.minimumBid).toBe(1);
      expect(auction.highestBid).toBe(0);
    });

    it('sets the starting bidder', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const auction = startAuction(5, players, 'p1', 1);
      expect(auction.currentBidder).toBe('p1');
    });
  });

  describe('processBid', () => {
    it('accepts valid bid', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const auction = startAuction(5, players, 'p1', 1);
      const player = makePlayer('p1', 1000);
      const result = processBid(auction, 'p1', 100, player);
      expect(result.success).toBe(true);
      expect(result.updatedAuction!.highestBid).toBe(100);
      expect(result.updatedAuction!.highestBidderId).toBe('p1');
    });

    it('rejects bid below minimum', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const auction = startAuction(5, players, 'p1', 50);
      const player = makePlayer('p1', 1000);
      const result = processBid(auction, 'p1', 30, player);
      expect(result.success).toBe(false);
    });

    it('rejects bid equal to or below current highest bid', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      let auction = startAuction(5, players, 'p1', 1);
      auction = { ...auction, highestBid: 100, highestBidderId: 'p2' };
      const player = makePlayer('p1', 1000);
      const result = processBid(auction, 'p1', 100, player);
      expect(result.success).toBe(false);
    });

    it('rejects bid when player cannot afford', () => {
      const players = [makePlayer('p1', 50), makePlayer('p2')];
      const auction = startAuction(5, players, 'p1', 1);
      const player = makePlayer('p1', 50);
      const result = processBid(auction, 'p1', 100, player);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/money|afford/i);
    });

    it('rejects bid from wrong player', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const auction = startAuction(5, players, 'p1', 1);
      const player = makePlayer('p2', 1000);
      const result = processBid(auction, 'p2', 100, player);
      expect(result.success).toBe(false);
    });
  });

  describe('processPass', () => {
    it('adds player to passed list', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const auction = startAuction(5, players, 'p1', 1);
      const { updatedAuction } = processPass(auction, 'p1');
      expect(updatedAuction.passedPlayers).toContain('p1');
    });
  });

  describe('shouldEndAuction', () => {
    it('ends when only highest bidder remains', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      let auction = startAuction(5, players, 'p1', 1);
      auction = { ...auction, highestBidderId: 'p1', highestBid: 50, passedPlayers: ['p2'] };
      expect(shouldEndAuction(auction, players)).toBe(true);
    });

    it('ends when all players have passed and no bids', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      let auction = startAuction(5, players, 'p1', 1);
      auction = { ...auction, passedPlayers: ['p1', 'p2'] };
      expect(shouldEndAuction(auction, players)).toBe(true);
    });

    it('does not end when multiple players still bidding', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const auction = startAuction(5, players, 'p1', 1);
      expect(shouldEndAuction(auction, players)).toBe(false);
    });
  });

  describe('resolveAuction', () => {
    it('awards property to highest bidder', () => {
      const players = [makePlayer('p1'), makePlayer('p2', 500)];
      const tiles = makeTiles();
      const auction = startAuction(5, players, 'p1', 1);
      const winningAuction = { ...auction, highestBid: 200, highestBidderId: 'p2' };
      const result = resolveAuction(winningAuction, players, tiles);
      expect(result.success).toBe(true);
      expect(result.winnerId).toBe('p2');
      expect((result.updatedTiles![5] as any).ownerId).toBe('p2');
    });

    it('deducts bid amount from winner money', () => {
      const players = [makePlayer('p1'), makePlayer('p2', 500)];
      const tiles = makeTiles();
      const auction = startAuction(5, players, 'p1', 1);
      const winningAuction = { ...auction, highestBid: 200, highestBidderId: 'p2' };
      const result = resolveAuction(winningAuction, players, tiles);
      const winner = result.updatedPlayers!.find((p) => p.id === 'p2')!;
      expect(winner.money).toBe(300);
    });

    it('fails when no bids were placed', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const tiles = makeTiles();
      const auction = startAuction(5, players, 'p1', 1);
      const result = resolveAuction(auction, players, tiles);
      expect(result.success).toBe(false);
    });

    it('fails when winner cannot afford their bid', () => {
      const players = [makePlayer('p1'), makePlayer('p2', 50)];
      const tiles = makeTiles();
      const auction = startAuction(5, players, 'p1', 1);
      const winningAuction = { ...auction, highestBid: 200, highestBidderId: 'p2' };
      const result = resolveAuction(winningAuction, players, tiles);
      expect(result.success).toBe(false);
    });
  });

  describe('getNextBidder', () => {
    it('rotates to next eligible player', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
      const auction = startAuction(5, players, 'p1', 1);
      const next = getNextBidder(auction, players);
      expect(next).toBe('p2');
    });

    it('skips passed players', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
      const auction = {
        ...startAuction(5, players, 'p1', 1),
        passedPlayers: ['p2'],
      };
      const next = getNextBidder(auction, players);
      expect(next).toBe('p3');
    });

    it('returns null when only highest bidder remains', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const auction = {
        ...startAuction(5, players, 'p1', 1),
        highestBid: 100,
        highestBidderId: 'p1',
        passedPlayers: ['p2'],
      };
      const next = getNextBidder(auction, players);
      expect(next).toBeNull();
    });
  });
});
