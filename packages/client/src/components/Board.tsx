import React, { useEffect, useRef, useState } from 'react';
import { GameState, Tile, PropertyTile, RailroadTile, UtilityTile, Player } from '../types';
import { playStep } from '../sounds';

const CORNER = 72;
const SIDE   = 57;
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

const PLAYER_ICONS = ['▲', '■', '●', '◆'];

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
  const isCorner   = pos === 0 || pos === 10 || pos === 20 || pos === 30;
  const isLeftRight = (pos >= 11 && pos <= 19) || (pos >= 31 && pos <= 39);
  if (isCorner)   return { width: CORNER, height: CORNER };
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

function TileCell({
  tile, players, displayPos, landedId, myPlayerId, isActive, allPlayers,
}: {
  tile: Tile; players: Player[]; displayPos: Record<string, number>;
  landedId: string | null; myPlayerId: string; isActive: boolean; allPlayers: Player[];
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

  const ICONS: Record<string, string> = {
    go: '🏁', jail: '⚖', go_to_jail: '👮', free_parking: '🅿',
    chance: '?', community_chest: '📦', tax: '💸', railroad: '🚂', utility: '⚡',
  };
  const icon  = ICONS[tile.type] ?? '';
  const label = isCorner ? tile.name : tile.name.length > 9 ? tile.name.slice(0, 8) + '…' : tile.name;

  return (
    <div style={{
      ...sz, ...gridPos(pos), position: 'relative',
      background: isActive ? '#162040' : '#0d1830',
      border: `1px solid ${isActive ? '#2d5fa0' : '#182640'}`,
      overflow: 'hidden',
      outline: isActive ? '2px solid rgba(232,67,147,0.35)' : 'none',
      outlineOffset: '-2px',
      transition: 'background 0.3s, outline 0.3s',
    }} title={`${pos}: ${tile.name}`}>

      {/* Color bar */}
      {propColor && !isMortgaged && <div style={colorBarStyle(pos, propColor)} />}
      {isMortgaged && <div style={{ ...colorBarStyle(pos, '#334'), opacity: 0.5 }} />}

      {/* Owner dot */}
      {ownerColor && (
        <div style={{
          position: 'absolute', top: 10, right: 3, width: 6, height: 6,
          borderRadius: '50%', background: ownerColor, zIndex: 2,
          boxShadow: `0 0 5px ${ownerColor}88`,
        }} />
      )}

      {/* Content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 2, paddingTop: propColor ? 11 : 4,
        opacity: isMortgaged ? 0.4 : 1, gap: 1,
      }}>
        {icon && (
          <div style={{ fontSize: isCorner ? 20 : 11, lineHeight: 1 }}>{icon}</div>
        )}
        <div style={{
          fontSize: isCorner ? 7.5 : 6.5, fontWeight: 600, textAlign: 'center',
          color: isCorner ? '#c8d8f0' : '#8899b4', lineHeight: 1.25,
          wordBreak: 'break-word', maxWidth: '100%', padding: '0 2px',
        }}>{label}</div>

        {houses > 0 && (
          <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
            {houses === 5
              ? <div style={{ background:'#ef4444', color:'#fff', fontSize:5, fontWeight:800, padding:'1px 3px', borderRadius:2 }}>H</div>
              : Array.from({ length: houses }, (_, i) => (
                  <div key={i} style={{ width:5, height:5, background:'#22c55e', borderRadius:1 }} />
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
                width: 13, height: 13, borderRadius: '50%', background: p.color,
                border: isMe ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 6, fontWeight: 800, color: '#fff', flexShrink: 0,
                animation: isLanding ? 'tokenLand 0.6s cubic-bezier(0.36,0.07,0.19,0.97) both' : 'none',
                boxShadow: isMe ? `0 0 6px ${p.color}` : 'none',
              }}>
                {PLAYER_ICONS[idx % 4]}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Board({ gameState, myPlayerId }: { gameState: GameState; myPlayerId: string }) {
  const { tiles, players, currentTurn, jackpot } = gameState;
  const { displayPos, landedId } = useAnimatedPositions(players);
  const activePos = players.find((p) => p.id === currentTurn.playerId)?.position;

  return (
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
        />
      ))}

      {/* Center */}
      <div style={{
        gridColumn: '2 / 11', gridRow: '2 / 11',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 12, background: '#0a1525', padding: 16,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#e84393', letterSpacing: '0.12em' }}>
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
  );
}
