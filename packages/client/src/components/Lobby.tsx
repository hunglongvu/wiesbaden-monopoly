import React, { useState } from 'react';
import { socket } from '../socket';
import { GameState } from '../types';

interface Props {
  gameState: GameState | null;
  onJoin: (name: string) => void;
  onStart: () => void;
  mySocketId: string;
}

const PLAYER_COLORS = ['#e84393', '#22d3a3', '#f5a623', '#3b82f6'];

export default function Lobby({ gameState, onJoin, onStart, mySocketId }: Props) {
  const [name,             setName]             = useState('');
  const [joined,           setJoined]           = useState(false);
  const [showResetPrompt,  setShowResetPrompt]  = useState(false);
  const [resetCode,        setResetCode]        = useState('');

  const isHost        = gameState?.players[0]?.id === mySocketId;
  const alreadyInGame = gameState?.players.some((p) => p.id === mySocketId);
  const canStart      = (gameState?.players.length ?? 0) >= 2;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) { onJoin(name.trim()); setJoined(true); }
  };
  const handleReset = () => {
    socket.emit('game:admin_reset', { code: resetCode });
    setShowResetPrompt(false); setResetCode('');
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', padding: '2rem',
    }}>
      <div style={{
        background: '#111827', borderRadius: 18, padding: '2.5rem 2rem',
        maxWidth: 440, width: '100%', border: '1px solid #1e3a5f',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.3s ease both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#e84393', letterSpacing: '0.08em' }}>
            WIESBADEN
          </div>
          <div style={{ fontSize: 11, color: '#546a8a', letterSpacing: '0.45em', marginTop: 4 }}>
            MONOPOLY
          </div>
          <div style={{ marginTop: 10, height: 1, background: 'linear-gradient(90deg, transparent, #1e3a5f, transparent)' }} />
        </div>

        {/* Join form */}
        {!alreadyInGame && !joined && (
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
            <input
              type="text" placeholder="Dein Name" value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20} autoFocus
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 9, fontSize: 16,
                border: '1px solid #1e3a5f', background: '#0d1830', color: '#e8edf5',
                outline: 'none', fontFamily: 'inherit', minHeight: 44,
              }}
            />
            <button type="submit"
              disabled={!name.trim() || (gameState?.players.length ?? 0) >= 4}
              style={{
                padding: '12px 18px', border: 'none', borderRadius: 9, cursor: 'pointer',
                background: '#e84393', color: '#fff', fontWeight: 700, fontSize: 14,
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                opacity: !name.trim() ? 0.5 : 1, minHeight: 44,
              }}>
              Beitreten
            </button>
          </form>
        )}

        {/* Player list */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: 10, color: '#546a8a', fontWeight: 600, letterSpacing: '0.1em',
            marginBottom: 10,
          }}>
            SPIELER ({gameState?.players.length ?? 0}/4)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(gameState?.players ?? []).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10,
                background: p.id === mySocketId ? '#162040' : '#0d1830',
                border: `1px solid ${p.id === mySocketId ? '#2d5fa0' : '#1e3a5f'}`,
                animation: 'slideLeft 0.2s ease both',
                animationDelay: `${i * 0.05}s`,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: PLAYER_COLORS[i % 4],
                  boxShadow: `0 0 8px ${PLAYER_COLORS[i % 4]}`,
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                {i === 0 && (
                  <span style={{
                    background: '#f5a62322', color: '#f5a623', fontSize: 9, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 4, border: '1px solid #f5a62344',
                  }}>HOST</span>
                )}
                {p.id === mySocketId && (
                  <span style={{
                    background: '#22d3a322', color: '#22d3a3', fontSize: 9, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 4, border: '1px solid #22d3a344',
                  }}>ICH</span>
                )}
              </div>
            ))}
            {(gameState?.players.length ?? 0) === 0 && (
              <div style={{
                textAlign: 'center', color: '#546a8a', padding: '1.5rem',
                fontSize: 12, fontStyle: 'italic',
              }}>
                Warte auf Spieler…
              </div>
            )}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - (gameState?.players.length ?? 0)) }, (_, i) => (
              <div key={`empty-${i}`} style={{
                padding: '9px 12px', borderRadius: 10,
                border: '1px dashed #1e3a5f22', opacity: 0.4,
                fontSize: 12, color: '#546a8a', textAlign: 'center',
              }}>
                Freier Platz
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        {isHost && (
          <button onClick={onStart} disabled={!canStart} style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            cursor: canStart ? 'pointer' : 'not-allowed',
            background: canStart
              ? 'linear-gradient(135deg, #22d3a3, #1aab82)'
              : '#1a2540',
            color: canStart ? '#000' : '#546a8a',
            fontWeight: 800, fontSize: 15, marginBottom: '1rem',
            fontFamily: 'inherit', transition: 'opacity 0.2s',
            opacity: canStart ? 1 : 0.7,
          }}>
            {canStart ? '▶ Spiel starten' : `Warte auf mehr Spieler (${gameState?.players.length ?? 0}/2 min)`}
          </button>
        )}
        {alreadyInGame && !isHost && (
          <p style={{ textAlign: 'center', color: '#546a8a', marginBottom: '1rem', fontSize: 12, fontStyle: 'italic' }}>
            Warte auf den Host…
          </p>
        )}

        {/* Rules */}
        <div style={{
          background: '#0d1830', borderRadius: 10, padding: '12px 14px',
          border: '1px solid #1e3a5f', marginBottom: '1rem',
        }}>
          <div style={{ fontSize: 10, color: '#546a8a', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 8 }}>
            KURZREGELN
          </div>
          {[
            '2–4 Spieler · Startkapital 1.000€',
            'Sieg: Nettovermögen ≥ 8.000€',
            'Los passieren +200€ · Landen +400€',
            'Häuser: nur beim Landen auf eigenem Feld',
            'Freiparken: Jackpot-Gewinn',
            'Pasch: Extrazug · 3× Pasch: Gefängnis',
          ].map((r) => (
            <div key={r} style={{ fontSize: 12, color: '#8899b4', padding: '2px 0', lineHeight: 1.5 }}>
              · {r}
            </div>
          ))}
        </div>

        {/* Reset button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowResetPrompt(true)} style={{
            background: 'transparent', border: '1px solid #1e3a5f22',
            color: '#546a8a44', padding: '4px 10px', borderRadius: 6,
            cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#8899b4'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#546a8a'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#546a8a44'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e3a5f22'; }}>
            ⚠ Reset
          </button>
        </div>
      </div>

      {/* Reset modal */}
      {showResetPrompt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            background: '#111827', border: '1px solid #ef444444', borderRadius: 14,
            padding: '24px', minWidth: 300, animation: 'fadeIn 0.2s ease both',
          }}>
            <h3 style={{ color: '#ef4444', marginBottom: 8, fontSize: 16 }}>Admin-Reset</h3>
            <p style={{ color: '#8899b4', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              Alle laufenden Spiele werden beendet.<br />Admin-Code eingeben:
            </p>
            <input
              type="password" placeholder="Code" value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              autoFocus
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid #1e3a5f', background: '#0d1830',
                color: '#e8edf5', fontSize: 14, marginBottom: 12, fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowResetPrompt(false); setResetCode(''); }} style={{
                flex: 1, padding: '9px', border: '1px solid #1e3a5f', borderRadius: 8,
                background: 'transparent', color: '#8899b4', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Abbrechen
              </button>
              <button onClick={handleReset} disabled={!resetCode} style={{
                flex: 1, padding: '9px', border: 'none', borderRadius: 8,
                background: resetCode ? '#ef4444' : '#1a2540',
                color: resetCode ? '#fff' : '#546a8a',
                cursor: resetCode ? 'pointer' : 'not-allowed', fontWeight: 700, fontFamily: 'inherit',
              }}>
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
