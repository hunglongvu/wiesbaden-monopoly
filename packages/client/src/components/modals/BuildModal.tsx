import React from 'react';
import { Socket } from 'socket.io-client';
import { PropertyTile, Player } from '../../types';

const COLOR_HEX: Record<string, string> = {
  brown:'#8b5e2a', lightblue:'#29b6e8', pink:'#e84393', orange:'#f47316',
  red:'#e03030', yellow:'#d4a012', green:'#1fa854', darkblue:'#2255d4',
};
const T = '#1a1510', T2 = '#6b5a42', T3 = '#9e8e78', B = '#d0c4aa';

function HouseBar({ count }: { count: number }) {
  if (count === 5) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ background: '#e03030', color: '#fff', fontSize: 12, fontWeight: 800, padding: '3px 12px', borderRadius: 8 }}>🏨 Hotel</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {count === 0
        ? <span style={{ color: T3, fontSize: 12 }}>Leer</span>
        : Array.from({ length: count }, (_, i) => (
            <div key={i} style={{ width: 22, height: 22, background: '#1fa854', borderRadius: 4, border: '1px solid rgba(26,20,12,0.1)' }} />
          ))
      }
    </div>
  );
}

export default function BuildModal({ tile, player, socket }: { tile: PropertyTile; player: Player; socket: Socket }) {
  const canAfford = player.money >= tile.housePrice;
  const nextLevel = tile.houses === 4 ? 5 : tile.houses + 1;
  const newRent   = tile.rent[nextLevel] ?? tile.rent[5];
  const propColor = COLOR_HEX[tile.color] ?? '#888';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,20,12,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#faf6ed', borderRadius: 20, overflow: 'hidden',
        maxWidth: 'min(340px, calc(100vw - 24px))', width: '100%', margin: '0 12px',
        border: `1px solid ${B}`,
        animation: 'popIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        boxShadow: '0 32px 80px rgba(26,20,12,0.3)',
      }}>
        {/* Color bar */}
        <div style={{ height: 8, background: propColor }} />

        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 11, color: T3, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>GEBÄUDE BAUEN</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T, marginBottom: 18 }}>{tile.name}</h2>

          {/* Level comparison */}
          <div style={{ border: `1px solid ${B}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: '#fff', borderBottom: `1px solid ${B}`,
            }}>
              <span style={{ fontSize: 11, color: T3, fontWeight: 600 }}>AKTUELL</span>
              <HouseBar count={tile.houses} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: '#f0fff6',
            }}>
              <span style={{ fontSize: 11, color: '#16884a', fontWeight: 700 }}>NACH UPGRADE</span>
              <HouseBar count={nextLevel} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ border: `1px solid ${B}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            {[
              { label: 'Neue Miete', value: `${newRent}€`, color: '#c47d0a' },
              { label: 'Baukosten',  value: `${tile.housePrice}€`, color: canAfford ? '#16884a' : '#c42828' },
              { label: 'Geld nach Bau', value: `${player.money - tile.housePrice}€`, color: canAfford ? T : '#c42828' },
            ].map(({ label, value, color }, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 14px',
                background: i % 2 === 0 ? '#fff' : '#f8f4ec',
                borderBottom: i < 2 ? `1px solid ${B}44` : 'none',
              }}>
                <span style={{ fontSize: 12, color: T2 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 11, color: '#c47d0a', padding: '8px 12px', marginBottom: 16,
            background: '#c47d0a0e', borderRadius: 8, border: '1px solid #c47d0a22',
          }}>
            ⚡ Sonderregel: Bauen nur beim Landen auf eigenem Feld möglich
          </div>

          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => socket.emit('game:build_house', { tilePosition: tile.position })} disabled={!canAfford} style={{
              flex: 2, padding: '14px', border: 'none', borderRadius: 12, minHeight: 50,
              background: canAfford ? '#16884a' : '#f5f0e6',
              color: canAfford ? '#fff' : T3,
              cursor: canAfford ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
              boxShadow: canAfford ? '0 3px 12px rgba(22,136,74,0.4)' : 'none',
            }}>
              Bauen ({tile.housePrice}€)
            </button>
            <button onClick={() => socket.emit('game:decline_build')} style={{
              flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${B}`,
              background: 'transparent', color: T2, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            }}>
              Überspringen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
