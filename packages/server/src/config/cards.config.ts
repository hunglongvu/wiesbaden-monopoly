import { ActionCard } from '../engine/types';

export const COMMUNITY_CHEST_CARDS: Omit<ActionCard, 'id'>[] = [
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 100,
    text: 'Du erhältst ein Gehalt von 100€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 50,
    text: 'Arztrechnung: Zahle 50€',
  },
  {
    deckType: 'community_chest',
    type: 'move_to',
    position: 0,
    text: 'Gehe zu Los. Erhalte 400€',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 20,
    text: 'Steuerrückerstattung: Erhalte 20€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 40,
    text: 'Krankenhausgebühr: Zahle 40€',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 50,
    text: 'Bankfehler zu deinen Gunsten: Erhalte 50€',
  },
  {
    deckType: 'community_chest',
    type: 'go_to_jail',
    text: 'Gehe ins Gefängnis',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_players',
    amount: 20,
    text: 'Du hast Geburtstag! Jeder Mitspieler zahlt dir 20€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 60,
    text: 'Schulgebühren: Zahle 60€',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 80,
    text: 'Erbschaft: Erhalte 80€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 30,
    text: 'Versicherungsbeitrag: Zahle 30€',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 25,
    text: 'Zinserträge: Erhalte 25€',
  },
  {
    deckType: 'community_chest',
    type: 'repair_costs',
    houseCost: 25,
    hotelCost: 80,
    text: 'Hausreparaturen: Zahle 25€ pro Haus, 80€ pro Hotel',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 45,
    text: 'Lottogewinn: Erhalte 45€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 20,
    text: 'Strafzettel: Zahle 20€',
  },
  {
    deckType: 'community_chest',
    type: 'move_to_nearest_railroad',
    text: 'Fahre zum nächsten Bahnhof',
  },
];

export const CHANCE_CARDS: Omit<ActionCard, 'id'>[] = [
  {
    deckType: 'chance',
    type: 'move_to',
    position: 39,
    text: 'Fahre zum Schlossplatz',
  },
  {
    deckType: 'chance',
    type: 'move_to',
    position: 5,
    text: 'Fahre zum Hauptbahnhof',
  },
  {
    deckType: 'chance',
    type: 'move_to',
    position: 24,
    text: 'Fahre in die Langgasse',
  },
  {
    deckType: 'chance',
    type: 'collect_from_bank',
    amount: 50,
    text: 'Dividendenzahlung: Erhalte 50€',
  },
  {
    deckType: 'chance',
    type: 'pay_to_jackpot',
    amount: 40,
    text: 'Straßenbauabgabe: Zahle 40€',
  },
  {
    deckType: 'chance',
    type: 'go_to_jail',
    text: 'Gehe ins Gefängnis',
  },
  {
    deckType: 'chance',
    type: 'move_back',
    spaces: 3,
    text: 'Gehe 3 Felder zurück',
  },
  {
    deckType: 'chance',
    type: 'collect_from_bank',
    amount: 70,
    text: 'Baukredit fällig: Erhalte 70€',
  },
  {
    deckType: 'chance',
    type: 'pay_to_jackpot',
    amount: 80,
    text: 'Strafen und Gebühren: Zahle 80€',
  },
  {
    deckType: 'chance',
    type: 'collect_from_players',
    amount: 30,
    text: 'Du wirst zum Stadtrat ernannt! Jeder zahlt dir 30€',
  },
  {
    deckType: 'chance',
    type: 'move_to',
    position: 0,
    text: 'Fahre zu Los',
  },
  {
    deckType: 'chance',
    type: 'repair_costs',
    houseCost: 35,
    hotelCost: 100,
    text: 'Straßenreparaturen: Zahle 35€ pro Haus, 100€ pro Hotel',
  },
  {
    deckType: 'chance',
    type: 'pay_to_jackpot',
    amount: 20,
    text: 'Parkstrafe: Zahle 20€',
  },
  {
    deckType: 'chance',
    type: 'collect_from_bank',
    amount: 100,
    text: 'Gewinn aus Kreuzworträtsel: Erhalte 100€',
  },
  {
    deckType: 'chance',
    type: 'move_to',
    position: 11,
    text: 'Fahre in die Taunusstraße',
  },
  {
    deckType: 'chance',
    type: 'pay_to_jackpot',
    amount: 50,
    text: 'Bußgeld für Falschparken: Zahle 50€',
  },
];
