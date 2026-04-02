export type TileType =
  | 'go'
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'community_chest'
  | 'jail'
  | 'go_to_jail'
  | 'free_parking';

export type PropertyColor =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue';

export interface BaseTile {
  position: number;
  name: string;
  type: TileType;
}

export interface GoTile extends BaseTile {
  type: 'go';
}

export interface JailTile extends BaseTile {
  type: 'jail';
}

export interface GoToJailTile extends BaseTile {
  type: 'go_to_jail';
}

export interface FreeParkingTile extends BaseTile {
  type: 'free_parking';
}

export interface TaxTile extends BaseTile {
  type: 'tax';
  amount: number;
}

export interface ChanceTile extends BaseTile {
  type: 'chance';
}

export interface CommunityChestTile extends BaseTile {
  type: 'community_chest';
}

export interface PropertyTile extends BaseTile {
  type: 'property';
  color: PropertyColor;
  price: number;
  housePrice: number;
  rent: [number, number, number, number, number, number]; // [base, 1h, 2h, 3h, 4h, hotel]
  ownerId?: string;
  houses: number; // 0-4 = houses, 5 = hotel
  mortgaged: boolean;
}

export interface RailroadTile extends BaseTile {
  type: 'railroad';
  price: number;
  ownerId?: string;
  mortgaged: boolean;
}

export interface UtilityTile extends BaseTile {
  type: 'utility';
  price: number;
  ownerId?: string;
  mortgaged: boolean;
}

export type Tile =
  | GoTile
  | JailTile
  | GoToJailTile
  | FreeParkingTile
  | TaxTile
  | ChanceTile
  | CommunityChestTile
  | PropertyTile
  | RailroadTile
  | UtilityTile;

export interface Player {
  id: string;
  name: string;
  color: string;
  money: number;
  position: number;
  inJail: boolean;
  jailTurns: number; // how many turns spent in jail
  isBankrupt: boolean;
  consecutiveDoubles: number;
}

export type CardType =
  | 'collect_from_bank'
  | 'pay_to_jackpot'
  | 'move_to'
  | 'move_back'
  | 'go_to_jail'
  | 'collect_from_players'
  | 'repair_costs'
  | 'move_to_nearest_railroad';

export interface ActionCard {
  id: string;
  deckType: 'chance' | 'community_chest';
  type: CardType;
  text: string;
  amount?: number;
  position?: number;
  spaces?: number;
  houseCost?: number;
  hotelCost?: number;
}

export interface Auction {
  tilePosition: number;
  bids: Record<string, number>; // playerId -> bid amount
  currentBidder: string;
  minimumBid: number;
  highestBid: number;
  highestBidderId?: string;
  passedPlayers: string[];
  active: boolean;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offerMoney: number;
  offerProperties: number[]; // tile positions
  requestMoney: number;
  requestProperties: number[]; // tile positions
  status: 'pending' | 'accepted' | 'rejected';
}

export interface JackpotState {
  amount: number;
}

export interface TurnState {
  playerId: string;
  phase: TurnPhase;
  diceRoll?: [number, number];
  isDoubles?: boolean;
  doublesCount: number;
  mustRollAgain: boolean;
  pendingAction?: PendingAction;
}

export type TurnPhase =
  | 'waiting_for_roll'
  | 'rolling'
  | 'moving'
  | 'tile_action'
  | 'buy_or_auction'
  | 'auction_in_progress'
  | 'build_option'
  | 'jail_decision'
  | 'bankrupt_resolution'
  | 'end_turn';

export type PendingAction =
  | { type: 'buy_property'; tilePosition: number }
  | { type: 'auction'; tilePosition: number }
  | { type: 'build_house'; tilePosition: number }
  | { type: 'jail_decision' }
  | { type: 'card_drawn'; card: ActionCard }
  | { type: 'pay_rent'; amount: number; toPlayerId: string; tilePosition: number }
  | { type: 'pay_tax'; amount: number }
  | { type: 'repair_costs'; amount: number }
  | { type: 'bankrupt'; creditorId?: string };

export interface GameConfig {
  startMoney: number;
  winConditionNetWorth: number;
  goPassReward: number;
  goLandReward: number;
  jailBuyoutCost: number;
  jailPosition: number;
  goPosition: number;
  freeParkingPosition: number;
  goToJailPosition: number;
  maxJailTurns: number;
  auctionStartBid: number;
  mortgageInterestRate: number;
}

export interface GameState {
  id: string;
  players: Player[];
  tiles: Tile[];
  currentTurn: TurnState;
  jackpot: JackpotState;
  auction?: Auction;
  pendingTrades: TradeOffer[];
  gamePhase: 'lobby' | 'playing' | 'finished';
  winner?: string;
  eventLog: string[];
  chanceDeck: ActionCard[];
  communityChestDeck: ActionCard[];
  config: GameConfig;
  lastCardEvent?: { card: ActionCard; drawnBy: string } | null;
}
