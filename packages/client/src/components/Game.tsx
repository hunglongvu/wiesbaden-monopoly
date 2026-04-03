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
        const steps = (to - from + 28) % 28;
        if (steps > 0 && steps <= 8) maxSteps = Math.max(maxSteps, steps);
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

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };
  return { isFullscreen, toggle };
}

export default function Game({ gameState, myPlayerId, socket }: Props) {
  const [showTrade,    setShowTrade]    = useState(false);
  const [showMortgage, setShowMortgage] = useState(false);
  const [activeTab,    setActiveTab]    = useState<'action' | 'players'>('action');
  const shownCardRef  = useRef<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  const isMobile   = useIsMobile();
  const windowWidth = useWindowWidth();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

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

  const BOARD_SIZE  = 643; // CORNER*2 + SIDE*6 + 7 (gap=1 × 7, 8 cols)
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
        paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)',
      }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', background: '#fff',
          borderBottom: '1px solid #d0c4aa', flexShrink: 0, gap: 8,
          boxShadow: '0 1px 4px rgba(26,20,12,0.08)',
        }}>
          <div style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 13, color: '#e8357a', letterSpacing: '0.08em', flexShrink: 0,
          }}>
            WIESBADEN
          </div>
          {incomingTrades.length > 0 && (
            <button onClick={() => setShowTrade(true)} style={{
              background: '#e8357a', border: 'none', borderRadius: 8,
              padding: '4px 10px', color: '#fff', cursor: 'pointer',
              fontWeight: 700, fontSize: 11, fontFamily: 'inherit', flexShrink: 0,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              🤝 {incomingTrades.length} Handel
            </button>
          )}
          <button onClick={toggleFullscreen} title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'} style={{
            background: 'transparent', border: '1px solid #d0c4aa', borderRadius: 7,
            width: 30, height: 30, cursor: 'pointer', fontSize: 13, marginLeft: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {isFullscreen ? '⊠' : '⊞'}
          </button>
        </div>

        {/* Board fills remaining space, centered */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px' }}>
          <div style={{ width: BOARD_SIZE * boardScale, height: BOARD_SIZE * boardScale, position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${boardScale})` }}>
              <Board
                gameState={gameState} myPlayerId={myPlayerId}
                socket={socket}
                onOpenTrade={() => setShowTrade(true)}
                onOpenMortgage={() => setShowMortgage(true)}
              />
            </div>
          </div>
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

      {/* Fullscreen button (desktop) */}
      <button onClick={toggleFullscreen} title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'} style={{
        position: 'fixed', top: 16, left: 16, zIndex: 400,
        background: '#fff', border: '1px solid #d0c4aa', borderRadius: 9,
        padding: '6px 12px', cursor: 'pointer', fontSize: 13,
        fontFamily: 'inherit', fontWeight: 600, color: '#6b5a42',
        boxShadow: '0 2px 8px rgba(26,20,12,0.1)',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {isFullscreen ? '⊠ Verlassen' : '⊞ Vollbild'}
      </button>

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
