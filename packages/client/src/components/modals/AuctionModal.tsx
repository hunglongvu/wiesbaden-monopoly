import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Tile, PropertyTile, RailroadTile, UtilityTile } from '../../types';

export default function AuctionModal({ gameState, myPlayerId, socket }: {
  gameState: GameState; myPlayerId: string; socket: Socket;
}) {
  const [bidInput, setBidInput] = useState('');
  const { auction, tiles, players } = gameState;
  if (!auction?.active) return null;

  const tile         = tiles[auction.tilePosition];
  const isMyBid      = auction.currentBidder === myPlayerId && !auction.passedPlayers.includes(myPlayerId);
  const me           = players.find((p) => p.id === myPlayerId);
  const currentBidder = players.find((p) => p.id === auction.currentBidder);
  const highestBidder = auction.highestBidderId ? players.find((p) => p.id === auction.highestBidderId) : null;
  const minBid       = Math.max(auction.minimumBid, auction.highestBid + 1);

  const getPrice = (t: Tile) => {
    if (t.type === 'property') return (t as PropertyTile).price;
    if (t.type === 'railroad') return (t as RailroadTile).price;
    if (t.type === 'utility')  return (t as UtilityTile).price;
    return 0;
  };

  const handleBid = () => {
    const n = parseInt(bidInput);
    if (!isNaN(n) && n >= minBid) { socket.emit('game:auction_bid', { amount: n }); setBidInput(''); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: '#111827', borderRadius: 14, padding: 20,
        maxWidth: 'min(360px, calc(100vw - 24px))', width: '100%', margin: '0 12px',
        border: '1px solid #1e3a5f',
        animation: 'fadeIn 0.2s ease both', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 11, color: '#546a8a', marginBottom: 6, letterSpacing: '0.08em' }}>🏛 AUKTION</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{tile.name}</h2>
        <p style={{ fontSize: 11, color: '#8899b4', marginBottom: 14 }}>Kaufpreis: {getPrice(tile)}€</p>

        {/* Status */}
        <div style={{
          background: '#0d1830', borderRadius: 8, padding: '10px 12px',
          border: '1px solid #1e3a5f', marginBottom: 12,
        }}>
          {[
            { label: 'Höchstgebot', value: auction.highestBid > 0 ? `${auction.highestBid}€` : '—', color: '#f5a623' },
            { label: 'Höchstbietend', value: highestBidder?.name ?? '—', color: highestBidder?.color },
            { label: 'Am Zug', value: currentBidder?.name ?? '—', color: currentBidder?.color },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#8899b4' }}>{label}</span>
              <span style={{ fontWeight: 600, color: color ?? '#e8edf5' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Player bids */}
        <div style={{ marginBottom: 12 }}>
          {players.filter((p) => !p.isBankrupt).map((p) => {
            const passed = auction.passedPlayers.includes(p.id);
            const bid    = auction.bids[p.id];
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px',
                fontSize: 12, opacity: passed ? 0.4 : 1,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{p.name}</span>
                <span style={{ color: passed ? '#546a8a' : '#e8edf5', fontWeight: 600 }}>
                  {passed ? '❌' : bid ? `${bid}€` : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {/* My turn */}
        {isMyBid && me && (
          <div style={{
            background: '#0d1830', borderRadius: 8, padding: '10px 12px',
            border: '1px solid #22d3a355', marginBottom: 8,
          }}>
            <div style={{ fontSize: 11, color: '#22d3a3', marginBottom: 8 }}>
              Du bist dran! Mindestgebot: {minBid}€ | Dein Geld: {me.money}€
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number" min={minBid} max={me.money}
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBid()}
                placeholder={`Min. ${minBid}€`}
                autoFocus
                style={{
                  flex: 1, padding: '12px 10px', borderRadius: 7, border: '1px solid #1e3a5f',
                  background: '#111827', color: '#e8edf5', fontSize: 16, fontFamily: 'inherit', outline: 'none',
                  minHeight: 44,
                }}
              />
              <button onClick={handleBid}
                disabled={!bidInput || parseInt(bidInput) < minBid || parseInt(bidInput) > me.money}
                style={{
                  padding: '12px 14px', border: 'none', borderRadius: 7, cursor: 'pointer',
                  background: '#e84393', color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                  minHeight: 44,
                }}>
                Bieten
              </button>
            </div>
            <button onClick={() => socket.emit('game:auction_pass')} style={{
              width: '100%', marginTop: 6, padding: '7px', borderRadius: 7,
              border: '1px solid #546a8a', background: 'transparent', color: '#8899b4',
              cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
            }}>
              Passen
            </button>
          </div>
        )}
        {!isMyBid && (
          <p style={{ textAlign: 'center', color: '#546a8a', fontSize: 12, fontStyle: 'italic' }}>
            Warte auf {currentBidder?.name}…
          </p>
        )}
      </div>
    </div>
  );
}
