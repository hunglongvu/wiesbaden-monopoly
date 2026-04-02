import React from 'react';
import { Socket } from 'socket.io-client';
import { Tile, PropertyTile, RailroadTile, UtilityTile, Player } from '../../types';

const COLOR_HEX: Record<string, string> = {
  brown:'#7c4a1e', lightblue:'#38bdf8', pink:'#ec4899', orange:'#f97316',
  red:'#ef4444', yellow:'#eab308', green:'#22c55e', darkblue:'#3b82f6',
};

export default function BuyModal({ tile, player, socket }: { tile: Tile; player: Player; socket: Socket }) {
  const p = tile as PropertyTile | RailroadTile | UtilityTile;
  const canAfford = player.money >= p.price;
  const propColor = tile.type === 'property' ? COLOR_HEX[(tile as PropertyTile).color] : undefined;

  return (
    <Overlay>
      <Modal>
        {propColor && (
          <div style={{ height: 6, background: propColor, margin: '-20px -20px 16px', borderRadius: '12px 12px 0 0' }} />
        )}
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{tile.name}</h2>

        {tile.type === 'property' && (
          <RentTable tile={tile as PropertyTile} />
        )}
        {tile.type === 'railroad' && (
          <InfoText>Bahnhof — Miete steigt mit Anzahl eigener Bahnhöfe (25/50/75/100€)</InfoText>
        )}
        {tile.type === 'utility' && (
          <InfoText>Versorgungsbetrieb — Miete = 4× (1 Betrieb) oder 10× (beide) des Würfelwurfs</InfoText>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '12px 0' }}>
          <Row label="Kaufpreis" value={`${p.price}€`} />
          <Row label="Dein Geld" value={`${player.money}€`} color={canAfford ? '#22d3a3' : '#ef4444'} />
          {!canAfford && (
            <div style={{ color: '#ef4444', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>
              Nicht genug Geld → Auktion wird gestartet
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => socket.emit('game:buy_property')} disabled={!canAfford} primary>
            💰 Kaufen ({p.price}€)
          </Btn>
          <Btn onClick={() => socket.emit('game:decline_property')}>🏛 Auktion</Btn>
        </div>
      </Modal>
    </Overlay>
  );
}

function RentTable({ tile }: { tile: PropertyTile }) {
  const labels = ['Basis', '1 Haus', '2 Häuser', '3 Häuser', '4 Häuser', 'Hotel'];
  return (
    <div style={{
      background: '#0d1830', borderRadius: 8, padding: '8px 10px',
      margin: '8px 0', border: '1px solid #1e3a5f',
    }}>
      {tile.rent.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0',
          borderBottom: i < tile.rent.length - 1 ? '1px solid #1e3a5f22' : 'none',
        }}>
          <span style={{ color: '#8899b4' }}>{labels[i]}</span>
          <span style={{ color: i === 0 ? '#8899b4' : '#e8edf5', fontWeight: i > 0 ? 600 : 400 }}>{r}€</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0 0', borderTop: '1px solid #1e3a5f44', marginTop: 2 }}>
        <span style={{ color: '#22d3a3' }}>Hauskosten</span>
        <span style={{ color: '#22d3a3', fontWeight: 600 }}>{tile.housePrice}€</span>
      </div>
    </div>
  );
}

function InfoText({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: '#8899b4', margin: '6px 0', lineHeight: 1.5 }}>{children}</p>;
}
function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#8899b4' }}>{label}</span>
      <span style={{ fontWeight: 700, color: color ?? '#e8edf5' }}>{value}</span>
    </div>
  );
}
function Btn({ onClick, children, disabled, primary }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; primary?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, padding: '13px 12px', border: 'none', borderRadius: 8, minHeight: 44,
      cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
      background: disabled ? '#1a2540' : primary ? '#22d3a3' : 'transparent',
      color: disabled ? '#546a8a' : primary ? '#000' : '#8899b4',
      border2: primary ? 'none' : '1px solid #1e3a5f',
    } as any}>
      {children}
    </button>
  );
}
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(3px)',
    }}>
      {children}
    </div>
  );
}
function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#111827', borderRadius: 14, padding: 20,
      maxWidth: 'min(340px, calc(100vw - 24px))', width: '100%', margin: '0 12px',
      border: '1px solid #1e3a5f',
      animation: 'fadeIn 0.2s ease both',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    }}>
      {children}
    </div>
  );
}
