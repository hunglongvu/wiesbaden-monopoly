import { ActionCard, Player, Tile } from './types';
/**
 * Create and shuffle a deck of cards.
 */
export declare function createDeck(deckType: 'chance' | 'community_chest'): ActionCard[];
/**
 * Shuffle a deck using Fisher-Yates algorithm.
 */
export declare function shuffleDeck(deck: ActionCard[]): ActionCard[];
/**
 * Draw the top card from a deck.
 * Returns the card and the remaining deck (card goes to bottom).
 */
export declare function drawCard(deck: ActionCard[]): {
    card: ActionCard;
    remainingDeck: ActionCard[];
} | null;
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
export declare function applyCardEffect(card: ActionCard, player: Player, allPlayers: Player[], tiles: Tile[], config: {
    jailPosition: number;
    goPassReward: number;
    goLandReward: number;
    goPosition: number;
}): CardEffectResult;
//# sourceMappingURL=cardSystem.d.ts.map