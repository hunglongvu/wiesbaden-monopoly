import React, { useEffect, useRef, useState } from 'react';
import { GameState, Tile, PropertyTile, RailroadTile, UtilityTile, Player } from '../types';
import { playStep } from '../sounds';

const CORNER = 78;
const SIDE   = 62;
const BOARD  = CORNER * 2 + SIDE * 9;

const COLOR_HEX: Record<string, string> = {
  brown:    '#7c4a1e',
  lightblue:'#38bdf8',
  pink:     '#ec4899',
  orange:   '#f97316',
  red:      '#ef4444',
  yellow:   '#eab308',
  green:    '#22c55e',
  darkblue: '#3b82f6',
};

const COLOR_LABEL: Record<string, string> = {
  brown:    'Braun',
  lightblue:'Hellblau',
  pink:     'Pink',
  orange:   'Orange',
  red:      'Rot',
  yellow:   'Gelb',
  green:    'Grün',
  darkblue: 'Dunkelblau',
};

const TILE_EMOJI: Record<number, string> = {
  0:  '🏁',
  1:  '🏚️',
  2:  '📦',
  3:  '🏠',
  4:  '💸',
  5:  '🚂',
  6:  '🌊',
  7:  '❓',
  8:  '🌅',
  9:  '🌉',
  10: '⚖️',
  11: '🌸',
  12: '⚡',
  13: '🌺',
  14: '🌼',
  15: '🚆',
  16: '🛒',
  17: '📦',
  18: '🍊',
  19: '⛪',
  20: '🅿️',
  21: '🔴',
  22: '❓',
  23: '🥇',
  24: '🛣️',
  25: '🚃',
  26: '👑',
  27: '🏖️',
  28: '🛁',
  29: '⭐',
  30: '👮',
  31: '🌿',
  32: '🏔️',
  33: '📦',
  34: '🏞️',
  35: '🚊',
  36: '❓',
  37: '🏛️',
  38: '💎',
  39: '🏰',
};

const TILE_SHORT: Record<number, string> = {
  0:  'Los',
  1:  'Biebrich',
  2:  'Gemein.',
  3:  'Schierst.',
  4:  'Steuer',
  5:  'Hbf',
  6:  'Wilhelm',
  7:  'Ereignis',
  8:  'Luisen',
  9:  'Rhein',
  10: 'Besuch',
  11: 'Taunus',
  12: 'Stadtw.',
  13: 'Sonnenb.',
  14: 'Adolfs',
  15: 'Bf Biebr.',
  16: 'Markt',
  17: 'Gemein.',
  18: 'Friedrich',
  19: 'Kirche',
  20: 'Parken',
  21: 'Bleich',
  22: 'Ereignis',
  23: 'Gold',
  24: 'Lang',
  25: 'Bf Klar.',
  26: 'K-F-Ring',
  27: 'Rheinufer',
  28: 'Therme',
  29: 'Dernsches',
  30: 'Gefängnis',
  31: 'Nerotal',
  32: 'Neroberg',
  33: 'Gemein.',
  34: 'Reisinger',
  35: 'Bf Dotz.',
  36: 'Ereignis',
  37: 'Kurhaus',
  38: 'Luxusst.',
  39: 'Schloss',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function gridPos(pos: number): { gridColumn: string; gridRow: string } {
  if (pos === 0)  return { gridColumn: '11', gridRow: '11' };
  if (pos <= 9)   return { gridColumn: `${11 - pos}`, gridRow: '11' };
  if (pos === 10) return { gridColumn: '1',  gridRow: '11' };
  if (pos <= 19)  return { gridColumn: '1',  gridRow: `${11 - (pos - 10)}` };
  if (pos === 20) return { gridColumn: '1',  gridRow: '1' };
  if (pos <= 29)  return { gridColumn: `${pos - 19}`, gridRow: '1' };
  if (pos === 30) return { gridColumn: '11', gridRow: '1' };
  if (pos <= 39)  return { gridColumn: '11', gridRow: `${pos - 29}` };
  return { gridColumn: '11', gridRow: '11' };
}

function colorBarStyle(pos: number, color: string): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', background: color, zIndex: 1 };
  if (pos >= 1  && pos <= 9)  return { ...base, top: 0, left: 0, right: 0, height: 8 };
  if (pos >= 11 && pos <= 19) return { ...base, top: 0, right: 0, bottom: 0, width: 8 };
  if (pos >= 21 && pos <= 29) return { ...base, bottom: 0, left: 0, right: 0, height: 8 };
  if (pos >= 31 && pos <= 39) return { ...base, top: 0, left: 0, bottom: 0, width: 8 };
  return { ...base, top: 0, left: 0, right: 0, height: 6 };
}

