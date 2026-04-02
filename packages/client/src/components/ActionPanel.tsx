import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Player, Tile, PropertyTile, RailroadTile, UtilityTile } from '../types';
import { playCoinBuy, playRentPay, playDiceRoll } from '../sounds';

// ── Dice face component ───────────────────────────────────────────────────────

const DOT_GRID: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 75], [75, 25]],
  3: [[25, 75], [50, 50], [75, 25]],
  4: [[25, 25], [25, 75], [75, 25], [75, 75]],
  5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
  6: [[25, 25], [50, 25], [75, 25], [25, 75], [50, 75], [75, 75]],
};

function DieFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = DOT_GRID[value] ?? DOT_GRID[1];
  return (
    <div style={{
      width: 44, height: 44, background: '#f1f5f9', borderRadius: 10,
      position: 'relative', flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.8)',
      animation: rolling ? 'diceShake 0.45s ease both' : 'none',
    }}>
      {dots.map(([top, left], i) => (
        <div key={i} style={{
          position: 'absolute', width: 8, height: 8, borderRadius: '50%',
          background: '#1e293b',
          top: `${top}%`, left: `${left}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
        }} />
      ))}
    </div>
  );
}

// ── Action Panel ──────────────────────────────────────────────────────────────

interface Props {
  gameState: GameState;
  myPlayerId: string;
  socket: Socket;
  onOpenTrade: () => void;
  onOpenMortgage: () => void;
}

export default function ActionPanel({ gameState, myPlayerId, socket, onOpenTrade, onOpenMortgage }: Props) {
  const { currentTurn, players, tiles, config, jackpot } = gameState;
  const isMyTurn = currentTurn.playerId === myPlayerId;
  const me = players.find((p) => p.id === myPlayerId);

  // Track dice roll animation
  const prevDice = useRef<[number, number] | undefined>(undefined);
  const [rollingAnim, setRollingAnim] = useState(false);

  useEffect(() => {
    const d = currentTurn.diceRoll;
    if (d && (d[0] !== prevDice.current?.[0] || d[1] !== prevDice.current?.[1])) {
      prevDice.current = d;
      setRollingAnim(true);
      setTimeout(() => setRollingAnim(false), 500);
    }
  }, [currentTurn.diceRoll]);

  if (!me || me.isBankrupt) {
    return (
      <Panel>
        <div style={{ textAlign: 'center', color: '#546a8a', padding: '1rem', fontSize: 14 }}>
          {me?.isBankrupt ? '💸 Du bist bankrott' : 'Zuschauer-Modus'}
        </div>
      </Panel>
    );
  }

  const phase   = currentTurn.phase;
  const pending = currentTurn.pendingAction;

  return (
    <Panel>
      {/* Turn indicator */}
      <div style={{
        padding: '6px 10px', borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: 600,
        background: isMyTurn ? 'rgba(34,211,163,0.1)' : 'rgba(84,106,138,0.1)',
        border: `1px solid ${isMyTurn ? 'rgba(34,211,163,0.25)' : 'rgba(84,106,138,0.2)'}`,
        color: isMyTurn ? '#22d3a3' : '#546a8a',
      }}>
        {isMyTurn
          ? '🎯 Du bist am Zug'
          : `⏳ ${players.find((p) => p.id === currentTurn.playerId)?.name ?? '...'} ist am Zug`}
      </div>

      {/* Dice display */}
      {currentTurn.diceRoll && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '10px 0',
          animation: 'slideUp 0.25s ease both',
        }}>
          <DieFace value={currentTurn.diceRoll[0]} rolling={rollingAnim} />
          <div style={{ color: '#546a8a', fontSize: 18, fontWeight: 300 }}>+</div>
          <DieFace value={currentTurn.diceRoll[1]} rolling={rollingAnim} />
          <div style={{ color: '#546a8a', fontSize: 18, fontWeight: 300 }}>=</div>
          <div style={{
            minWidth: 36, height: 36, borderRadius: 8,
            background: currentTurn.isDoubles ? '#f5a623' : '#1a2540',
            border: `1px solid ${currentTurn.isDoubles ? '#f5a623' : '#1e3a5f'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 18,
            color: currentTurn.isDoubles ? '#000' : '#22d3a3',
          }}>
            {currentTurn.diceRoll[0] + currentTurn.diceRoll[1]}
          </div>
          {currentTurn.isDoubles && (
            <div style={{
              background: '#f5a623', color: '#000', fontSize: 10, fontWeight: 800,
              padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em',
              animation: 'bounceIn 0.4s cubic-bezier(0.36,0.07,0.19,0.97) both',
            }}>
              PASCH!
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Roll dice */}
        {isMyTurn && phase === 'waiting_for_roll' && !me.inJail && (
          <BigBtn onClick={() => socket.emit('game:roll_dice')} color="#e84393">
            🎲 Würfeln
          </BigBtn>
        )}

        {/* Jail options */}
        {isMyTurn && phase === 'waiting_for_roll' && me.inJail && (
          <JailSection me={me} config={config} socket={socket} />
        )}

        {/* Buy option */}
        {isMyTurn && phase === 'buy_or_auction' && pending?.type === 'buy_property' && (
          <BuySection tilePos={pending.tilePosition} tiles={tiles} money={me.money} socket={socket} />
        )}

        {/* Build option */}
        {isMyTurn && phase === 'build_option' && pending?.type === 'build_house' && (
          <BuildSection tilePos={pending.tilePosition} tiles={tiles} money={me.money} socket={socket} />
        )}

        {/* Pay rent inline – tax/repair are EventCardModal */}
        {isMyTurn && phase === 'tile_action' && pending?.type === 'pay_rent' && (
          <PaySection pending={pending} players={players} socket={socket} />
        )}

        {/* End turn */}
        {isMyTurn && phase === 'end_turn' && (
          <BigBtn onClick={() => socket.emit('game:end_turn')} color="#22d3a3" dark>
            ✓ Zug beenden
          </BigBtn>
        )}
      </div>

      {/* Side actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <SideBtn onClick={onOpenMortgage}>🏦 Hypotheken</SideBtn>
        <SideBtn onClick={onOpenTrade}>🤝 Handel</SideBtn>
      </div>

      {/* Jackpot */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '7px 10px', borderRadius: 8, background: '#120f00',
        border: '1px solid #2a2000',
      }}>
        <span style={{ fontSize: 12, color: '#8a7a30' }}>🅿 Jackpot</span>
        <span style={{
          fontSize: 16, fontWeight: 800, color: '#f5a623',
          animation: jackpot.amount > 0 ? 'jackpotPulse 2s ease-in-out infinite' : 'none',
        }}>
          {jackpot.amount.toLocaleString('de-DE')}€
        </span>
      </div>
    </Panel>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#111827', borderRadius: 12, padding: 12,
      border: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {children}
    </div>
  );
}

function BigBtn({ onClick, color, dark, children, disabled }: {
  onClick: () => void; color: string; dark?: boolean;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '13px 12px', border: 'none', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', minHeight: 44,
      background: disabled ? '#1a2540' : color, color: disabled ? '#546a8a' : (dark ? '#000' : '#fff'),
      fontWeight: 700, fontSize: 14, transition: 'opacity 0.15s, transform 0.1s',
      fontFamily: 'inherit',
    }}
    onMouseDown={(e) => { if (!disabled) (e.currentTarget.style.transform = 'scale(0.97)'); }}
    onMouseUp={(e)   => { (e.currentTarget.style.transform = 'scale(1)'); }}>
      {children}
    </button>
  );
}

