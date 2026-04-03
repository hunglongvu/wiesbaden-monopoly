import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, PropertyTile } from '../types';
import Board from './Board';
import PlayerPanel from './PlayerPanel';
import ActionPanel from './ActionPanel';
import TradeModal from './modals/TradeModal';
import MortgageModal from './modals/MortgageModal';
import BuyModal from './modals/BuyModal';
import BuildModal from './modals/BuildModal';
import EventCardModal from './modals/EventCardModal';
import { useIsMobile } from '../hooks/useIsMobile';

interface Props { gameState: GameState; myPlayerId: string; socket: Socket; }

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
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 900);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return width;
}

export default function Game({ gameState, myPlayerId, socket }: Props) {
  const [showTrade,    setShowTrade]    = useState(false);
  const [showMortgage, setShowMortgage] = useState(false);
  const [activeTab,    setActiveTab]    = useState<'action' | 'players'>('action');
  const shownCardRef  = useRef<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  const isMobile   = useIsMobile();
  const windowWidth = useWindowWidth();

  const { players, tiles, currentTurn, config } = gameState;
  const me      = players.find((p) => p.id === myPlayerId);
  const pending = currentTurn.pendingAction;
  const isMyTurn = currentTurn.playerId === myPlayerId;
  const animDone = useAnimationDone(players);

  useEffect(() => {
    const evt = gameState.lastCardEvent;
    if (!evt) { shownCardRef.current = null; return; }
    const key = `${evt.drawnBy}-${evt.card.id}`;
    if (key !== shownCardRef.current) {
      shownCardRef.current = key;
      if (evt.drawnBy === myPlayerId) {
        setShowCardModal(true);
      }
    }
  }, [gameState.lastCardEvent, myPlayerId]);

  useEffect(() => {
    if (isMyTurn && isMobile) setActiveTab('action');
  }, [isMyTurn, isMobile]);

  const showTaxModal    = isMyTurn && animDone && pending?.type === 'pay_tax';
  const showRepairModal = isMyTurn && animDone && pending?.type === 'repair_costs';
  const showBuyModal    = isMyTurn && animDone && pending?.type === 'buy_property';
  const showBuildModal  = isMyTurn && animDone && pending?.type === 'build_house';

  const incomingTrades = gameState.pendingTrades.filter(
    (t) => t.toPlayerId === myPlayerId && t.status === 'pending'
  );
  const activePlayer = players.find((p) => p.id === currentTurn.playerId);

  const BOARD_SIZE  = 838; // CORNER*2 + SIDE*9 + 10 (gap=1 × 11)
  const boardScale  = Math.min(1, (windowWidth - 8) / BOARD_SIZE);

  const modals = (
    <>
      {showBuyModal && me && pending?.type === 'buy_property' && (
        <BuyModal tile={tiles[pending.tilePosition]} player={me} socket={socket} />
      )}
      {showBuildModal && me && pending?.type === 'build_house' && (
        <BuildModal tile={tiles[pending.tilePosition] as PropertyTile} player={me} socket={socket} />
      )}
      {showTrade && (
        <TradeModal gameState={gameState} myPlayerId={myPlayerId} socket={socket} onClose={() => setShowTrade(false)} />
      )}
      {showMortgage && (
        <MortgageModal gameState={gameState} myPlayerId={myPlayerId} socket={socket} onClose={() => setShowMortgage(false)} />
      )}
      {showTaxModal && pending?.type === 'pay_tax' && (
        <EventCardModal type="tax" amount={pending.amount} playerName={activePlayer?.name} isMyTurn={isMyTurn} socket={socket} />
      )}
      {showRepairModal && pending?.type === 'repair_costs' && (
        <EventCardModal type="repair" amount={pending.amount} playerName={activePlayer?.name} isMyTurn={isMyTurn} socket={socket} />
      )}
      {showCardModal && gameState.lastCardEvent && (
        <EventCardModal
          type="card" card={gameState.lastCardEvent.card}
          playerName={players.find((p) => p.id === gameState.lastCardEvent!.drawnBy)?.name}
          isMyTurn={gameState.lastCardEvent.drawnBy === myPlayerId}
          socket={socket} players={players}
          onClose={() => setShowCardModal(false)}
        />
      )}
    </>
  );

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100dvh', background: '#e8e0d0', overflow: 'hidden',
        paddingTop: 'var(--safe-top)',
      }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', background: '#fff',
          borderBottom: '1px solid #d0c4aa', flexShrink: 0, gap: 8,
          boxShadow: '0 1px 4px rgba(26,20,12,0.08)',
        }}>
          <div style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 13, color: '#e8357a', letterSpacing: '0.08em',
          }}>
            WIESBADEN
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            {players.filter(p => !p.isBankrupt).map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 12,
                background: p.id === currentTurn.playerId ? p.color + '20' : 'transparent',
                border: `1px solid ${p.id === currentTurn.playerId ? p.color + '55' : 'transparent'}`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: p.id === currentTurn.playerId ? p.color : '#9e8e78' }}>
                  {p.money}€
                </span>
              </div>
            ))}
          </div>
          {gameState.jackpot.amount > 0 && (
            <div style={{ fontSize: 11, color: '#c47d0a', fontWeight: 700, flexShrink: 0 }}>
              🅿 {gameState.jackpot.amount}€
            </div>
          )}
        </div>

        {/* Board */}
        <div style={{ flexShrink: 0, width: '100%', display: 'flex', justifyContent: 'center', padding: '6px 4px 0', overflow: 'hidden' }}>
          <div style={{ width: BOARD_SIZE * boardScale, height: BOARD_SIZE * boardScale, position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${boardScale})` }}>
              <Board gameState={gameState} myPlayerId={myPlayerId} />
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' } as React.CSSProperties}>
            {activeTab === 'action' ? (
              <ActionPanel gameState={gameState} myPlayerId={myPlayerId} socket={socket} onOpenTrade={() => setShowTrade(true)} onOpenMortgage={() => setShowMortgage(true)} />
            ) : (
              <PlayerPanel players={players} tiles={tiles} currentPlayerId={currentTurn.playerId} myPlayerId={myPlayerId} winCondition={config.winConditionNetWorth} />
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', background: '#fff', borderTop: '1px solid #d0c4aa',
          flexShrink: 0, paddingBottom: 'var(--safe-bottom)',
        }}>
          {([
            { id: 'action' as const,  label: '🎲 Aktion',  badge: isMyTurn },
            { id: 'players' as const, label: '👥 Spieler',  badge: incomingTrades.length > 0 },
          ]).map(({ id, label, badge }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex: 1, padding: '13px 8px', border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: activeTab === id ? '#e8357a' : '#9e8e78',
              borderTop: `2px solid ${activeTab === id ? '#e8357a' : 'transparent'}`,
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit', position: 'relative' as const,
            }}>
              {label}
              {badge && (
                <span style={{
                  position: 'absolute', top: 8, right: 'calc(50% - 22px)',
                  width: 7, height: 7, borderRadius: '50%', background: '#e8357a',
                }} />
              )}
            </button>
          ))}
        </div>

        {modals}
      </div>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      padding: '16px 20px', gap: 12, background: '#e8e0d0',
    }}>
      {/* Winner banner */}
      {gameState.gamePhase === 'finished' && (
        <div style={{
          background: '#f0fff4', border: '1px solid #16884a55',
          borderRadius: 12, padding: '12px 24px', textAlign: 'center',
          fontWeight: 700, fontSize: 17, color: '#16884a',
          animation: 'slideDown 0.3s ease both', flexShrink: 0,
          boxShadow: '0 2px 12px rgba(22,136,74,0.15)',
        }}>
          🏆 {players.find((p) => p.id === gameState.winner)?.name} gewinnt!
        </div>
      )}

      {/* Trade badge */}
      {incomingTrades.length > 0 && !showTrade && (
        <button onClick={() => setShowTrade(true)} style={{
          position: 'fixed', top: 16, right: 16, zIndex: 500,
          background: '#e8357a', border: 'none', borderRadius: 10,
          padding: '8px 16px', color: '#fff', cursor: 'pointer',
          fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
          animation: 'pulse 1.5s ease-in-out infinite',
          boxShadow: '0 4px 16px rgba(232,53,122,0.4)',
        }}>
          🤝 {incomingTrades.length} Handelsangebot
        </button>
      )}

      {/* Main grid */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'nowrap', overflowX: 'auto' }}>
        {/* Board */}
        <div style={{ flexShrink: 0 }}>
          <Board gameState={gameState} myPlayerId={myPlayerId} />
        </div>

        {/* Sidebar */}
        <div style={{ width: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PlayerPanel players={players} tiles={tiles} currentPlayerId={currentTurn.playerId} myPlayerId={myPlayerId} winCondition={config.winConditionNetWorth} />
          <ActionPanel gameState={gameState} myPlayerId={myPlayerId} socket={socket} onOpenTrade={() => setShowTrade(true)} onOpenMortgage={() => setShowMortgage(true)} />
        </div>
      </div>

      {modals}
    </div>
  );
}