function tileSize(pos: number): React.CSSProperties {
  const isCorner    = pos === 0 || pos === 10 || pos === 20 || pos === 30;
  const isLeftRight = (pos >= 11 && pos <= 19) || (pos >= 31 && pos <= 39);
  if (isCorner)    return { width: CORNER, height: CORNER };
  return isLeftRight ? { width: CORNER, height: SIDE } : { width: SIDE, height: CORNER };
}

function useAnimatedPositions(players: Player[]) {
  const prevPos   = useRef<Record<string, number>>({});
  const animating = useRef<Set<string>>(new Set());
  const [displayPos, setDisplayPos] = useState<Record<string, number>>({});
  const [landedId,   setLandedId]   = useState<string | null>(null);

  useEffect(() => {
    players.forEach((player) => {
      if (player.isBankrupt) return;
      const from = prevPos.current[player.id];
      const to   = player.position;

      if (from === undefined) {
        prevPos.current[player.id] = to;
        setDisplayPos((p) => ({ ...p, [player.id]: to }));
        return;
      }
      if (from === to || animating.current.has(player.id)) return;
      prevPos.current[player.id] = to;

      const steps = (to - from + 40) % 40;

      if (steps === 0 || steps > 12) {
        setDisplayPos((p) => ({ ...p, [player.id]: to }));
        setLandedId(player.id);
        setTimeout(() => setLandedId(null), 600);
        return;
      }

      animating.current.add(player.id);
      let step = 0;
      const tick = () => {
        step++;
        const cur = (from + step) % 40;
        setDisplayPos((p) => ({ ...p, [player.id]: cur }));
        playStep();
        if (step < steps) {
          setTimeout(tick, 170);
        } else {
          animating.current.delete(player.id);
          setLandedId(player.id);
          setTimeout(() => setLandedId(null), 700);
        }
      };
      setTimeout(tick, 60);
    });
  }, [players]); // eslint-disable-line

  return { displayPos, landedId };
}

// ── Tile detail overlay ──────────────────────────────────────────────────────

