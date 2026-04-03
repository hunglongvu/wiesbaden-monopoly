import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Player, Tile, PropertyTile, RailroadTile, UtilityTile } from '../types';
import { playCoinBuy, playRentPay, playDiceRoll } from '../sounds';

const S = '#ffffff';          // surface
const B = '#d0c4aa';          // border
const T = '#1a1510';          // text
const T2 = '#6b5a42';         // text2
const T3 = '#9e8e78';         // text3
const ACCENT = '#e8357a';
const GREEN = '#16884a';

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
      width: 48, height: 48, background: '#fff',
      borderRadius: 12, position: 'relative', flexShrink: 0,
      border: `1px solid ${B}`,
      boxShadow: rolling
        ? '0 0 0 3px rgba(232,53,122,0.3), 0 4px 12px rgba(26,20,12,0.15)'
        : '0 3px 8px rgba(26,20,12,0.12)',
      animation: rolling ? 'diceShake 0.45s ease both' : 'none',
    }}>
      {dots.map(([top, left], i) => (
        <div key={i} style={{
          position: 'absolute', width: 8, height: 8, borderRadius: '50%',
          background: T, top: `${top}%`, left: `${left}%`,
          transform: 'translate(-50%, -50%)',
        }} />
      ))}
    </div>
  );
}

interface Props {
  gameState: GameState; myPlayerId: string; socket: Socket;
  onOpenTrade: () => void; onOpenMortgage: () => void;
}

