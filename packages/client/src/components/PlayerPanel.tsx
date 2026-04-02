import React, { useEffect, useRef, useState } from 'react';
import { Player, Tile, PropertyTile, RailroadTile, UtilityTile } from '../types';

const COLOR_HEX: Record<string, string> = {
  brown:'#7c4a1e', lightblue:'#38bdf8', pink:'#ec4899', orange:'#f97316',
  red:'#ef4444', yellow:'#eab308', green:'#22c55e', darkblue:'#3b82f6',
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

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash]     = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    setDisplay(value);
  }, [value]);

  return (
    <span style={{
      transition: 'color 0.3s',
      color: flash ? '#22d3a3' : undefined,
    }}>
      {display.toLocaleString('de-DE')}€
    </span>
  );
}

interface Props {
  players: Player[];
  tiles: Tile[];
  currentPlayerId: string;
  myPlayerId: string;
  winCondition: number;
}

export default function PlayerPanel({ players, tiles, currentPlayerId, myPlayerId, winCondition }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
            background: '#111827',
            borderRadius: 12,
            padding: '10px 12px',
            border: `1px solid ${isActive ? player.color + '55' : '#1e3a5f'}`,
            opacity: player.isBankrupt ? 0.45 : 1,
            transition: 'border-color 0.4s',
            boxShadow: isActive ? `0 0 0 1px ${player.color}44, 0 0 16px ${player.color}18` : 'none',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Left accent bar */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: player.color,
              opacity: isActive ? 1 : 0.35,
              transition: 'opacity 0.4s',
              borderRadius: '12px 0 0 12px',
            }} />

            <div style={{ paddingLeft: 6 }}>
              {/* Name row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', background: player.color,
                  boxShadow: isActive ? `0 0 8px ${player.color}` : 'none',
                  flexShrink: 0, transition: 'box-shadow 0.4s',
                }} />
                <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{player.name}</span>
                {isMe && (
                  <span style={{
                    background: '#22d3a3', color: '#000', fontSize: 9, fontWeight: 800,
                    padding: '1px 5px', borderRadius: 4,
                  }}>ICH</span>
                )}
                {isActive && !player.isBankrupt && (
                  <span style={{
                    background: player.color + '33', color: player.color, fontSize: 9,
                    fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                    border: `1px solid ${player.color}44`,
                  }}>▶ Zug</span>
                )}
                {player.isBankrupt && (
                  <span style={{
                    background: '#ef444422', color: '#ef4444', fontSize: 9,
                    fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                  }}>BANKROTT</span>
                )}
                {player.inJail && (
                  <span style={{ fontSize: 10, color: '#f5a623' }}>🔒 {player.jailTurns}/3</span>
                )}
              </div>

              {/* Money */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, marginBottom: 4,
              }}>
                <span style={{ color: '#8899b4' }}>Bargeld</span>
                <span style={{ fontWeight: 700, color: '#22d3a3', fontSize: 14 }}>
                  <AnimatedNumber value={player.money} />
                </span>
              </div>

              {/* Net worth + progress */}
              <div style={{ marginBottom: 6 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, marginBottom: 3,
                }}>
                  <span style={{ color: '#546a8a' }}>Nettovermögen</span>
                  <span style={{
                    fontWeight: 600, fontSize: 12,
                    color: worth >= winCondition * 0.85 ? '#22c55e' : '#8899b4',
                  }}>
                    <AnimatedNumber value={worth} />
                  </span>
                </div>
                <div style={{ height: 4, background: '#1a2540', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: player.color, borderRadius: 2,
                    width: `${pct}%`, transition: 'width 0.5s ease', willChange: 'width',
                  }} />
                </div>
                <div style={{ fontSize: 9, color: '#546a8a', marginTop: 2, textAlign: 'right' }}>
                  Ziel: {winCondition.toLocaleString('de-DE')}€
                </div>
              </div>

              {/* Properties */}
              {myProps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {myProps.map((t) => {
                    const isProp = t.type === 'property';
                    const prop   = isProp ? (t as PropertyTile) : null;
                    const isMort = (t as PropertyTile | RailroadTile | UtilityTile).mortgaged;
                    const bg     = isProp ? (COLOR_HEX[prop!.color] ?? '#555') : t.type === 'railroad' ? '#334' : '#224';
                    return (
                      <div key={t.position} title={`${t.name}${isMort ? ' (hypothek)' : ''}`} style={{
                        width: 16, height: 16, borderRadius: 3, background: bg,
                        opacity: isMort ? 0.35 : 0.9,
                        border: isMort ? '1px dashed #8899b4' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 800, color: '#fff',
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