function TileDetail({ tile, allPlayers, allTiles, onClose }: {
  tile: Tile; allPlayers: Player[]; allTiles: Tile[]; onClose: () => void;
}) {
  const propColor   = tile.type === 'property' ? COLOR_HEX[(tile as PropertyTile).color] : undefined;
  const ownerId     = (tile as PropertyTile | RailroadTile | UtilityTile).ownerId;
  const ownerPlayer = ownerId ? allPlayers.find((p) => p.id === ownerId) : null;
  const isMortgaged = (tile as PropertyTile | RailroadTile | UtilityTile).mortgaged ?? false;

  // Count railroads / utilities owned by same owner for rent display
  const rrOwned = ownerPlayer
    ? allTiles.filter((t) => t.type === 'railroad' && (t as RailroadTile).ownerId === ownerId && !(t as RailroadTile).mortgaged).length
    : 0;
  const utOwned = ownerPlayer
    ? allTiles.filter((t) => t.type === 'utility' && (t as UtilityTile).ownerId === ownerId && !(t as UtilityTile).mortgaged).length
    : 0;

  const accentColor = propColor ?? (tile.type === 'railroad' ? '#8899b4' : tile.type === 'utility' ? '#eab308' : '#546a8a');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 900, backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 300, borderRadius: 16,
          background: '#111827',
          border: `2px solid ${accentColor}55`,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px 12px',
          background: accentColor + '22',
          borderBottom: `1px solid ${accentColor}33`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 6 }}>
            {TILE_EMOJI[tile.position] ?? '🏠'}
          </div>
          {propColor && (
            <div style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 10,
              background: propColor, color: '#fff',
              fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 6,
            }}>
              {COLOR_LABEL[(tile as PropertyTile).color]}
            </div>
          )}
          <div style={{ fontSize: 15, fontWeight: 800, color: '#e8edf5', lineHeight: 1.3 }}>
            {tile.name}
          </div>
          {isMortgaged && (
            <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4, fontWeight: 600 }}>
              ⚠ Hypothek aktiv
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px' }}>

          {/* Owner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            padding: '8px 12px', borderRadius: 8,
            background: ownerPlayer ? ownerPlayer.color + '18' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${ownerPlayer ? ownerPlayer.color + '44' : 'rgba(255,255,255,0.08)'}`,
          }}>
            {ownerPlayer ? (
              <>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: ownerPlayer.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: ownerPlayer.color }}>
                  {ownerPlayer.name}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: '#546a8a', fontStyle: 'italic' }}>Nicht gekauft</span>
            )}
            {(tile as PropertyTile | RailroadTile | UtilityTile).price !== undefined && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#22d3a3', fontWeight: 700 }}>
                {(tile as PropertyTile | RailroadTile | UtilityTile).price}€
              </span>
            )}
          </div>

          {/* Property rent table */}
          {tile.type === 'property' && (() => {
            const pt = tile as PropertyTile;
            const rows = [
              { label: 'Basis', value: pt.rent[0] },
              { label: '1 Haus', value: pt.rent[1] },
              { label: '2 Häuser', value: pt.rent[2] },
              { label: '3 Häuser', value: pt.rent[3] },
              { label: '4 Häuser', value: pt.rent[4] },
              { label: '🏨 Hotel', value: pt.rent[5] },
            ];
            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: '#546a8a', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600 }}>MIETE</div>
                {rows.map(({ label, value }, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, padding: '3px 0',
                    color: pt.houses === i ? '#22d3a3' : '#8899b4',
                    fontWeight: pt.houses === i ? 700 : 400,
                    borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <span>{label}</span>
                    <span style={{ color: pt.houses === i ? '#22d3a3' : '#546a8a' }}>{value}€</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, color: '#546a8a', marginTop: 8,
                }}>
                  <span>Hauspreis</span>
                  <span>{pt.housePrice}€</span>
                </div>
              </div>
            );
          })()}

          {/* Railroad rent table */}
          {tile.type === 'railroad' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#546a8a', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600 }}>MIETE</div>
              {[25, 50, 75, 100].map((rent, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, padding: '3px 0',
                  color: rrOwned === i + 1 && ownerPlayer ? '#22d3a3' : '#8899b4',
                  fontWeight: rrOwned === i + 1 && ownerPlayer ? 700 : 400,
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span>{i + 1} Bahnhof{i > 0 ? 'höfe' : ''}</span>
                  <span>{rent}€</span>
                </div>
              ))}
            </div>
          )}

          {/* Utility info */}
          {tile.type === 'utility' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#546a8a', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600 }}>MIETE</div>
              {[
                { label: '1 Werk', mult: 4 },
                { label: '2 Werke', mult: 10 },
              ].map(({ label, mult }, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, padding: '3px 0',
                  color: utOwned === i + 1 && ownerPlayer ? '#22d3a3' : '#8899b4',
                  fontWeight: utOwned === i + 1 && ownerPlayer ? 700 : 400,
                  borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span>{label}</span>
                  <span>{mult}× Würfel</span>
                </div>
              ))}
            </div>
          )}

          {/* Tax info */}
          {tile.type === 'tax' && (
            <div style={{
              textAlign: 'center', fontSize: 22, fontWeight: 900,
              color: '#ef4444', marginBottom: 14,
            }}>
              {(tile as { amount: number }).amount}€ → Jackpot
            </div>
          )}

          {/* Houses indicator for property */}
          {tile.type === 'property' && (tile as PropertyTile).houses > 0 && (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 10 }}>
              {(tile as PropertyTile).houses === 5
                ? <div style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>🏨 Hotel</div>
                : Array.from({ length: (tile as PropertyTile).houses }, (_, i) => (
                    <div key={i} style={{ width: 16, height: 16, background: '#22c55e', borderRadius: 3 }} />
                  ))
              }
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px', border: 'none', borderRadius: 10,
              background: accentColor + 'cc', color: '#000',
              cursor: 'pointer', fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e)   => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ✕ Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TileCell ─────────────────────────────────────────────────────────────────

