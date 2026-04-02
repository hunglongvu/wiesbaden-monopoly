import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, PropertyTile } from '../types';
import Board from './Board';
import PlayerPanel from './PlayerPanel';
import ActionPanel from './ActionPanel';
import AuctionModal from './modals/AuctionModal';
import TradeModal from './modals/TradeModal';
import MortgageModal from './modals/MortgageModal';
import BuyModal from './modals/BuyModal';
import BuildModal from './modals/BuildModal';
import EventCardModal from './modals/EventCardModal';
import { useIsMobile } from '../hooks/useIsMobile';

interface Props { gameState: GameState; myPlayerId: string; socket: Socket; }

// Waits for all player movement animations to finish before returning true
function useAnimationDone(players: GameState['players']) {
  const prevPos = useRef<Record<string, number>>({});
  const [ready, setReady] = useState(true);

  useEffect(() => {
    let maxSteps = 0;
    players.forEach((p) => {
      const from = prevPos.current[p.id];
      const to   = p.position;
      if (from !== undefined && from !== to) {
        const steps = (to - from + 40) % 40;
        if (steps > 0 && steps <= 12) maxSteps = Math.max(maxSteps, steps);
      }
      prevPos.current[p.id] = to;
    });

    if (maxSteps > 0) {
      setReady(false);
      const t = setTimeout(() => setReady(true), 60 + maxSteps * 170 + 150);
      return () => clearTimeout(t);
    }
  }, [players]);

  return ready;
}

function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 768);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

const mobileMoreBtn: React.CSSProperties = {
  width: '100%', padding: '14px 16px', border: '1px solid #1e3a5f',
  borderRadius: 10, background: '#111827', color: '#e8edf5',
  cursor: 'pointer', fontSize: 15, fontWeight: 600, textAlign: 'left',
  fontFamily: 'inherit',
};

