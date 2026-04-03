import React from 'react';
import { Socket } from 'socket.io-client';
import { Tile, PropertyTile, RailroadTile, UtilityTile, Player } from '../../types';

const COLOR_HEX: Record<string, string> = {
  brown:'#8b5e2a', lightblue:'#29b6e8', pink:'#e84393', orange:'#f47316',
  red:'#e03030', yellow:'#d4a012', green:'#1fa854', darkblue:'#2255d4',
};
const COLOR_LABEL: Record<string, string> = {
  brown:'Braun', lightblue:'Hellblau', pink:'Pink', orange:'Orange',
  red:'Rot', yellow:'Gelb', green:'Grün', darkblue:'Dunkelblau',
};

const T = '#1a1510', T2 = '#6b5a42', T3 = '#9e8e78', B = '#d0c4aa';

export default function BuyModal({ tile, player, socket }: { tile: Tile; player: Player; socket: Socket }) {
  const p = tile as PropertyTile | RailroadTile | UtilityTile;
  const canAfford = player.money >= p.price;
  const propColor = tile.type === 'property' ? COLOR_HEX[(tile as PropertyTile).color] : undefined;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,20,12,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#faf6ed', borderRadius: 20, overflow: 'hidden',
        maxWidth: 'min(350px, calc(100vw - 24px))', width: '100%', margin: '0 12px',
        border: `1px solid ${B}`,
        animation: 'popIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        boxShadow: '0 32px 80px rgba(26,20,12,0.3)',
      }}>
        {/* Color bar */}
        {propColor && (
          <div style={{ height: 10, background: propColor }} />
        )}

        <div style={{ padding: 22 }}>
          {/* Header */}
          <div style={{ marginBottom: 18 }}>
            {propColor && (
              <div style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                background: propColor, color: '#fff',
                fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8,
              }}>
                {COLOR_LABEL[(tile as PropertyTile).color]?.toUpperCase()}
              </div>
            )}
            <h2 style={{ fontSize: 19, fontWeight: 800, color: T, lineHeight: 1.2 }}>{tile.name}</h2>
          </div>

          {/* Rent table for property */}
          {tile.type === 'property' && <RentTable tile={tile as PropertyTile} />}
          {tile.type === 'railroad' && (
            <InfoCard>
              <div style={{ fontSize: 12, color: T2, lineHeight: 1.6 }}>
                🚂 Miete steigt mit der Anzahl eigener Bahnhöfe<br />
                <strong>25 · 50 · 75 · 100€</strong>
              </div>
            </InfoCard>
          )}
          {tile.type === 'utility' && (
            <InfoCard>
              <div style={{ fontSize: 12, color: T2, lineHeight: 1.6 }}>
                ⚡ Miete = Würfelwurf × <strong>4</strong> (1 Werk) oder × <strong>10</strong> (beide Werke)
              </div>
            </InfoCard>
          )}

          {/* Price row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderTop: `1px solid ${B}`, borderBottom: `1px solid ${B}`,
            margin: '14px 0',
          }}>
            <div>
              <div style={{ fontSize: 10, color: T3, fontWeight: 600, marginBottom: 2 }}>KAUFPREIS</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: T }}>{p.price}€</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: T3, fontWeight: 600, marginBottom: 2 }}>DEIN GELD</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: canAfford ? '#16884a' : '#c42828' }}>
                {player.money}€
              </div>
            </div>
          </div>

          {!canAfford && (
            <div style={{ color: '#c42828', fontSize: 12, marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
              Nicht genug Geld für diesen Kauf
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => socket.emit('game:buy_property')} disabled={!canAfford} style={{
              flex: 2, padding: '14px', border: 'none', borderRadius: 12, minHeight: 50,
              cursor: canAfford ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
              background: canAfford ? '#16884a' : '#f5f0e6',
              color: canAfford ? '#fff' : T3,
              boxShadow: canAfford ? '0 3px 12px rgba(22,136,74,0.4)' : 'none',
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => { if (canAfford) e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}>
              💰 Kaufen
            </button>
            <button onClick={() => socket.emit('game:decline_property')} style={{
              flex: 1, padding: '14px', borderRadius: 12, minHeight: 50,
              border: `1px solid ${B}`, background: 'transparent', color: T2,
              cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}>
              Überspringen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RentTable({ tile }: { tile: PropertyTile }) {
  const rows = [
    { label: 'Basis',    v: tile.rent[0] },
    { label: '1 Haus',   v: tile.rent[1] },
    { label: '2 Häuser', v: tile.rent[2] },
    { label: '3 Häuser', v: tile.rent[3] },
    { label: '4 Häuser', v: tile.rent[4] },
    { label: 'Hotel 🏨', v: tile.rent[5] },
  ];
  return (
    <div style={{ border: `1px solid ${B}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      {rows.map(({ label, v }, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '7px 14px',
          background: i % 2 === 0 ? '#fff' : '#f8f4ec',
          borderBottom: i < rows.length - 1 ? `1px solid ${B}44` : 'none',
        }}>
          <span style={{ fontSize: 12, color: T2 }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? T2 : T }}>{v}€</span>
        </div>
      ))}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', background: '#f0f8f4', borderTop: `1px solid ${B}44`,
      }}>
        <span style={{ fontSize: 11, color: '#16884a', fontWeight: 600 }}>Hauskosten</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#16884a' }}>{tile.housePrice}€</span>
      </div>
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#f5f0e6', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: `1px solid ${B}` }}>
      {children}
    </div>
  );
}
