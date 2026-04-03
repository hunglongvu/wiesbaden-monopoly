import React, { useEffect, useRef, useState } from 'react';
import { Player, Tile, PropertyTile, RailroadTile, UtilityTile } from '../types';

const S  = '#ffffff';
const B  = '#d0c4aa';
const T  = '#1a1510';
const T2 = '#6b5a42';
const T3 = '#9e8e78';
const GREEN = '#16884a';

const COLOR_HEX: Record<string, string> = {
  brown:'#8b5e2a', lightblue:'#29b6e8', pink:'#e84393', orange:'#f47316',
  red:'#e03030', yellow:'#d4a012', green:'#1fa854', darkblue:'#2255d4',
};

function netWorth(player: Player, tiles: Tile[]): number {
  let w = player.money;
  for (const t of tiles) {
    if (t.type === 'property') {
      const p = t as PropertyTile;
      if (p.ownerId !== player.id) continue;
      w += p.mortgaged ? Math.floor(p.price / 2) : p.price;
      if (!p.mortgaged && p.houses > 0 && p.houses < 5) w += p.houses * Math.floor(p.housePrice / 2);
      if (!p.mortgaged && p.houses === 5) w += Math.floor(p.housePrice / 2);
    } else if (t.type === 'railroad') {
      const r = t as RailroadTile;
      if (r.ownerId === player.id) w += r.mortgaged ? Math.floor(r.price / 2) : r.price;
    } else if (t.type === 'utility') {
      const u = t as UtilityTile;
      if (u.ownerId === player.id) w += u.mortgaged ? Math.floor(u.price / 2) : u.price;
    }
  }
  return w;
}

function AnimatedNumber({ value, color }: { value: number; color?: string }) {
  const [display, setDisplay] = useState(value);
  const [flash,   setFlash]   = useState<'up' | 'down' | null>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      setFlash(value > prev.current ? 'up' : 'down');
      setTimeout(() => setFlash(null), 700);
      prev.current = value;
    }
    setDisplay(value);
  }, [value]);

  return (
    <span style={{
      color: flash === 'up' ? GREEN : flash === 'down' ? '#c42828' : (color ?? T),
      transition: 'color 0.4s',
      fontWeight: 700,
    }}>
      {display.toLocaleString('de-DE')}€
    </span>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface Props {
  players: Player[]; tiles: Tile[];
  currentPlayerId: string; myPlayerId: string; winCondition: number;
}

export default function PlayerPanel({ players, tiles, currentPlayerId, myPlayerId, winCondition }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {players.map((player) => {
        const isActive = player.id === currentPlayerId;
        const isMe     = player.id === myPlayerId;
        const worth    = netWorth(player, tiles);
        const pct      = Math.min(100, (worth / winCondition) * 100);
        const myProps  = tiles.filter((t) => {
          if (t.type === 'property') return (t as PropertyTile).ownerId === player.id;
          if (t.type === 'railroad') return (t as RailroadTile).ownerId === player.id;
          if (t.type === 'utility')  return (t as UtilityTile).ownerId === player.id;
          return false;
        });

        return (
          <div key={player.id} style={{
            background: S, borderRadius: 14, padding: '12px 14px',
            border: `1px solid ${isActive ? player.color + '66' : B}`,
            opacity: player.isBankrupt ? 0.5 : 1,
            transition: 'border-color 0.4s, box-shadow 0.4s',
            boxShadow: isActive
              ? `0 0 0 2px ${player.color}22, 0 4px 20px ${player.color}18`
              : '0 1px 4px rgba(26,20,12,0.08)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Left accent */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
              background: player.color,
              opacity: isActive ? 1 : 0.3,
              transition: 'opacity 0.4s',
              borderRadius: '14px 0 0 14px',
            }} />

            <div style={{ paddingLeft: 10 }}>
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: player.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0,
                  boxShadow: isActive ? `0 0 10px ${player.color}66` : `0 2px 6px ${player.color}44`,
                  transition: 'box-shadow 0.4s',
                }}>
                  {getInitials(player.name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: T }}>{player.name}</span>
                    {isMe && (
                      <span style={{ background: '#e8357a', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>ICH</span>
                    )}
                    {isActive && !player.isBankrupt && (
                      <span style={{
                        background: player.color + '22', color: player.color,
                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        border: `1px solid ${player.color}44`,
                      }}>▶ Zug</span>
                    )}
                    {player.isBankrupt && (
                      <span style={{ background: '#c4282818', color: '#c42828', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>BANKROTT</span>
                    )}
                    {player.inJail && (
                      <span style={{ fontSize: 11 }}>🔒 {player.jailTurns}/3</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Money */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: T3, fontWeight: 500 }}>Bargeld</span>
                <span style={{ fontSize: 16, letterSpacing: '-0.3px' }}>
                  <AnimatedNumber value={player.money} color={GREEN} />
                </span>
              </div>

              {/* Net worth + progress */}
              <div style={{ marginBottom: myProps.length > 0 ? 8 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: T3 }}>Nettovermögen</span>
                  <span style={{ fontSize: 12 }}>
                    <AnimatedNumber value={worth} color={worth >= winCondition * 0.85 ? GREEN : T2} />
                  </span>
                </div>
                <div style={{
                  height: 6, background: '#f0ead8', borderRadius: 3, overflow: 'hidden',
                  border: `1px solid ${B}`,
                }}>
                  <div style={{
                    height: '100%', background: `linear-gradient(90deg, ${player.color}, ${player.color}cc)`,
                    borderRadius: 3, width: `${pct}%`, transition: 'width 0.6s ease',
                    willChange: 'width',
                  }} />
                </div>
                <div style={{ fontSize: 9, color: T3, marginTop: 3, textAlign: 'right' }}>
                  Ziel: {winCondition.toLocaleString('de-DE')}€
                </div>
              </div>

              {/* Properties */}
              {myProps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {myProps.map((t) => {
                    const isProp  = t.type === 'property';
                    const prop    = isProp ? (t as PropertyTile) : null;
                    const isMort  = (t as PropertyTile | RailroadTile | UtilityTile).mortgaged;
                    const bg      = isProp ? (COLOR_HEX[prop!.color] ?? '#888') : t.type === 'railroad' ? '#334466' : '#5a7a44';
                    return (
                      <div key={t.position} title={`${t.name}${isMort ? ' (Hypothek)' : ''}`} style={{
                        width: 18, height: 18, borderRadius: 4,
                        background: isMort ? '#ccc' : bg,
                        border: isMort ? `1px dashed ${B}` : '1px solid rgba(26,20,12,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 900, color: '#fff',
                      }}>
                        {t.type === 'railroad' ? '🚂' : t.type === 'utility' ? '⚡'
                          : prop!.houses === 5 ? 'H' : prop!.houses > 0 ? prop!.houses : ''}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