export default function Game({ gameState, myPlayerId, socket }: Props) {
  const [showTrade,    setShowTrade]    = useState(false);
  const [showMortgage, setShowMortgage] = useState(false);
  const [activeTab, setActiveTab] = useState<'action' | 'players' | 'more'>('action');
  // Track dismissed card events so we don't re-show on re-render
  const shownCardRef = useRef<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  const isMobile = useIsMobile();
  const windowWidth = useWindowWidth();

  const { players, tiles, currentTurn, config } = gameState;
  const me      = players.find((p) => p.id === myPlayerId);
  const pending = currentTurn.pendingAction;
  const isMyTurn = currentTurn.playerId === myPlayerId;
  const animDone = useAnimationDone(players);

  // Show card event modal when a card is drawn
  useEffect(() => {
    const evt = gameState.lastCardEvent;
    if (!evt) { shownCardRef.current = null; return; }
    const key = `${evt.drawnBy}-${evt.card.id}`;
    if (key !== shownCardRef.current) {
      shownCardRef.current = key;
      setShowCardModal(true);
    }
  }, [gameState.lastCardEvent, myPlayerId]);

  // Auto-switch to action tab when it becomes my turn
  useEffect(() => {
    if (isMyTurn && isMobile) {
      setActiveTab('action');
    }
  }, [isMyTurn, isMobile]);

  // Show tax/repair as modal too
  const showTaxModal    = isMyTurn && animDone && pending?.type === 'pay_tax';
  const showRepairModal = isMyTurn && animDone && pending?.type === 'repair_costs';
  const showBuyModal    = isMyTurn && animDone && pending?.type === 'buy_property' && !gameState.auction;
  const showBuildModal  = isMyTurn && animDone && pending?.type === 'build_house';
  const showAuction     = !!(gameState.auction?.active);

  const incomingTrades = gameState.pendingTrades.filter(
    (t) => t.toPlayerId === myPlayerId && t.status === 'pending'
  );

  const activePlayer = players.find((p) => p.id === currentTurn.playerId);

  const BOARD_SIZE = 714;
  const boardScale = Math.min(1, (windowWidth - 8) / BOARD_SIZE);

  // ── Shared modals (work in both layouts since position: fixed) ──────────────
  const modals = (
    <>
      {showBuyModal && me && pending?.type === 'buy_property' && (
        <BuyModal tile={tiles[pending.tilePosition]} player={me} socket={socket} />
      )}
      {showBuildModal && me && pending?.type === 'build_house' && (
        <BuildModal tile={tiles[pending.tilePosition] as PropertyTile} player={me} socket={socket} />
      )}
      {showAuction && (
        <AuctionModal gameState={gameState} myPlayerId={myPlayerId} socket={socket} />
      )}
      {showTrade && (
        <TradeModal gameState={gameState} myPlayerId={myPlayerId} socket={socket} onClose={() => setShowTrade(false)} />
      )}
      {showMortgage && (
        <MortgageModal gameState={gameState} myPlayerId={myPlayerId} socket={socket} onClose={() => setShowMortgage(false)} />
      )}

      {/* Tax modal */}
      {showTaxModal && pending?.type === 'pay_tax' && (
        <EventCardModal
          type="tax"
          amount={pending.amount}
          playerName={activePlayer?.name}
          isMyTurn={isMyTurn}
          socket={socket}
        />
      )}

      {/* Repair costs modal */}
      {showRepairModal && pending?.type === 'repair_costs' && (
        <EventCardModal
          type="repair"
          amount={pending.amount}
          playerName={activePlayer?.name}
          isMyTurn={isMyTurn}
          socket={socket}
        />
      )}

      {/* Card drawn modal */}
      {showCardModal && gameState.lastCardEvent && (
        <EventCardModal
          type="card"
          card={gameState.lastCardEvent.card}
          playerName={players.find((p) => p.id === gameState.lastCardEvent!.drawnBy)?.name}
          isMyTurn={gameState.lastCardEvent.drawnBy === myPlayerId}
          socket={socket}
          players={players}
          onClose={() => setShowCardModal(false)}
        />
      )}
    </>
  );

  // ── Mobile layout ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100dvh', background: '#0b1120', overflow: 'hidden',
        paddingTop: 'var(--safe-top)',
      }}>
        {/* Compact header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: '#111827', borderBottom: '1px solid #1e3a5f',
          flexShrink: 0, gap: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#e84393', letterSpacing: '0.1em' }}>
            WIESBADEN
          </div>
          {/* Current player money indicators */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            {players.filter(p => !p.isBankrupt).map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 7px', borderRadius: 12,
                background: p.id === currentTurn.playerId ? p.color + '22' : 'transparent',
                border: `1px solid ${p.id === currentTurn.playerId ? p.color + '44' : 'transparent'}`,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: p.id === currentTurn.playerId ? p.color : '#546a8a' }}>
                  {p.money}€
                </span>
              </div>
            ))}
          </div>
          {/* Jackpot */}
          {gameState.jackpot.amount > 0 && (
            <div style={{ fontSize: 10, color: '#f5a623', fontWeight: 700, flexShrink: 0 }}>
              🅿 {gameState.jackpot.amount}€
            </div>
          )}
        </div>

        {/* Scaled board */}
        <div style={{
          flexShrink: 0,
          width: '100%', display: 'flex', justifyContent: 'center',
          padding: '4px 4px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            width: BOARD_SIZE * boardScale,
            height: BOARD_SIZE * boardScale,
            position: 'relative', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0,
              transformOrigin: 'top left',
              transform: `scale(${boardScale})`,
            }}>
              <Board gameState={gameState} myPlayerId={myPlayerId} />
            </div>
          </div>
        </div>

        {/* Tab panel - fills remaining space above tab bar */}
        <div style={{
          flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          minHeight: 0,
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            {activeTab === 'action' && (
              <ActionPanel
                gameState={gameState} myPlayerId={myPlayerId}
                socket={socket}
                onOpenTrade={() => setShowTrade(true)}
                onOpenMortgage={() => setShowMortgage(true)}
              />
            )}
            {activeTab === 'players' && (
              <PlayerPanel
                players={players} tiles={tiles}
                currentPlayerId={currentTurn.playerId}
                myPlayerId={myPlayerId}
                winCondition={config.winConditionNetWorth}
              />
            )}
            {activeTab === 'more' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => { setShowTrade(true); }} style={mobileMoreBtn}>🤝 Handel</button>
                <button onClick={() => { setShowMortgage(true); }} style={mobileMoreBtn}>🏦 Hypotheken</button>
                {gameState.gamePhase === 'finished' && (
                  <div style={{ textAlign: 'center', color: '#ccff44', fontWeight: 800, fontSize: 16, padding: '1rem' }}>
                    🏆 {players.find(p => p.id === gameState.winner)?.name} gewinnt!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', background: '#111827',
          borderTop: '1px solid #1e3a5f', flexShrink: 0,
          paddingBottom: 'var(--safe-bottom)',
        }}>
          {([
            { id: 'action',  label: '🎲 Aktion',  badge: isMyTurn },
            { id: 'players', label: '👥 Spieler',  badge: false },
            { id: 'more',    label: '⋯ Mehr',      badge: incomingTrades.length > 0 },
          ] as const).map(({ id, label, badge }) => (
            <button key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: activeTab === id ? '#e84393' : '#546a8a',
                borderTop: `2px solid ${activeTab === id ? '#e84393' : 'transparent'}`,
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                position: 'relative' as const,
              }}>
              {label}
              {badge && (
                <span style={{
                  position: 'absolute', top: 6, right: 'calc(50% - 20px)',
                  width: 6, height: 6, borderRadius: '50%', background: '#e84393',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* All modals (position: fixed, work in both layouts) */}
        {modals}
      </div>
    );
  }

  // ── Desktop layout (unchanged) ───────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      padding: 12, gap: 10, background: '#0b1120',
    }}>
      {/* Winner banner */}
      {gameState.gamePhase === 'finished' && (
        <div style={{
          background: 'linear-gradient(135deg, #1a3a00, #2a5a00)',
          border: '1px solid #4a9a00', borderRadius: 10,
          padding: '10px 20px', textAlign: 'center',
          fontWeight: 700, fontSize: 16, color: '#ccff44',
          animation: 'slideUp 0.3s ease both', flexShrink: 0,
        }}>
          🏆 {players.find((p) => p.id === gameState.winner)?.name} gewinnt!
        </div>
      )}

      {/* Trade badge */}
      {incomingTrades.length > 0 && !showTrade && (
        <button onClick={() => setShowTrade(true)} style={{
          position: 'fixed', top: 14, right: 14, zIndex: 500,
          background: '#e84393', border: 'none', borderRadius: 8,
          padding: '7px 14px', color: '#fff', cursor: 'pointer',
          fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          🤝 {incomingTrades.length} Handelsangebot
        </button>
      )}

      {/* Main layout – fixed widths to prevent sidebar shaking */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        flexWrap: 'nowrap', overflowX: 'auto',
      }}>
        {/* Board – never shrinks */}
        <div style={{ flexShrink: 0 }}>
          <Board gameState={gameState} myPlayerId={myPlayerId} />
        </div>

        {/* Sidebar – fixed width, no reflow */}
        <div style={{
          width: 300, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 8,
          // Prevent any inner animations from causing layout shift
          contain: 'layout style',
        }}>
          <PlayerPanel
            players={players} tiles={tiles}
            currentPlayerId={currentTurn.playerId}
            myPlayerId={myPlayerId}
            winCondition={config.winConditionNetWorth}
          />
          <ActionPanel
            gameState={gameState} myPlayerId={myPlayerId}
            socket={socket}
            onOpenTrade={() => setShowTrade(true)}
            onOpenMortgage={() => setShowMortgage(true)}
          />
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {modals}
    </div>
  );
}
