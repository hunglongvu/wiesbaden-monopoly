export interface DiceRoll {
  die1: number;
  die2: number;
  total: number;
  isDoubles: boolean;
}

/**
 * Roll two dice, each producing a value between 1 and 6.
 */
export function rollDice(): DiceRoll {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return {
    die1,
    die2,
    total: die1 + die2,
    isDoubles: die1 === die2,
  };
}

/**
 * Create a deterministic dice roll (for testing).
 */
export function createDiceRoll(die1: number, die2: number): DiceRoll {
  if (die1 < 1 || die1 > 6 || die2 < 1 || die2 > 6) {
    throw new Error(`Invalid dice values: ${die1}, ${die2}`);
  }
  return {
    die1,
    die2,
    total: die1 + die2,
    isDoubles: die1 === die2,
  };
}
