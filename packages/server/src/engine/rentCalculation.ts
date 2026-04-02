import { Tile, PropertyTile, RailroadTile, UtilityTile, Player } from './types';
import { COLOR_GROUPS, RAILROAD_POSITIONS, UTILITY_POSITIONS } from '../config/board.config';

/**
 * Calculate rent owed for landing on a property tile.
 * Returns 0 if tile is unowned, mortgaged, or owned by the landing player.
 */
export function calculateRent(
  tile: Tile,
  landingPlayer: Player,
  allTiles: Tile[],
  diceTotal: number
): { ownerId: string; rentAmount: number } | null {
  if (tile.type === 'property') {
    return calculatePropertyRent(tile, landingPlayer, allTiles);
  }
  if (tile.type === 'railroad') {
    return calculateRailroadRent(tile, landingPlayer, allTiles);
  }
  if (tile.type === 'utility') {
    return calculateUtilityRent(tile, landingPlayer, allTiles, diceTotal);
  }
  return null;
}

function calculatePropertyRent(
  tile: PropertyTile,
  landingPlayer: Player,
  allTiles: Tile[]
): { ownerId: string; rentAmount: number } | null {
  if (!tile.ownerId || tile.ownerId === landingPlayer.id || tile.mortgaged) {
    return null;
  }

  let rentAmount: number;

  if (tile.houses > 0) {
    // 1-4 houses or hotel (houses = 5 means hotel)
    const houseIndex = tile.houses; // 1-5 maps to rent[1]-rent[5]
    rentAmount = tile.rent[houseIndex];
  } else {
    // Base rent - doubles if owner has full color group
    const colorGroupPositions = COLOR_GROUPS[tile.color] ?? [];
    const ownerHasFullGroup = colorGroupPositions.every((pos) => {
      const groupTile = allTiles[pos];
      return (
        groupTile &&
        (groupTile.type === 'property') &&
        (groupTile as PropertyTile).ownerId === tile.ownerId &&
        !(groupTile as PropertyTile).mortgaged
      );
    });

    rentAmount = ownerHasFullGroup ? tile.rent[0] * 2 : tile.rent[0];
  }

  return { ownerId: tile.ownerId, rentAmount };
}

function calculateRailroadRent(
  tile: RailroadTile,
  landingPlayer: Player,
  allTiles: Tile[]
): { ownerId: string; rentAmount: number } | null {
  if (!tile.ownerId || tile.ownerId === landingPlayer.id || tile.mortgaged) {
    return null;
  }

  // Count how many railroads the owner has
  const ownedCount = RAILROAD_POSITIONS.filter((pos) => {
    const rr = allTiles[pos];
    return rr && rr.type === 'railroad' && (rr as RailroadTile).ownerId === tile.ownerId && !(rr as RailroadTile).mortgaged;
  }).length;

  const rentTable: Record<number, number> = { 1: 25, 2: 50, 3: 75, 4: 100 };
  const rentAmount = rentTable[ownedCount] ?? 25;

  return { ownerId: tile.ownerId, rentAmount };
}

function calculateUtilityRent(
  tile: UtilityTile,
  landingPlayer: Player,
  allTiles: Tile[],
  diceTotal: number
): { ownerId: string; rentAmount: number } | null {
  if (!tile.ownerId || tile.ownerId === landingPlayer.id || tile.mortgaged) {
    return null;
  }

  // Count how many utilities the owner has
  const ownedCount = UTILITY_POSITIONS.filter((pos) => {
    const ut = allTiles[pos];
    return ut && ut.type === 'utility' && (ut as UtilityTile).ownerId === tile.ownerId && !(ut as UtilityTile).mortgaged;
  }).length;

  const multiplier = ownedCount >= 2 ? 10 : 4;
  const rentAmount = multiplier * diceTotal;

  return { ownerId: tile.ownerId, rentAmount };
}

/**
 * Check if an owner has the full color group (all tiles owned and none mortgaged).
 */
export function ownerHasFullColorGroup(
  color: string,
  ownerId: string,
  allTiles: Tile[]
): boolean {
  const positions = COLOR_GROUPS[color] ?? [];
  return positions.every((pos) => {
    const t = allTiles[pos];
    return (
      t &&
      t.type === 'property' &&
      (t as PropertyTile).ownerId === ownerId &&
      !(t as PropertyTile).mortgaged
    );
  });
}
