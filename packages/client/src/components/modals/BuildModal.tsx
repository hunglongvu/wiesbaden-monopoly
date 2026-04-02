import React from 'react';
import { Socket } from 'socket.io-client';
import { PropertyTile, Player } from '../../types';

const COLOR_HEX: Record<string, string> = {
  brown:'#7c4a1e', lightblue:'#38bdf8', pink:'#ec4899', orange:'#f97316',
  red:'#ef4444', yellow:'#eab308', green:'#22c55e', darkblue:'#3b82f6',
};

function HouseIcons({ count }: { count: number }) {
  if (count === 5) return <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 13 }}>🏨 Hotel</span>;
  return (
    <span>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ color: '#22c55e', fontSize: 13 }}>🏠</span>
      ))}
      {count === 0 && <span style={{ color: '#546a8a', fontSize: 12 }}>—</span>}
    </span>
  );
}

export default function BuildModal({ tile, player, socket }: { tile: PropertyTile; player: Player; socket: Socket }) {
  const canAfford = player.money >= tile.housePrice;
  const nextLevel = tile.houses === 4 ? 5 : tile.houses + 1;
  const newRent   = tile.rent[nextLevel] ?? tile.rent[5];
  const propColor = COLOR_HEX[tile.color] ?? '#555';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: '#111827', borderRadius: 14, padding: 20,
        maxWidth: 'min(320px, calc(100vw - 24px))', width: '100%', margin: '0 12px',
        border: '1px solid #1e3a5f',
        animation: 'fadeIn 0.2s ease both', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        <div style={{ height: 5, background: propColor, margin: '-20px -20px 16px', borderRadius: '12px 12px 0 0' }} />
        <div style={{ fontSize: 11, color: '#546a8a', marginBottom: 4 }}>🏗 Gebäude bauen</div>
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>{tile.name}</h2>

        {/* Level indicator */}
        <div style={{
          background: '#0d1830', borderRadius: 8, padding: '10px 12px',
          border: '1px solid #1e3a5f', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#8899b4' }}>Aktuell</span>
            <HouseIcons count={tile.houses} />
          </div>
          <div style={{ height: 1, background: '#1e3a5f', marginBottom: 8 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#22d3a3' }}>Nach Upgrade</span>
            <HouseIcons count={nextLevel} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
          {[
            { label: 'Neue Miete', value: `${newRent}€`, color: '#f5a623' },
            { label: 'Baukosten',  value: `${tile.housePrice}€`, color: canAfford ? '#22d3a3' : '#ef4444' },
            { label: 'Dein Geld',  value: `${player.money}€ → ${player.money - tile.housePrice}€`,
              color: canAfford ? '#22d3a3' : '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#8899b4' }}>{label}</span>
              <span style={{ fontWeight: 600, color }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{
          fontSize: 10, color: '#f5a623', padding: '6px 8px', marginBottom: 12,
          background: 'rgba(245,166,35,0.07)', borderRadius: 6, border: '1px solid rgba(245,166,35,0.2)',
          lineHeight: 1.5,
        }}>
          ⚡ Sonderregel: Bauen nur beim Landen auf eigenem Feld möglich
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => socket.emit('game:build_house', { tilePosition: tile.position })}
            disabled={!canAfford}
            style={{
              flex: 1, padding: '13px', border: 'none', borderRadius: 8, minHeight: 44,
              background: canAfford ? '#22d3a3' : '#1a2540', color: canAfford ? '#000' : '#546a8a',
              cursor: canAfford ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
            }}
          >
            Bauen ({tile.housePrice}€)
          </button>
          <button
            onClick={() => socket.emit('game:decline_build')}
            style={{
              flex: 1, padding: '13px', borderRadius: 8, border: '1px solid #1e3a5f', minHeight: 44,
              background: 'transparent', color: '#8899b4', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            }}
          >
            Überspringen
          </button>
        </div>
      </div>
    </div>
  );
}
