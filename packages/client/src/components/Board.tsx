import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Tile, PropertyTile, RailroadTile, UtilityTile, Player } from '../types';
import { playStep, playDiceRoll, playRentPay } from '../sounds';

const CORNER = 90;
const SIDE   = 76;
const BOARD  = CORNER * 2 + SIDE * 6 + 7; // 8 cols: 2 corners + 6 sides + 7 gaps of 1px

// Board colors
const TILE_BG      = '#faf6ed';
const TILE_BORDER  = '#cfc0a4';
const TILE_TEXT    = '#1a1510';
const TILE_TEXT2   = '#7a6a52';
const BOARD_BG     = '#1a5c2e';

const COLOR_HEX: Record<string, string> = {
  brown:    '#8b5e2a',
  lightblue:'#29b6e8',
  pink:     '#e84393',
  orange:   '#f47316',
  red:      '#e03030',
  yellow:   '#d4a012',
  green:    '#1fa854',
  darkblue: '#2255d4',
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
  0: '🏁',  1: '🏚️', 2: '📦',  3: '🏠',  4: '💸',
  5: '🚂',  6: '🌊',  7: '⚖️', 8: '🌅',  9: '🌉',
  10:'⚡', 11:'🌸', 12:'🌺', 13:'🌼', 14:'🅿️',
  15:'🛒', 16:'📦', 17:'⛪', 18:'🚆', 19:'🔴',
  20:'🥇', 21:'👮', 22:'❓', 23:'🌿', 24:'🏔️',
  25:'🛁', 26:'🏛️', 27:'🏰',
};

const TILE_SHORT: Record<number, string> = {
  0: 'Los',      1: 'Biebrich',  2: 'Gemein.',  3: 'Schierst.',
  4: 'Steuer',   5: 'Hbf',       6: 'Wilhelm',  7: 'Besuch',
  8: 'Luisen',   9: 'Rhein',    10: 'Stadtw.',  11: 'Taunus',
  12:'Sonnenb.', 13:'Adolfs',   14:'Parken',    15:'Markt',
  16:'Gemein.', 17:'Kirche',   18:'Bf Biebr.', 19:'Bleich',
  20:'Gold',    21:'Gefängnis', 22:'Ereignis', 23:'Nerotal',
  24:'Neroberg', 25:'Therme',  26:'Kurhaus',   27:'Schloss',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function gridPos(pos: number): { gridColumn: string; gridRow: string } {
  // 8×8 grid: corners at 0 (br), 7 (bl), 14 (tl), 21 (tr)
  if (pos === 0)  return { gridColumn: '8', gridRow: '8' };   // Go (bottom-right)
  if (pos <= 6)   return { gridColumn: `${8 - pos}`, gridRow: '8' }; // Bottom row
  if (pos === 7)  return { gridColumn: '1', gridRow: '8' };   // Jail (bottom-left)
  if (pos <= 13)  return { gridColumn: '1', gridRow: `${15 - pos}` }; // Left col
  if (pos === 14) return { gridColumn: '1', gridRow: '1' };   // Free Parking (top-left)
  if (pos <= 20)  return { gridColumn: `${pos - 13}`, gridRow: '1' }; // Top row
  if (pos === 21) return { gridColumn: '8', gridRow: '1' };   // Go to Jail (top-right)
  if (pos <= 27)  return { gridColumn: '8', gridRow: `${pos - 20}` }; // Right col
  return { gridColumn: '8', gridRow: '8' };
}

function colorBarStyle(pos: number, color: string): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', background: color, zIndex: 1 };
  if (pos >= 1  && pos <= 6)  return { ...base, top: 0, left: 0, right: 0, height: 14 };   // bottom row → bar at top
  if (pos >= 8  && pos <= 13) return { ...base, top: 0, right: 0, bottom: 0, width: 14 };  // left col → bar at right
  if (pos >= 15 && pos <= 20) return { ...base, bottom: 0, left: 0, right: 0, height: 14 }; // top row → bar at bottom
  if (pos >= 22 && pos <= 27) return { ...base, top: 0, left: 0, bottom: 0, width: 14 };   // right col → bar at left
  return { ...base, top: 0, left: 0, right: 0, height: 8 };
}

