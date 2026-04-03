import { ActionCard } from '../engine/types';

// Amounts mirror standard Monopoly (German edition).
// Jackpot = Free Parking pool — all penalties flow there.

export const COMMUNITY_CHEST_CARDS: Omit<ActionCard, 'id'>[] = [
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 200,
    text: 'Bankfehler zu deinen Gunsten – Erhalte 200€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 50,
    text: 'Arztrechnung – Zahle 50€',
  },
  {
    deckType: 'community_chest',
    type: 'move_to',
    position: 0,
    text: 'Rücke vor zu Los – Erhalte 400€',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 20,
    text: 'Steuerrückerstattung – Erhalte 20€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 100,
    text: 'Krankenhausgebühr – Zahle 100€',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 25,
    text: 'Lebensversicherung wird fällig – Erhalte 25€',
  },
  {
    deckType: 'community_chest',
    type: 'go_to_jail',
    text: 'Gehe ins Gefängnis – Gehe direkt dorthin',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_players',
    amount: 10,
    text: 'Du hast Geburtstag! Jeder Mitspieler zahlt dir 10€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 50,
    text: 'Schulgebühren – Zahle 50€',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 100,
    text: 'Erbschaft – Erhalte 100€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 25,
    text: 'Versicherungsbeitrag – Zahle 25€',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 50,
    text: 'Zinsen auf Sparguthaben – Erhalte 50€',
  },
  {
    deckType: 'community_chest',
    type: 'repair_costs',
    houseCost: 40,
    hotelCost: 115,
    text: 'Hausreparaturen – Zahle 40€ je Haus, 115€ je Hotel',
  },
  {
    deckType: 'community_chest',
    type: 'collect_from_bank',
    amount: 10,
    text: 'Zweiter Preis beim Schönheitswettbewerb – Erhalte 10€',
  },
  {
    deckType: 'community_chest',
    type: 'pay_to_jackpot',
    amount: 50,
    text: 'Steuernachzahlung – Zahle 50€',
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
    position: 27,
    text: 'Rücke vor zum Schlossplatz',
  },
  {
    deckType: 'chance',
    type: 'move_to',
    position: 5,
    text: 'Fahre zum Hauptbahnhof Wiesbaden',
  },
  {
    deckType: 'chance',
    type: 'move_to',
    position: 20,
    text: 'Fahre in die Goldgasse',
  },
  {
    deckType: 'chance',
    type: 'collect_from_bank',
    amount: 50,
    text: 'Dividendenzahlung – Erhalte 50€',
  },
  {
    deckType: 'chance',
    type: 'pay_to_jackpot',
    amount: 15,
    text: 'Strafzettel wegen Falschparkens – Zahle 15€',
  },
  {
    deckType: 'chance',
    type: 'go_to_jail',
    text: 'Gehe ins Gefängnis – Gehe direkt dorthin',
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
    amount: 150,
    text: 'Ihre Hypothek wird fällig – Erhalte 150€',
  },
  {
    deckType: 'chance',
    type: 'pay_to_jackpot',
    amount: 75,
    text: 'Straßenreparaturen – Zahle 75€',
  },
  {
    deckType: 'chance',
    type: 'collect_from_players',
    amount: 50,
    text: 'Du wirst zum Stadtrat ernannt – Jeder Mitspieler zahlt dir 50€',
  },
  {
    deckType: 'chance',
    type: 'move_to',
    position: 0,
    text: 'Rücke vor zu Los – Erhalte 400€',
  },
  {
    deckType: 'chance',
    type: 'repair_costs',
    houseCost: 25,
    hotelCost: 100,
    text: 'Allgemeine Reparaturen – Zahle 25€ je Haus, 100€ je Hotel',
  },
  {
    deckType: 'chance',
    type: 'pay_to_jackpot',
    amount: 15,
    text: 'Arme-Steuer – Zahle 15€',
  },
  {
    deckType: 'chance',
    type: 'collect_from_bank',
    amount: 150,
    text: 'Reifeprüfung bestanden – Erhalte 150€',
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
    text: 'Bußgeld wegen Ruhestörung – Zahle 50€',
  },
];
