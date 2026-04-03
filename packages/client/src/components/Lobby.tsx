import React, { useState } from 'react';
import { socket } from '../socket';
import { GameState } from '../types';

interface Props {
  gameState: GameState | null;
  onJoin: (name: string) => void;
  onStart: () => void;
  mySocketId: string;
}

const PLAYER_COLORS = ['#e84393', '#16884a', '#c47d0a', '#2252c8'];
const T = '#1a1510', T2 = '#6b5a42', T3 = '#9e8e78', B = '#d0c4aa';

export default function Lobby({ gameState, onJoin, onStart, mySocketId }: Props) {
  const [name,            setName]            = useState('');
  const [joined,          setJoined]          = useState(false);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetCode,       setResetCode]       = useState('');

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
      minHeight: '100vh', padding: '2rem', background: '#e8e0d0',
    }}>
      <div style={{
        background: '#fff', borderRadius: 22, padding: '2.5rem 2.2rem',
        maxWidth: 450, width: '100%', border: `1px solid ${B}`,
        boxShadow: '0 20px 60px rgba(26,20,12,0.18)',
        animation: 'slideUp 0.3s ease both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 42, color: '#e8357a', letterSpacing: '0.05em',
            lineHeight: 1, marginBottom: 6,
          }}>
            WIESBADEN
          </div>
          <div style={{ fontSize: 11, color: T3, letterSpacing: '0.5em', fontWeight: 700 }}>
            MONOPOLY
          </div>
          <div style={{ marginTop: 16, height: 1, background: `linear-gradient(90deg, transparent, ${B}, transparent)` }} />
        </div>

        {/* Join form */}
        {!alreadyInGame && !joined && (
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
            <input
              type="text" placeholder="Dein Name" value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20} autoFocus
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 10, fontSize: 15,
                border: `1px solid ${B}`, background: '#f5f0e6', color: T,
                outline: 'none', fontFamily: 'inherit', minHeight: 46,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e)  => (e.currentTarget.style.borderColor = '#e8357a')}
              onBlur={(e)   => (e.currentTarget.style.borderColor = B)}
            />
            <button type="submit" disabled={!name.trim() || (gameState?.players.length ?? 0) >= 4} style={{
              padding: '12px 20px', border: 'none', borderRadius: 10, cursor: 'pointer',
              background: '#e8357a', color: '#fff', fontWeight: 800, fontSize: 14,
              fontFamily: 'inherit', whiteSpace: 'nowrap', minHeight: 46,
              opacity: !name.trim() ? 0.5 : 1,
              boxShadow: name.trim() ? '0 3px 12px rgba(232,53,122,0.4)' : 'none',
              transition: 'opacity 0.2s',
            }}>
              Beitreten
            </button>
          </form>
        )}

        {/* Player list */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 10, color: T3, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 10 }}>
            SPIELER ({gameState?.players.length ?? 0}/4)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(gameState?.players ?? []).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: p.id === mySocketId ? PLAYER_COLORS[i % 4] + '12' : '#f5f0e6',
                border: `1px solid ${p.id === mySocketId ? PLAYER_COLORS[i % 4] + '44' : B}`,
                animation: 'slideLeft 0.2s ease both',
                animationDelay: `${i * 0.06}s`,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: PLAYER_COLORS[i % 4],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0,
                  boxShadow: `0 2px 8px ${PLAYER_COLORS[i % 4]}55`,
                }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: T }}>{p.name}</span>
                {i === 0 && (
                  <span style={{
                    background: '#c47d0a18', color: '#c47d0a', fontSize: 9, fontWeight: 800,
                    padding: '2px 8px', borderRadius: 5, border: '1px solid #c47d0a33',
                  }}>HOST</span>
                )}
                {p.id === mySocketId && (
                  <span style={{
                    background: '#e8357a18', color: '#e8357a', fontSize: 9, fontWeight: 800,
                    padding: '2px 8px', borderRadius: 5, border: '1px solid #e8357a33',
                  }}>ICH</span>
                )}
              </div>
            ))}
            {(gameState?.players.length ?? 0) === 0 && (
              <div style={{ textAlign: 'center', color: T3, padding: '1.5rem', fontSize: 13, fontStyle: 'italic' }}>
                Warte auf Spieler…
              </div>
            )}
            {Array.from({ length: Math.max(0, 4 - (gameState?.players.length ?? 0)) }, (_, i) => (
              <div key={`empty-${i}`} style={{
                padding: '10px 14px', borderRadius: 12,
                border: `1px dashed ${B}`, opacity: 0.5,
                fontSize: 12, color: T3, textAlign: 'center',
              }}>
                Freier Platz
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        {isHost && (
          <button onClick={onStart} disabled={!canStart} style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            cursor: canStart ? 'pointer' : 'not-allowed',
            background: canStart ? '#16884a' : '#f5f0e6',
            color: canStart ? '#fff' : T3,
            fontWeight: 800, fontSize: 16, marginBottom: '1.2rem',
            fontFamily: 'inherit',
            boxShadow: canStart ? '0 4px 16px rgba(22,136,74,0.35)' : 'none',
            transition: 'all 0.2s',
          }}>
            {canStart ? '▶ Spiel starten' : `Noch ${2 - (gameState?.players.length ?? 0)} Spieler benötigt`}
          </button>
        )}
        {alreadyInGame && !isHost && (
          <p style={{ textAlign: 'center', color: T3, marginBottom: '1.2rem', fontSize: 13, fontStyle: 'italic' }}>
            Warte auf den Host…
          </p>
        )}

        {/* Rules */}
        <div style={{
          background: '#f5f0e6', borderRadius: 12, padding: '14px 16px',
          border: `1px solid ${B}`, marginBottom: '1rem',
        }}>
          <div style={{ fontSize: 10, color: T3, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 10 }}>
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
            <div key={r} style={{ fontSize: 12, color: T2, padding: '3px 0', lineHeight: 1.5, display: 'flex', gap: 8 }}>
              <span style={{ color: T3 }}>·</span>
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* Reset */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowResetPrompt(true)} style={{
            background: 'transparent', border: `1px solid ${B}`,
            color: T3, padding: '4px 12px', borderRadius: 7,
            cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
          }}>
            ⚠ Admin Reset
          </button>
        </div>
      </div>

      {/* Reset modal */}
      {showResetPrompt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,20,12,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#faf6ed', border: `1px solid #c4282833`, borderRadius: 18,
            padding: 28, minWidth: 300, animation: 'popIn 0.25s ease both',
            boxShadow: '0 24px 60px rgba(26,20,12,0.3)',
          }}>
            <h3 style={{ color: '#c42828', marginBottom: 10, fontSize: 17, fontWeight: 800 }}>Admin-Reset</h3>
            <p style={{ color: T2, fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
              Alle laufenden Spiele werden beendet.<br />Admin-Code eingeben:
            </p>
            <input
              type="password" placeholder="Code" value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 9,
                border: `1px solid ${B}`, background: '#f5f0e6',
                color: T, fontSize: 15, marginBottom: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => { setShowResetPrompt(false); setResetCode(''); }} style={{
                flex: 1, padding: '11px', border: `1px solid ${B}`, borderRadius: 10,
                background: 'transparent', color: T2, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              }}>
                Abbrechen
              </button>
              <button onClick={handleReset} disabled={!resetCode} style={{
                flex: 1, padding: '11px', border: 'none', borderRadius: 10,
                background: resetCode ? '#c42828' : '#f5f0e6',
                color: resetCode ? '#fff' : T3,
                cursor: resetCode ? 'pointer' : 'not-allowed', fontWeight: 800, fontFamily: 'inherit',
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
