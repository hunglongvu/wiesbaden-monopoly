# Wiesbaden Monopoly

A complete multiplayer browser game in the style of classic Monopoly, themed around the city of Wiesbaden, Germany.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + TypeScript + Express |
| Realtime | Socket.IO |
| Tests | Vitest |
| Package Manager | npm workspaces |

## Project Structure

```
wiesbaden-monopoly/
├── package.json              # workspace root
├── packages/
│   ├── server/               # Node.js game server
│   │   ├── src/
│   │   │   ├── engine/       # Pure game logic modules
│   │   │   ├── config/       # Board & card configurations
│   │   │   └── socket/       # Socket.IO event handlers
│   │   └── tests/            # Vitest unit tests
│   └── client/               # React SPA
│       └── src/
│           └── components/   # UI components + modals
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm 9+

### Install

```bash
git clone <repo-url>
cd wiesbaden-monopoly
npm install
```

### Run Locally

In separate terminals:

```bash
# Terminal 1: Start the game server (port 3001)
npm run dev --workspace=packages/server

# Terminal 2: Start the frontend (port 5173)
npm run dev --workspace=packages/client
```

Then open http://localhost:5173 in 2–4 browser tabs to play.

### Run Tests

```bash
npm test
# or specifically:
npm run test --workspace=packages/server
```

### Build for Production

```bash
npm run build
```

---

## Architecture Overview

The server is **authoritative** — all game state lives on the server, clients only send actions and receive state updates. This prevents cheating and keeps logic consistent.

### Server Architecture

```
gameEngine.ts         Main state machine — handles all player actions
├── dice.ts           Random dice rolling + deterministic testing helpers
├── movement.ts       Board movement + GO bonus calculation
├── tileResolver.ts   What happens when landing on each tile type
├── rentCalculation.ts Property/railroad/utility rent calculation
├── propertyManagement.ts Buy/mortgage/house/sell logic + net worth
├── jailSystem.ts     Jail entry/exit, jail fee, consecutive doubles
├── jackpotSystem.ts  Free Parking jackpot accumulation/collection
├── cardSystem.ts     Card deck management + effect application
├── auctionSystem.ts  Auction bidding/passing/resolution
├── tradeSystem.ts    Trade proposal/validation/execution
├── winCondition.ts   Net worth calculation + win detection
└── turnManager.ts    Turn advancement
```

### Client Architecture

```
App.tsx               Socket connection + top-level routing
├── Lobby.tsx         Player name input, join, start
├── Game.tsx          Main game layout + modal management
│   ├── Board.tsx     40-tile visual board with player tokens
│   ├── PlayerPanel.tsx Player cards with money, net worth, properties
│   ├── ActionPanel.tsx Context-aware action buttons for active player
│   ├── EventLog.tsx  Scrolling log of last 20 game events
│   └── modals/
│       ├── BuyModal.tsx      Property purchase decision
│       ├── BuildModal.tsx    House/hotel building prompt
│       ├── AuctionModal.tsx  Live auction with bidding
│       ├── TradeModal.tsx    Trade proposal + incoming offer review
│       └── MortgageModal.tsx Mortgage/unmortgage/sell-house panel
```

### Socket Events

**Client → Server:**
- `game:join` — join the lobby with a player name
- `game:start` — host starts the game (needs 2+ players)
- `game:roll_dice` — roll dice on your turn
- `game:buy_property` — buy the property you landed on
- `game:decline_property` — start an auction instead
- `game:auction_bid { amount }` — place a bid in the current auction
- `game:auction_pass` — pass your bid turn in the auction
- `game:build_house { tilePosition }` — build a house on landing tile
- `game:decline_build` — skip the build option
- `game:mortgage_property { tilePosition }` — mortgage a property
- `game:unmortgage_property { tilePosition }` — pay off a mortgage
- `game:sell_house { tilePosition }` — sell a house/hotel back
- `game:propose_trade { ... }` — propose a trade to another player
- `game:accept_trade { tradeId }` — accept an incoming trade
- `game:reject_trade { tradeId }` — reject an incoming trade
- `game:pay_jail_fee` — pay 150€ to exit jail
- `game:roll_for_jail` — roll dice while in jail (attempt doubles)
- `game:confirm_action` — confirm a mandatory payment (rent/tax)
- `game:end_turn` — end your turn when done

**Server → Client:**
- `game:state_update` — full game state (broadcast to all players)
- `game:event` — latest event log message
- `game:error` — error message for the requesting player

---

## Full Game Rules

### Players & Start
- 2 to 4 players
- Each player starts with **1,000 €**
- **Win condition:** total net worth ≥ 8,000 € (cash + property values + building values, evaluated at mortgage values if mortgaged)

### Dice & Movement
- 2 dice rolled each turn (sum 2–12)
- **Doubles (Pasch):** player gets an extra turn
- **3 consecutive doubles:** sent directly to jail (no movement on 3rd roll)

### GO (Los)
- **Passing GO:** receive **200 €**
- **Landing exactly on GO:** receive **400 €**
- These are implemented as logically distinct cases

### Properties
- **Landing on unowned property:** player may buy it at face value
- **If declined or unaffordable:** property goes to auction (all players bid; minimum 1 €; current player bids first)
- **Landing on owned, unmortgaged property:** pay rent to owner
- **Landing on own property:** opportunity to build (see Special Rule)

### Rent
| Type | Calculation |
|------|------------|
| Street, no houses | Base rent (doubled if owner has full color group) |
| 1–4 houses | Rent table index 1–4 |
| Hotel | Rent table index 5 |
| Railroad | 25/50/75/100 € for 1/2/3/4 owned by same player |
| Utility | 4× dice (1 owned) or 10× dice (2 owned) |

### Special House-Building Rule

> **A player may ONLY build a house on their own property when they LAND EXACTLY on that property during their normal move.**

- No building from menus between turns
- Only **ONE upgrade per landing**
- Upgrade sequence: 0 → 1 house → 2 houses → 3 houses → 4 houses → hotel
- **No full color group requirement** (unlike standard Monopoly)
- **No equal distribution requirement** within a color group
- Cannot build on mortgaged properties
- Must have enough money

This rule is enforced server-side: the `build_house` event is only accepted when `currentTurn.pendingAction.type === 'build_house'` and `tilePosition` matches.

### Jackpot (Free Parking) Rule

The jackpot accumulates from:
- All **tax field payments** (income tax 80€, luxury tax 50€)
- All **card penalty payments** (pay_to_jackpot cards)
- **Jail buyout fee** (150€)

**Landing exactly on Free Parking:** player receives the entire jackpot, jackpot resets to 0.

Does **NOT** receive:
- Rent between players
- Property purchase prices
- Auction payments
- House building costs

### Jail
- Player goes to jail via: "Go to Jail" tile, 3 consecutive doubles, matching card
- **Exit options:**
  1. Pay 150 € (→ jackpot) before rolling
  2. Roll doubles (up to 3 attempts over 3 turns)
  3. After 3 failed turns: must pay 150 € then move
- While in jail: can still collect rent, trade, and mortgage properties

### Mortgages
- Mortgage value = **half the purchase price**
- To unmortgage: pay mortgage value × **110%** (10% interest)
- Mortgaged properties earn no rent
- Cannot build on mortgaged properties
- Cannot mortgage a property with houses/hotels (sell buildings first)

### Bankruptcy
1. Cannot pay a debt → must first sell houses/hotels, then mortgage properties
2. If still cannot pay: **bankrupt**
3. Bankrupt to a player: all assets transfer to that player
4. Bankrupt to bank (tax/card): all properties go back to bank (available for future purchase)

### Trading
- Players can trade money ↔ properties and combinations
- Mortgaged properties can be traded (mortgage status shown in trade modal)
- Trade is validated server-side before execution

---

## Configuration

### `packages/server/src/config/board.config.ts`

Contains:
- `BOARD_TILES` — all 40 board tiles with exact Wiesbaden street names, prices, and rent tables
- `DEFAULT_CONFIG` — adjustable game parameters:

```typescript
export const DEFAULT_CONFIG: GameConfig = {
  startMoney: 1000,            // Starting money per player
  winConditionNetWorth: 8000,  // Net worth target to win
  goPassReward: 200,           // Money for passing GO
  goLandReward: 400,           // Money for landing on GO
  jailBuyoutCost: 150,         // Cost to pay out of jail
  maxJailTurns: 3,             // Max turns in jail before forced exit
  auctionStartBid: 1,          // Minimum starting bid in auctions
  mortgageInterestRate: 0.1,   // 10% interest on unmortgaging
  ...
};
```

- `COLOR_GROUPS` — maps color names to tile positions (used for full-group detection)
- `RAILROAD_POSITIONS` — [5, 15, 25, 35]
- `UTILITY_POSITIONS` — [12, 28]

### `packages/server/src/config/cards.config.ts`

Contains all 16 Chance cards and 16 Community Chest cards. Each card has:
- `type` — determines the engine effect
- `text` — displayed to players (German)
- Optional fields: `amount`, `position`, `spaces`, `houseCost`, `hotelCost`

---

## Assumptions & Game Balance

- **MVP single room**: only one game room exists (`main`). Multiple games would require room management.
- **Reconnection**: if a player disconnects during the lobby phase they are removed. During the game their position remains but they cannot act (the game may stall waiting for their turn).
- **Auction endgame**: if all players pass without bidding, the property returns to the bank unowned.
- **Net worth calculation** uses purchase prices (not market values) for properties, and half of housePrice per house level for buildings. This matches the spec's "property values + building values - mortgages" formula.
- **Board is Wiesbaden-themed** but follows standard Monopoly property progression (brown cheapest, dark blue most expensive).
- **Event log** keeps the last 50 events server-side; the client displays the last 20.
- **Socket.IO** handles reconnection automatically (5 attempts with 1-second delay).