function SmallBtn({ onClick, children, outline }: {
  onClick: () => void; children: React.ReactNode; outline?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
      background: outline ? 'transparent' : '#1a2540',
      border: `1px solid ${outline ? '#546a8a' : '#1e3a5f'}`,
      color: outline ? '#8899b4' : '#c8d8f0',
      transition: 'background 0.15s', fontFamily: 'inherit',
    }}>
      {children}
    </button>
  );
}

function SideBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 6px', border: '1px solid #1e3a5f', borderRadius: 7,
      background: '#0d1830', color: '#8899b4', cursor: 'pointer', fontSize: 11,
      fontWeight: 500, fontFamily: 'inherit', transition: 'background 0.15s',
    }}>
      {children}
    </button>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0d1830', borderRadius: 8, padding: '8px 10px',
      border: '1px solid #1e3a5f', animation: 'slideUp 0.2s ease both',
    }}>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, margin: '2px 0' }}>
      <span style={{ color: '#8899b4' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor ?? '#e8edf5' }}>{value}</span>
    </div>
  );
}

function JailSection({ me, config, socket }: { me: Player; config: any; socket: Socket }) {
  return (
    <InfoBox>
      <div style={{ color: '#f5a623', fontSize: 12, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
        🔒 Gefängnis – Versuch {me.jailTurns + 1}/3
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <BigBtn
          onClick={() => { playRentPay(); socket.emit('game:pay_jail_fee'); }}
          color="#3b82f6"
          disabled={me.money < config.jailBuyoutCost}
        >
          💰 {config.jailBuyoutCost}€ Kaution
        </BigBtn>
        <BigBtn onClick={() => socket.emit('game:roll_for_jail')} color="#e84393">
          🎲 Auf Pasch würfeln
        </BigBtn>
      </div>
    </InfoBox>
  );
}

function BuySection({ tilePos, tiles, money, socket }: {
  tilePos: number; tiles: Tile[]; money: number; socket: Socket;
}) {
  const tile = tiles[tilePos] as PropertyTile | RailroadTile | UtilityTile;
  const canAfford = money >= tile.price;
  return (
    <InfoBox>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#e8edf5' }}>
        {tile.name}
      </div>
      <Row label="Preis" value={`${tile.price}€`} />
      <Row label="Dein Geld" value={`${money}€`} valueColor={canAfford ? '#22d3a3' : '#ef4444'} />
      {!canAfford && (
        <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>Nicht genug Geld</div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <BigBtn onClick={() => socket.emit('game:buy_property')} color="#22d3a3" dark disabled={!canAfford}>
          Kaufen
        </BigBtn>
        <SmallBtn onClick={() => socket.emit('game:decline_property')} outline>
          Überspringen
        </SmallBtn>
      </div>
    </InfoBox>
  );
}

function BuildSection({ tilePos, tiles, money, socket }: {
  tilePos: number; tiles: Tile[]; money: number; socket: Socket;
}) {
  const tile = tiles[tilePos] as PropertyTile;
  const canAfford = money >= tile.housePrice;
  const next = tile.houses === 4 ? 'Hotel' : `${tile.houses + 1}. Haus`;
  const newRent = tile.houses < 4 ? tile.rent[tile.houses + 1] : tile.rent[5];
  return (
    <InfoBox>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#e8edf5' }}>
        🏗 Bauen: {tile.name}
      </div>
      <Row label="Nächste Stufe" value={next} valueColor="#22d3a3" />
      <Row label="Neue Miete" value={`${newRent}€`} valueColor="#f5a623" />
      <Row label="Kosten" value={`${tile.housePrice}€`} valueColor={canAfford ? '#22d3a3' : '#ef4444'} />
      <div style={{
        fontSize: 10, color: '#f5a623', marginTop: 6, padding: '4px 6px',
        background: 'rgba(245,166,35,0.08)', borderRadius: 4, border: '1px solid rgba(245,166,35,0.2)',
      }}>
        ⚡ Sonderregel: Nur beim Landen möglich
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <BigBtn
          onClick={() => socket.emit('game:build_house', { tilePosition: tilePos })}
          color="#22d3a3" dark disabled={!canAfford}
        >
          Bauen ({tile.housePrice}€)
        </BigBtn>
        <SmallBtn onClick={() => socket.emit('game:decline_build')} outline>
          Skip
        </SmallBtn>
      </div>
    </InfoBox>
  );
}

function PaySection({ pending, players, socket }: { pending: any; players: Player[]; socket: Socket }) {
  const isRent   = pending.type === 'pay_rent';
  const isTax    = pending.type === 'pay_tax';
  const creditor = isRent ? players.find((p: Player) => p.id === pending.toPlayerId) : null;

  return (
    <div style={{
      background: '#1a0808', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
      padding: '10px 12px', textAlign: 'center', animation: 'slideUp 0.2s ease both',
    }}>
      <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>
        {isRent ? '🏠 Miete fällig' : isTax ? '🏛 Steuer fällig' : '🔧 Reparaturkosten'}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#e8edf5', margin: '6px 0' }}>
        {pending.amount}€
      </div>
      <div style={{ fontSize: 11, color: '#8899b4', marginBottom: 8 }}>
        {isRent ? `→ ${creditor?.name ?? 'Spieler'}` : '→ Jackpot'}
      </div>
      <button onClick={() => socket.emit('game:confirm_action')} style={{
        width: '100%', padding: '8px', border: 'none', borderRadius: 7,
        background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13,
        fontFamily: 'inherit',
      }}>
        💸 Bezahlen
      </button>
    </div>
  );
}