function TileCell({
  tile, players, displayPos, landedId, myPlayerId, isActive, allPlayers, onClick,
}: {
  tile: Tile; players: Player[]; displayPos: Record<string, number>;
  landedId: string | null; myPlayerId: string; isActive: boolean;
  allPlayers: Player[]; onClick: () => void;
}) {
  const pos = tile.position;
  const sz  = tileSize(pos);
  const isCorner = pos === 0 || pos === 10 || pos === 20 || pos === 30;
  const propColor = tile.type === 'property' ? COLOR_HEX[(tile as PropertyTile).color] : undefined;
  const ownerColor = (() => {
    const t = tile as PropertyTile | RailroadTile | UtilityTile;
    return t.ownerId ? allPlayers.find((p) => p.id === t.ownerId)?.color : undefined;
  })();
  const isMortgaged = (tile as PropertyTile | RailroadTile | UtilityTile).mortgaged ?? false;
  const houses = tile.type === 'property' ? (tile as PropertyTile).houses : 0;
  const visiblePlayers = players.filter((p) => !p.isBankrupt && displayPos[p.id] === pos);

  const tileEmoji = TILE_EMOJI[pos] ?? '';
  const shortName = TILE_SHORT[pos] ?? tile.name;

  return (
    <div
      onClick={onClick}
      style={{
        ...sz, ...gridPos(pos), position: 'relative',
        background: isActive ? '#162040' : '#0d1830',
        border: `1px solid ${isActive ? '#2d5fa0' : '#182640'}`,
        overflow: 'hidden',
        outline: isActive ? '2px solid rgba(232,67,147,0.35)' : 'none',
        outlineOffset: '-2px',
        transition: 'background 0.3s, outline 0.3s',
        cursor: 'pointer',
      }}
      title={`${pos}: ${tile.name}`}
    >
      {/* Color bar */}
      {propColor && !isMortgaged && <div style={colorBarStyle(pos, propColor)} />}
      {isMortgaged && <div style={{ ...colorBarStyle(pos, '#334'), opacity: 0.5 }} />}

      {/* Owner dot */}
      {ownerColor && (
        <div style={{
          position: 'absolute', top: 10, right: 3, width: 7, height: 7,
          borderRadius: '50%', background: ownerColor, zIndex: 2,
          boxShadow: `0 0 5px ${ownerColor}88`,
        }} />
      )}

      {/* Content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 2, paddingTop: propColor ? 12 : 4,
        opacity: isMortgaged ? 0.4 : 1, gap: 1,
      }}>
        {isCorner ? (
          <>
            <div style={{ fontSize: 22, lineHeight: 1 }}>{tileEmoji}</div>
            <div style={{
              fontSize: 8, fontWeight: 700, textAlign: 'center',
              color: '#c8d8f0', lineHeight: 1.2,
              wordBreak: 'break-word', maxWidth: '100%', padding: '0 2px',
            }}>{tile.name}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, lineHeight: 1 }}>{tileEmoji}</div>
            <div style={{
              fontSize: 6, fontWeight: 600, textAlign: 'center',
              color: '#8899b4', lineHeight: 1.2, marginTop: 1,
              maxWidth: '100%', padding: '0 1px',
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>{shortName}</div>
          </>
        )}

        {houses > 0 && (
          <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
            {houses === 5
              ? <div style={{ background: '#ef4444', color: '#fff', fontSize: 5, fontWeight: 800, padding: '1px 3px', borderRadius: 2 }}>H</div>
              : Array.from({ length: houses }, (_, i) => (
                  <div key={i} style={{ width: 5, height: 5, background: '#22c55e', borderRadius: 1 }} />
                ))
            }
          </div>
        )}
      </div>

      {/* Player tokens */}
      {visiblePlayers.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 2, left: 2, right: 2,
          display: 'flex', flexWrap: 'wrap', gap: 2, zIndex: 10,
        }}>
          {visiblePlayers.map((p, idx) => {
            const isLanding = landedId === p.id;
            const isMe = p.id === myPlayerId;
            return (
              <div key={p.id} title={p.name} style={{
                width: 22, height: 22, borderRadius: '50%', background: p.color,
                border: isMe ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 900, color: '#fff', flexShrink: 0,
                letterSpacing: '-0.5px',
                animation: isLanding ? 'tokenLand 0.6s cubic-bezier(0.36,0.07,0.19,0.97) both' : 'none',
                boxShadow: isMe ? `0 0 8px ${p.color}` : `0 1px 4px rgba(0,0,0,0.5)`,
              }}>
                {getInitials(p.name)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

export default function Board({ gameState, myPlayerId }: { gameState: GameState; myPlayerId: string }) {
  const { tiles, players, currentTurn, jackpot } = gameState;
  const { displayPos, landedId } = useAnimatedPositions(players);
  const activePos = players.find((p) => p.id === currentTurn.playerId)?.position;
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${CORNER}px repeat(9, ${SIDE}px) ${CORNER}px`,
        gridTemplateRows:    `${CORNER}px repeat(9, ${SIDE}px) ${CORNER}px`,
        width: BOARD, height: BOARD,
        background: '#0d1830', border: '2px solid #1e3a5f', borderRadius: 6, flexShrink: 0,
        touchAction: 'manipulation',
      }}>
        {tiles.map((tile) => (
          <TileCell
            key={tile.position} tile={tile} players={players}
            displayPos={displayPos} landedId={landedId}
            myPlayerId={myPlayerId} isActive={tile.position === activePos}
            allPlayers={players}
            onClick={() => setSelectedTile(tile)}
          />
        ))}

        {/* Center */}
        <div style={{
          gridColumn: '2 / 11', gridRow: '2 / 11',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, background: '#0a1525', padding: 16,
        }}>
          {/* Latest event display */}
          {gameState.eventLog.length > 0 && (
            <div key={gameState.eventLog.length} style={{
              fontSize: 12, color: '#22d3a3', textAlign: 'center',
              animation: 'slideUp 0.3s ease both',
              maxWidth: 260, lineHeight: 1.5,
              background: 'rgba(34,211,163,0.08)',
              border: '1px solid rgba(34,211,163,0.2)',
              borderRadius: 8, padding: '7px 14px',
              fontWeight: 600,
            }}>
              {gameState.eventLog[gameState.eventLog.length - 1]}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#e84393', letterSpacing: '0.12em' }}>
              WIESBADEN
            </div>
            <div style={{ fontSize: 10, color: '#546a8a', letterSpacing: '0.4em', marginTop: 3 }}>
              MONOPOLY
            </div>
          </div>

          {jackpot.amount > 0 && (
            <div style={{
              background: '#120f00', border: '1px solid #4a3a00', borderRadius: 8,
              padding: '8px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 8, color: '#8a7a30', marginBottom: 3, letterSpacing: '0.1em' }}>
                🅿 FREIPARKEN JACKPOT
              </div>
              <div style={{
                fontSize: 20, fontWeight: 800, color: '#f5a623',
                animation: 'jackpotPulse 2s ease-in-out infinite',
              }}>
                {jackpot.amount.toLocaleString('de-DE')}€
              </div>
            </div>
          )}

          {gameState.gamePhase === 'finished' && (
            <div style={{
              background: '#0a2000', border: '1px solid #3a8000', borderRadius: 10,
              padding: '10px 20px', textAlign: 'center',
              animation: 'glowPulse 1.5s ease-in-out infinite',
            }}>
              <div style={{ fontSize: 10, color: '#88cc44' }}>🏆 GEWINNER</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ccff44', marginTop: 2 }}>
                {players.find((p) => p.id === gameState.winner)?.name}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 280 }}>
            {Object.entries(COLOR_HEX).map(([name, color]) => (
              <div key={name} style={{ width: 14, height: 14, borderRadius: 3, background: color, opacity: 0.75 }} title={name} />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 200 }}>
            {players.filter((p) => !p.isBankrupt).map((p) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 10, color: '#8899b4',
              }}>
                <div style={{
                  width: 11, height: 11, borderRadius: '50%', background: p.color, flexShrink: 0,
                  boxShadow: p.id === currentTurn.playerId ? `0 0 6px ${p.color}` : 'none',
                }} />
                <div style={{ flex: 1, fontWeight: p.id === currentTurn.playerId ? 700 : 400 }}>
                  {p.name}
                </div>
                <div style={{ color: '#22d3a3', fontWeight: 600, fontSize: 9 }}>
                  {p.money.toLocaleString('de-DE')}€
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tile detail overlay */}
      {selectedTile && (
        <TileDetail
          tile={selectedTile}
          allPlayers={players}
          allTiles={tiles}
          onClose={() => setSelectedTile(null)}
        />
      )}
    </>
  );
}