export default function ActionPanel({ gameState, myPlayerId, socket, onOpenTrade, onOpenMortgage }: Props) {
  const { currentTurn, players, tiles, config, jackpot } = gameState;
  const isMyTurn = currentTurn.playerId === myPlayerId;
  const me = players.find((p) => p.id === myPlayerId);

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
        <div style={{ textAlign: 'center', color: T3, padding: '1.5rem', fontSize: 14 }}>
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
        padding: '10px 14px', borderRadius: 10, textAlign: 'center',
        fontSize: 14, fontWeight: 700,
        background: isMyTurn ? '#e8357a14' : 'rgba(26,20,12,0.04)',
        border: `1px solid ${isMyTurn ? '#e8357a44' : B}`,
        color: isMyTurn ? ACCENT : T3,
      }}>
        {isMyTurn
          ? '🎯 Du bist am Zug'
          : `⏳ ${players.find((p) => p.id === currentTurn.playerId)?.name ?? '...'} ist am Zug`}
      </div>

      {/* Dice */}
      {currentTurn.diceRoll && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '10px 0', animation: 'slideUp 0.25s ease both',
        }}>
          <DieFace value={currentTurn.diceRoll[0]} rolling={rollingAnim} />
          <div style={{ color: T3, fontSize: 18, fontWeight: 300 }}>+</div>
          <DieFace value={currentTurn.diceRoll[1]} rolling={rollingAnim} />
          <div style={{ color: T3, fontSize: 18, fontWeight: 300 }}>=</div>
          <div style={{
            minWidth: 42, height: 42, borderRadius: 10,
            background: currentTurn.isDoubles ? '#c47d0a' : '#f5f0e6',
            border: `1px solid ${currentTurn.isDoubles ? '#c47d0a' : B}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 20,
            color: currentTurn.isDoubles ? '#fff' : T,
          }}>
            {currentTurn.diceRoll[0] + currentTurn.diceRoll[1]}
          </div>
          {currentTurn.isDoubles && (
            <div style={{
              background: '#c47d0a', color: '#fff', fontSize: 10, fontWeight: 800,
              padding: '3px 7px', borderRadius: 6, letterSpacing: '0.05em',
              animation: 'bounceIn 0.4s cubic-bezier(0.36,0.07,0.19,0.97) both',
            }}>PASCH!</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {isMyTurn && phase === 'waiting_for_roll' && !me.inJail && (
          <BigBtn onClick={() => { playDiceRoll(); socket.emit('game:roll_dice'); }} color={ACCENT} light>
            🎲 Würfeln
          </BigBtn>
        )}
        {isMyTurn && phase === 'waiting_for_roll' && me.inJail && (
          <JailSection me={me} config={config} socket={socket} />
        )}
        {isMyTurn && phase === 'buy_or_auction' && pending?.type === 'buy_property' && (
          <BuySection tilePos={pending.tilePosition} tiles={tiles} money={me.money} socket={socket} />
        )}
        {isMyTurn && phase === 'build_option' && pending?.type === 'build_house' && (
          <BuildSection tilePos={pending.tilePosition} tiles={tiles} money={me.money} socket={socket} />
        )}
        {isMyTurn && phase === 'tile_action' && pending?.type === 'pay_rent' && (
          <PaySection pending={pending} players={players} socket={socket} />
        )}
        {isMyTurn && phase === 'end_turn' && (
          <BigBtn onClick={() => socket.emit('game:end_turn')} color={GREEN} light>
            ✓ Zug beenden
          </BigBtn>
        )}
      </div>

      {/* Side actions */}
      <div style={{ display: 'flex', gap: 7 }}>
        <SideBtn onClick={onOpenMortgage}>🏦 Hypotheken</SideBtn>
        <SideBtn onClick={onOpenTrade}>🤝 Handel</SideBtn>
      </div>

      {/* Jackpot */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderRadius: 10,
        background: '#fff8e8', border: '1px solid #d4a01233',
      }}>
        <span style={{ fontSize: 12, color: '#9a7820', fontWeight: 600 }}>🅿 Freiparken-Jackpot</span>
        <span style={{
          fontSize: 17, fontWeight: 900, color: '#c47d0a',
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
      background: S, borderRadius: 14, padding: 14,
      border: `1px solid ${B}`,
      display: 'flex', flexDirection: 'column', gap: 9,
      boxShadow: '0 2px 12px rgba(26,20,12,0.1)',
    }}>
      {children}
    </div>
  );
}

function BigBtn({ onClick, color, light, children, disabled }: {
  onClick: () => void; color: string; light?: boolean;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '14px 12px', border: 'none', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
      minHeight: 48, fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
      background: disabled ? '#f5f0e6' : color,
      color: disabled ? T3 : (light ? '#fff' : T),
      boxShadow: disabled ? 'none' : `0 3px 10px ${color}44`,
      transition: 'transform 0.1s, box-shadow 0.1s',
    }}
    onMouseDown={(e) => { if (!disabled) { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = 'none'; }}}
    onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = disabled ? 'none' : `0 3px 10px ${color}44`; }}>
      {children}
    </button>
  );
}

function SmallBtn({ onClick, children, outline }: { onClick: () => void; children: React.ReactNode; outline?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
      background: outline ? 'transparent' : '#f5f0e6',
      border: `1px solid ${outline ? B : '#d0c4aa'}`,
      color: T2, transition: 'background 0.15s', fontFamily: 'inherit',
    }}>
      {children}
    </button>
  );
}

function SideBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '9px 8px', border: `1px solid ${B}`, borderRadius: 9,
      background: '#f5f0e6', color: T2, cursor: 'pointer', fontSize: 12,
      fontWeight: 600, fontFamily: 'inherit', transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = '#ede8dc')}
    onMouseLeave={(e) => (e.currentTarget.style.background = '#f5f0e6')}>
      {children}
    </button>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#f5f0e6', borderRadius: 10, padding: '10px 12px',
      border: `1px solid ${B}`, animation: 'slideUp 0.2s ease both',
    }}>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, margin: '2px 0' }}>
      <span style={{ color: T2 }}>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor ?? T }}>{value}</span>
    </div>
  );
}

function JailSection({ me, config, socket }: { me: Player; config: any; socket: Socket }) {
  return (
    <InfoBox>
      <div style={{ color: '#c47d0a', fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        🔒 Gefängnis — Versuch {me.jailTurns + 1}/3
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <BigBtn onClick={() => { playRentPay(); socket.emit('game:pay_jail_fee'); }} color="#2252c8" light disabled={me.money < config.jailBuyoutCost}>
          💰 {config.jailBuyoutCost}€ Kaution zahlen
        </BigBtn>
        <BigBtn onClick={() => socket.emit('game:roll_for_jail')} color={ACCENT} light>
          🎲 Auf Pasch würfeln
        </BigBtn>
      </div>
    </InfoBox>
  );
}

function BuySection({ tilePos, tiles, money, socket }: { tilePos: number; tiles: Tile[]; money: number; socket: Socket }) {
  const tile = tiles[tilePos] as PropertyTile | RailroadTile | UtilityTile;
  const canAfford = money >= tile.price;
  return (
    <InfoBox>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: T }}>{tile.name}</div>
      <Row label="Preis" value={`${tile.price}€`} />
      <Row label="Dein Geld" value={`${money}€`} valueColor={canAfford ? GREEN : '#c42828'} />
      {!canAfford && (
        <div style={{ color: '#c42828', fontSize: 11, marginTop: 4 }}>Nicht genug Geld</div>
      )}
      <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
        <BigBtn onClick={() => { playCoinBuy(); socket.emit('game:buy_property'); }} color={GREEN} light disabled={!canAfford}>
          Kaufen ({tile.price}€)
        </BigBtn>
        <SmallBtn onClick={() => socket.emit('game:decline_property')} outline>
          Überspringen
        </SmallBtn>
      </div>
    </InfoBox>
  );
}

function BuildSection({ tilePos, tiles, money, socket }: { tilePos: number; tiles: Tile[]; money: number; socket: Socket }) {
  const tile = tiles[tilePos] as PropertyTile;
  const canAfford = money >= tile.housePrice;
  const next = tile.houses === 4 ? 'Hotel' : `${tile.houses + 1}. Haus`;
  const newRent = tile.houses < 4 ? tile.rent[tile.houses + 1] : tile.rent[5];
  return (
    <InfoBox>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: T }}>🏗 Bauen: {tile.name}</div>
      <Row label="Nächste Stufe" value={next} valueColor={GREEN} />
      <Row label="Neue Miete" value={`${newRent}€`} valueColor="#c47d0a" />
      <Row label="Kosten" value={`${tile.housePrice}€`} valueColor={canAfford ? GREEN : '#c42828'} />
      <div style={{
        fontSize: 10, color: '#c47d0a', marginTop: 8, padding: '5px 8px',
        background: '#c47d0a10', borderRadius: 6, border: '1px solid #c47d0a22',
      }}>
        ⚡ Nur beim Landen auf eigenem Feld möglich
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
        <BigBtn onClick={() => socket.emit('game:build_house', { tilePosition: tilePos })} color={GREEN} light disabled={!canAfford}>
          Bauen ({tile.housePrice}€)
        </BigBtn>
        <SmallBtn onClick={() => socket.emit('game:decline_build')} outline>Überspringen</SmallBtn>
      </div>
    </InfoBox>
  );
}

function PaySection({ pending, players, socket }: { pending: any; players: Player[]; socket: Socket }) {
  const creditor = pending.type === 'pay_rent' ? players.find((p: Player) => p.id === pending.toPlayerId) : null;
  return (
    <div style={{
      background: '#fff5f5', border: '1px solid #c4282830',
      borderRadius: 10, padding: '12px 14px', textAlign: 'center',
      animation: 'slideUp 0.2s ease both',
    }}>
      <div style={{ fontSize: 13, color: '#c42828', fontWeight: 700, marginBottom: 6 }}>
        {pending.type === 'pay_rent' ? '🏠 Miete fällig' : '🏛 Steuer fällig'}
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: T, margin: '6px 0' }}>{pending.amount}€</div>
      <div style={{ fontSize: 12, color: T2, marginBottom: 10 }}>
        {creditor ? `→ ${creditor.name}` : '→ Jackpot'}
      </div>
      <button onClick={() => socket.emit('game:confirm_action')} style={{
        width: '100%', padding: '10px', border: 'none', borderRadius: 9,
        background: '#c42828', color: '#fff', cursor: 'pointer',
        fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
      }}>
        💸 Jetzt bezahlen
      </button>
    </div>
  );
}