function tileSize(pos: number): React.CSSProperties {
  const isCorner    = pos === 0 || pos === 7 || pos === 14 || pos === 21;
  const isLeftRight = (pos >= 8 && pos <= 13) || (pos >= 22 && pos <= 27);
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
      const steps = (to - from + 28) % 28;
      if (steps === 0 || steps > 8) {
        setDisplayPos((p) => ({ ...p, [player.id]: to }));
        setLandedId(player.id);
        setTimeout(() => setLandedId(null), 600);
        return;
      }
      animating.current.add(player.id);
      let step = 0;
      const tick = () => {
        step++;
        const cur = (from + step) % 28;
        setDisplayPos((p) => ({ ...p, [player.id]: cur }));
        playStep();
        if (step < steps) {
          setTimeout(tick, 160);
        } else {
          animating.current.delete(player.id);
          setLandedId(player.id);
          setTimeout(() => setLandedId(null), 800);
        }
      };
      setTimeout(tick, 50);
    });
  }, [players]); // eslint-disable-line

  return { displayPos, landedId };
}

// ── Tile Detail Overlay ───────────────────────────────────────────────────────

function TileDetail({ tile, allPlayers, allTiles, onClose }: {
  tile: Tile; allPlayers: Player[]; allTiles: Tile[]; onClose: () => void;
}) {
  const propColor   = tile.type === 'property' ? COLOR_HEX[(tile as PropertyTile).color] : undefined;
  const ownerId     = (tile as PropertyTile | RailroadTile | UtilityTile).ownerId;
  const ownerPlayer = ownerId ? allPlayers.find((p) => p.id === ownerId) : null;
  const isMortgaged = (tile as PropertyTile | RailroadTile | UtilityTile).mortgaged ?? false;

  const rrOwned = ownerPlayer
    ? allTiles.filter((t) => t.type === 'railroad' && (t as RailroadTile).ownerId === ownerId && !(t as RailroadTile).mortgaged).length
    : 0;
  const utOwned = ownerPlayer
    ? allTiles.filter((t) => t.type === 'utility' && (t as UtilityTile).ownerId === ownerId && !(t as UtilityTile).mortgaged).length
    : 0;

  const accentColor = propColor ?? (tile.type === 'railroad' ? '#334466' : tile.type === 'utility' ? '#c47d0a' : '#9e8e78');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,20,12,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 900, backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 320, borderRadius: 20,
        background: '#faf6ed',
        border: `1px solid ${TILE_BORDER}`,
        overflow: 'hidden',
        animation: 'popIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        boxShadow: '0 32px 80px rgba(26,20,12,0.35)',
      }}>
        {/* Color bar header */}
        <div style={{
          height: 8, background: accentColor,
        }} />

        {/* Header content */}
        <div style={{
          padding: '18px 20px 14px',
          background: accentColor + '12',
          borderBottom: `1px solid ${TILE_BORDER}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 38, lineHeight: 1, marginBottom: 8 }}>
            {TILE_EMOJI[tile.position] ?? '🏠'}
          </div>
          {propColor && (
            <div style={{
              display: 'inline-block', padding: '3px 12px', borderRadius: 20,
              background: propColor, color: '#fff',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8,
            }}>
              {COLOR_LABEL[(tile as PropertyTile).color]?.toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: 17, fontWeight: 800, color: TILE_TEXT, lineHeight: 1.3 }}>
            {tile.name}
          </div>
          {isMortgaged && (
            <div style={{
              fontSize: 11, color: '#c42828', marginTop: 6, fontWeight: 700,
              background: '#c4282812', borderRadius: 6, padding: '3px 10px', display: 'inline-block',
            }}>
              ⚠ Hypothek aktiv
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* Owner row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '10px 14px', borderRadius: 10,
            background: ownerPlayer ? ownerPlayer.color + '18' : 'rgba(26,20,12,0.05)',
            border: `1px solid ${ownerPlayer ? ownerPlayer.color + '44' : TILE_BORDER}`,
          }}>
            {ownerPlayer ? (
              <>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: ownerPlayer.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900, color: '#fff', flexShrink: 0,
                }}>
                  {getInitials(ownerPlayer.name)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: ownerPlayer.color, flex: 1 }}>
                  {ownerPlayer.name}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: TILE_TEXT2, fontStyle: 'italic', flex: 1 }}>Nicht gekauft</span>
            )}
            {(tile as PropertyTile | RailroadTile | UtilityTile).price !== undefined && (
              <span style={{ fontSize: 14, color: '#16884a', fontWeight: 800 }}>
                {(tile as PropertyTile | RailroadTile | UtilityTile).price}€
              </span>
            )}
          </div>

          {/* Property rent table */}
          {tile.type === 'property' && (() => {
            const pt = tile as PropertyTile;
            const rows = [
              { label: 'Basis', v: pt.rent[0] },
              { label: '1 Haus 🏠', v: pt.rent[1] },
              { label: '2 Häuser 🏠🏠', v: pt.rent[2] },
              { label: '3 Häuser', v: pt.rent[3] },
              { label: '4 Häuser', v: pt.rent[4] },
              { label: '🏨 Hotel', v: pt.rent[5] },
            ];
            return (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 10, color: TILE_TEXT2, fontWeight: 700,
                  letterSpacing: '0.12em', marginBottom: 8,
                }}>MIETE</div>
                <div style={{ border: `1px solid ${TILE_BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                  {rows.map(({ label, v }, i) => {
                    const isActive = pt.houses === i;
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 12px',
                        background: isActive ? accentColor + '18' : i % 2 === 0 ? '#fff' : '#f8f4ec',
                        borderBottom: i < rows.length - 1 ? `1px solid ${TILE_BORDER}` : 'none',
                      }}>
                        <span style={{ fontSize: 12, color: isActive ? TILE_TEXT : TILE_TEXT2, fontWeight: isActive ? 700 : 400 }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? accentColor : TILE_TEXT }}>{v}€</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, color: TILE_TEXT2, marginTop: 6, padding: '0 4px',
                }}>
                  <span>Hauskosten</span>
                  <span style={{ fontWeight: 600, color: '#16884a' }}>{pt.housePrice}€</span>
                </div>
              </div>
            );
          })()}

          {/* Railroad */}
          {tile.type === 'railroad' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: TILE_TEXT2, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 8 }}>MIETE</div>
              <div style={{ border: `1px solid ${TILE_BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                {[25, 50, 75, 100].map((rent, i) => {
                  const isActive = rrOwned === i + 1 && !!ownerPlayer;
                  return (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '7px 12px',
                      background: isActive ? '#33446618' : i % 2 === 0 ? '#fff' : '#f8f4ec',
                      borderBottom: i < 3 ? `1px solid ${TILE_BORDER}` : 'none',
                    }}>
                      <span style={{ fontSize: 12, color: TILE_TEXT2 }}>{i + 1} Bahnhof{i > 0 ? 'höfe' : ''}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#334466' : TILE_TEXT }}>{rent}€</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Utility */}
          {tile.type === 'utility' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: TILE_TEXT2, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 8 }}>MIETE</div>
              <div style={{ border: `1px solid ${TILE_BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                {[{ label: '1 Werk', mult: 4 }, { label: '2 Werke', mult: 10 }].map(({ label, mult }, i) => {
                  const isActive = utOwned === i + 1 && !!ownerPlayer;
                  return (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '7px 12px',
                      background: isActive ? '#c47d0a18' : i % 2 === 0 ? '#fff' : '#f8f4ec',
                      borderBottom: i === 0 ? `1px solid ${TILE_BORDER}` : 'none',
                    }}>
                      <span style={{ fontSize: 12, color: TILE_TEXT2 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#c47d0a' : TILE_TEXT }}>{mult}× Würfel</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tax */}
          {tile.type === 'tax' && (
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#c42828' }}>
                {(tile as { amount: number }).amount}€
              </div>
              <div style={{ fontSize: 12, color: TILE_TEXT2, marginTop: 4 }}>→ Jackpot</div>
            </div>
          )}

          {/* Houses */}
          {tile.type === 'property' && (tile as PropertyTile).houses > 0 && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
              {(tile as PropertyTile).houses === 5
                ? <div style={{
                    background: '#e03030', color: '#fff', fontSize: 12,
                    fontWeight: 800, padding: '4px 14px', borderRadius: 8,
                  }}>🏨 Hotel</div>
                : Array.from({ length: (tile as PropertyTile).houses }, (_, i) => (
                    <div key={i} style={{ width: 20, height: 20, background: '#1fa854', borderRadius: 4 }} />
                  ))
              }
            </div>
          )}

          {/* Close button */}
          <button onClick={onClose} style={{
            width: '100%', padding: '12px', border: 'none', borderRadius: 12,
            background: TILE_TEXT, color: '#faf6ed',
            cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TileCell ──────────────────────────────────────────────────────────────────

function TileCell({
  tile, players, displayPos, landedId, myPlayerId, isActive, allPlayers, onClick,
}: {
  tile: Tile; players: Player[]; displayPos: Record<string, number>;
  landedId: string | null; myPlayerId: string; isActive: boolean;
  allPlayers: Player[]; onClick: () => void;
}) {
  const pos       = tile.position;
  const sz        = tileSize(pos);
  const isCorner  = pos === 0 || pos === 7 || pos === 14 || pos === 21;
  const propColor = tile.type === 'property' ? COLOR_HEX[(tile as PropertyTile).color] : undefined;
  const ownerColor = (() => {
    const t = tile as PropertyTile | RailroadTile | UtilityTile;
    return t.ownerId ? allPlayers.find((p) => p.id === t.ownerId)?.color : undefined;
  })();
  const isMortgaged  = (tile as PropertyTile | RailroadTile | UtilityTile).mortgaged ?? false;
  const houses       = tile.type === 'property' ? (tile as PropertyTile).houses : 0;
  const visiblePlayers = players.filter((p) => !p.isBankrupt && displayPos[p.id] === pos);

  const tileEmoji = TILE_EMOJI[pos] ?? '';
  const shortName = TILE_SHORT[pos] ?? tile.name;

  return (
    <div
      onClick={onClick}
      style={{
        ...sz, ...gridPos(pos), position: 'relative',
        background: isActive ? '#fffbe8' : TILE_BG,
        border: `1px solid ${isActive ? '#e8357a' : TILE_BORDER}`,
        overflow: 'hidden', cursor: 'pointer',
        animation: isActive ? 'tileGlow 1.8s ease-in-out infinite' : 'none',
        transition: 'background 0.25s',
        zIndex: isActive ? 2 : 1,
      }}
      title={`${pos}: ${tile.name}`}
    >
      {/* Color bar */}
      {propColor && !isMortgaged && <div style={colorBarStyle(pos, propColor)} />}
      {isMortgaged && (
        <div style={{ ...colorBarStyle(pos, '#c4b898'), opacity: 0.5 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.4) 3px, rgba(255,255,255,0.4) 5px)' }} />
        </div>
      )}

      {/* Owner dot */}
      {ownerColor && (
        <div style={{
          position: 'absolute', top: isCorner ? 14 : 4, right: 4,
          width: 8, height: 8, borderRadius: '50%',
          background: ownerColor, zIndex: 3,
          boxShadow: `0 0 0 2px ${TILE_BG}, 0 0 6px ${ownerColor}88`,
        }} />
      )}

      {/* Content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
        padding: isCorner ? 4 : 2,
        paddingTop: propColor ? (isCorner ? 4 : 18) : (isCorner ? 4 : 4),
        opacity: isMortgaged ? 0.45 : 1,
        gap: 2,
      }}>
        {isCorner ? (
          <>
            <div style={{ fontSize: 26, lineHeight: 1 }}>{tileEmoji}</div>
            <div style={{
              fontSize: 8.5, fontWeight: 700, textAlign: 'center',
              color: TILE_TEXT, lineHeight: 1.2,
              wordBreak: 'break-word', maxWidth: '100%', padding: '0 4px', marginTop: 2,
            }}>{tile.name}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, lineHeight: 1 }}>{tileEmoji}</div>
            <div style={{
              fontSize: 6.5, fontWeight: 600, textAlign: 'center',
              color: TILE_TEXT2, lineHeight: 1.2, marginTop: 1,
              maxWidth: '100%', padding: '0 2px',
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>{shortName}</div>
          </>
        )}

        {/* Houses */}
        {houses > 0 && (
          <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
            {houses === 5
              ? <div style={{ background: '#e03030', color: '#fff', fontSize: 5.5, fontWeight: 800, padding: '1px 4px', borderRadius: 3 }}>H</div>
              : Array.from({ length: houses }, (_, i) => (
                  <div key={i} style={{ width: 6, height: 6, background: '#1fa854', borderRadius: 1 }} />
                ))
            }
          </div>
        )}
      </div>

      {/* Player tokens */}
      {visiblePlayers.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 3, left: 3, right: 3,
          display: 'flex', flexWrap: 'wrap', gap: 2, zIndex: 10,
          justifyContent: visiblePlayers.length === 1 ? 'center' : 'flex-start',
        }}>
          {visiblePlayers.map((p) => {
            const isLanding = landedId === p.id;
            const isMe      = p.id === myPlayerId;
            return (
              <div key={p.id} title={p.name} style={{
                width: 24, height: 24, borderRadius: '50%', background: p.color,
                border: `2px solid ${isMe ? '#fff' : 'rgba(255,255,255,0.5)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 900, color: '#fff', flexShrink: 0,
                letterSpacing: '-0.5px',
                animation: isLanding ? 'tokenLand 0.7s cubic-bezier(0.36,0.07,0.19,0.97) both' : 'none',
                boxShadow: isMe
                  ? `0 0 0 2px #fff, 0 0 10px ${p.color}88`
                  : `0 2px 6px rgba(26,20,12,0.35)`,
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

// ── Center Action Components ──────────────────────────────────────────────────

const DOT_GRID: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 75], [75, 25]],
  3: [[25, 75], [50, 50], [75, 25]],
  4: [[25, 25], [25, 75], [75, 25], [75, 75]],
  5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
  6: [[25, 25], [50, 25], [75, 25], [25, 75], [50, 75], [75, 75]],
};

function MiniDie({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = DOT_GRID[value] ?? DOT_GRID[1];
  return (
    <div style={{
      width: 30, height: 30, background: '#fff',
      borderRadius: 7, position: 'relative', flexShrink: 0,
      border: '1px solid #d0c4aa',
      boxShadow: '0 2px 6px rgba(26,20,12,0.1)',
      animation: rolling ? 'diceShake 0.45s ease both' : 'none',
    }}>
      {dots.map(([top, left], i) => (
        <div key={i} style={{
          position: 'absolute', width: 5, height: 5, borderRadius: '50%',
          background: '#1a1510', top: `${top}%`, left: `${left}%`,
          transform: 'translate(-50%, -50%)',
        }} />
      ))}
    </div>
  );
}

function CenterActions({ gameState, myPlayerId, socket, onOpenTrade, onOpenMortgage }: {
  gameState: GameState; myPlayerId: string; socket: Socket;
  onOpenTrade: () => void; onOpenMortgage: () => void;
}) {
  const { currentTurn, players, config } = gameState;
  const isMyTurn = currentTurn.playerId === myPlayerId;
  const me = players.find((p) => p.id === myPlayerId);
  const phase = currentTurn.phase;
  const [rollingAnim, setRollingAnim] = useState(false);
  const prevDice = useRef<[number, number] | undefined>(undefined);

  useEffect(() => {
    const d = currentTurn.diceRoll;
    if (d && (d[0] !== prevDice.current?.[0] || d[1] !== prevDice.current?.[1])) {
      prevDice.current = d;
      setRollingAnim(true);
      setTimeout(() => setRollingAnim(false), 500);
    }
  }, [currentTurn.diceRoll]); // eslint-disable-line

  if (!me || me.isBankrupt) return null;

  const activeName = players.find((p) => p.id === currentTurn.playerId)?.name;

  const mainBtn = (color: string, label: string, onClick: () => void, disabled?: boolean) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '9px 10px', border: 'none', borderRadius: 9,
      background: disabled ? '#f5f0e6' : color,
      color: disabled ? '#9e8e78' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
      boxShadow: disabled ? 'none' : `0 2px 8px ${color}55`,
      transition: 'transform 0.1s',
    }}
    onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.96)'; }}
    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
      {label}
    </button>
  );

  return (
    <div style={{ width: '100%', maxWidth: 210, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Turn indicator */}
      <div style={{
        textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '5px 10px',
        borderRadius: 8,
        background: isMyTurn ? '#e8357a14' : 'rgba(26,20,12,0.05)',
        border: `1px solid ${isMyTurn ? '#e8357a44' : '#d0c4aa'}`,
        color: isMyTurn ? '#e8357a' : '#9e8e78',
      }}>
        {isMyTurn ? '🎯 Du bist am Zug' : `⏳ ${activeName}`}
      </div>

      {/* Dice display */}
      {currentTurn.diceRoll && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <MiniDie value={currentTurn.diceRoll[0]} rolling={rollingAnim} />
          <span style={{ color: '#9e8e78', fontSize: 11 }}>+</span>
          <MiniDie value={currentTurn.diceRoll[1]} rolling={rollingAnim} />
          <span style={{ color: '#9e8e78', fontSize: 11 }}>=</span>
          <div style={{
            minWidth: 28, height: 28, borderRadius: 7,
            background: currentTurn.isDoubles ? '#c47d0a' : '#f5f0e6',
            border: `1px solid ${currentTurn.isDoubles ? '#c47d0a' : '#d0c4aa'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900,
            color: currentTurn.isDoubles ? '#fff' : '#1a1510',
          }}>
            {currentTurn.diceRoll[0] + currentTurn.diceRoll[1]}
          </div>
          {currentTurn.isDoubles && (
            <span style={{
              fontSize: 9, fontWeight: 800, color: '#fff',
              background: '#c47d0a', padding: '2px 5px', borderRadius: 5,
            }}>PASCH</span>
          )}
        </div>
      )}

      {/* Roll dice */}
      {isMyTurn && phase === 'waiting_for_roll' && !me.inJail &&
        mainBtn('#e8357a', '🎲 Würfeln', () => { playDiceRoll(); socket.emit('game:roll_dice'); })}

      {/* Jail options */}
      {isMyTurn && phase === 'waiting_for_roll' && me.inJail && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 10, color: '#c47d0a', fontWeight: 700, textAlign: 'center' }}>
            🔒 Gefängnis – Versuch {me.jailTurns + 1}/3
          </div>
          {mainBtn('#2252c8', `💰 ${config.jailBuyoutCost}€ Kaution`,
            () => { playRentPay(); socket.emit('game:pay_jail_fee'); },
            me.money < config.jailBuyoutCost)}
          {mainBtn('#e8357a', '🎲 Pasch würfeln', () => socket.emit('game:roll_for_jail'))}
        </div>
      )}

      {/* End turn */}
      {isMyTurn && phase === 'end_turn' &&
        mainBtn('#16884a', '✓ Zug beenden', () => socket.emit('game:end_turn'))}

      {/* Side buttons */}
      <div style={{ display: 'flex', gap: 5 }}>
        {[
          { label: '🏦 Hypothek', onClick: onOpenMortgage },
          { label: '🤝 Handel',   onClick: onOpenTrade   },
        ].map(({ label, onClick }) => (
          <button key={label} onClick={onClick} style={{
            flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid #d0c4aa',
            background: '#f5f0e6', color: '#6b5a42', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#ede8dc')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#f5f0e6')}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

function useEventToasts(eventLog: string[]) {
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const prevLen = useRef(0);

  useEffect(() => {
    if (eventLog.length > prevLen.current) {
      const newEvents = eventLog.slice(prevLen.current);
      prevLen.current = eventLog.length;
      setToasts((prev) => {
        const next = [...prev];
        newEvents.forEach((text) => {
          const id = Date.now() + Math.random();
          next.push({ id, text });
          setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5200);
        });
        return next.slice(-3); // keep max 3 visible at once
      });
    } else if (eventLog.length === 0) {
      prevLen.current = 0;
    }
  }, [eventLog.length]); // eslint-disable-line

  return toasts;
}

export default function Board({ gameState, myPlayerId, socket, onOpenTrade, onOpenMortgage }: {
  gameState: GameState; myPlayerId: string;
  socket?: Socket; onOpenTrade?: () => void; onOpenMortgage?: () => void;
}) {
  const { tiles, players, currentTurn, jackpot } = gameState;
  const { displayPos, landedId } = useAnimatedPositions(players);
  const activePos = players.find((p) => p.id === currentTurn.playerId)?.position;
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const toasts = useEventToasts(gameState.eventLog);

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${CORNER}px repeat(6, ${SIDE}px) ${CORNER}px`,
        gridTemplateRows:    `${CORNER}px repeat(6, ${SIDE}px) ${CORNER}px`,
        width: BOARD, height: BOARD,
        background: BOARD_BG,
        border: `3px solid ${BOARD_BG}`,
        borderRadius: 8,
        flexShrink: 0,
        gap: 1,
        boxShadow: '0 8px 40px rgba(26,20,12,0.35)',
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
          gridColumn: '2 / 8', gridRow: '2 / 8',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: socket ? 7 : 14,
          background: '#f5f0e6',
          padding: socket ? 10 : 20,
          overflow: 'hidden',
        }}>
          {/* Event toasts */}
          {toasts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: socket ? 220 : 250 }}>
              {toasts.slice(0, socket ? 2 : 3).map((t) => (
                <div key={t.id} style={{
                  fontSize: socket ? 9 : 11, fontWeight: 600,
                  color: '#16884a', textAlign: 'center',
                  animation: 'eventShow 5s ease both',
                  lineHeight: 1.4,
                  background: '#16884a14',
                  border: '1px solid #16884a30',
                  borderRadius: 9, padding: socket ? '4px 10px' : '6px 12px',
                }}>
                  {t.text}
                </div>
              ))}
            </div>
          )}

          {/* Inline actions (mobile) */}
          {socket && onOpenTrade && onOpenMortgage && (
            <CenterActions
              gameState={gameState} myPlayerId={myPlayerId} socket={socket}
              onOpenTrade={onOpenTrade} onOpenMortgage={onOpenMortgage}
            />
          )}

          {/* Title (desktop only) */}
          {!socket && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 32, fontWeight: 400, color: '#e8357a',
                letterSpacing: '0.06em', lineHeight: 1,
              }}>
                WIESBADEN
              </div>
              <div style={{ fontSize: 9, color: '#9e8e78', letterSpacing: '0.5em', marginTop: 4, fontWeight: 600 }}>
                MONOPOLY
              </div>
            </div>
          )}

          {/* Jackpot */}
          {jackpot.amount > 0 && (
            <div style={{
              background: '#fff8e8', border: '1px solid #d4a01244',
              borderRadius: 9, padding: socket ? '5px 14px' : '8px 18px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 8, color: '#9a7820', marginBottom: 2, fontWeight: 700, letterSpacing: '0.1em' }}>
                🅿 JACKPOT
              </div>
              <div style={{
                fontSize: socket ? 16 : 22, fontWeight: 900, color: '#c47d0a',
                animation: 'jackpotPulse 2s ease-in-out infinite',
              }}>
                {jackpot.amount.toLocaleString('de-DE')}€
              </div>
            </div>
          )}

          {/* Winner */}
          {gameState.gamePhase === 'finished' && (
            <div style={{
              background: '#f0fff4', border: '1px solid #16884a44',
              borderRadius: 12, padding: '10px 22px', textAlign: 'center',
              animation: 'glowPulse 1.5s ease-in-out infinite',
            }}>
              <div style={{ fontSize: 10, color: '#16884a', fontWeight: 700 }}>🏆 GEWINNER</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1510', marginTop: 2 }}>
                {players.find((p) => p.id === gameState.winner)?.name}
              </div>
            </div>
          )}

          {/* Color swatches (desktop only) */}
          {!socket && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 260 }}>
              {Object.entries(COLOR_HEX).map(([name, color]) => (
                <div key={name} style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: color, border: '1px solid rgba(26,20,12,0.15)',
                }} title={name} />
              ))}
            </div>
          )}

          {/* Players mini list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: socket ? 3 : 5, width: '100%', maxWidth: socket ? 200 : 210 }}>
            {players.filter((p) => !p.isBankrupt).map((p) => {
              const isActive = p.id === currentTurn.playerId;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: socket ? '3px 7px' : '5px 8px', borderRadius: 8,
                  background: isActive ? p.color + '18' : 'rgba(26,20,12,0.04)',
                  border: `1px solid ${isActive ? p.color + '44' : 'transparent'}`,
                  transition: 'all 0.3s',
                }}>
                  <div style={{
                    width: socket ? 8 : 10, height: socket ? 8 : 10, borderRadius: '50%', background: p.color,
                    boxShadow: isActive ? `0 0 6px ${p.color}` : 'none',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, fontSize: socket ? 9 : 10, fontWeight: isActive ? 700 : 500, color: TILE_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: socket ? 9 : 10, fontWeight: 700, color: '#16884a', flexShrink: 0 }}>
                    {p.money.toLocaleString('de-DE')}€
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTile && (
        <TileDetail
          tile={selectedTile} allPlayers={players} allTiles={tiles}
          onClose={() => setSelectedTile(null)}
        />
      )}
    </>
  );
}
