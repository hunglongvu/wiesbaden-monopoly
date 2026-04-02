import React, { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { ActionCard, Player } from '../../types';
import { playCardDraw, playTax, playRentPay } from '../../sounds';

interface Props {
  type: 'card' | 'tax' | 'repair';
  card?: ActionCard;
  amount?: number;
  playerName?: string;
  isMyTurn: boolean;
  socket: Socket;
  players?: Player[];
  onClose?: () => void;
}

const DECK_STYLE: Record<string, { bg: string; accent: string; icon: string; label: string }> = {
  chance:          { bg: '#1a1400', accent: '#f5a623', icon: '?', label: 'EREIGNISKARTE' },
  community_chest: { bg: '#001a14', accent: '#22d3a3', icon: '📦', label: 'GEMEINSCHAFTSKARTE' },
};

function amountDisplay(card?: ActionCard, amount?: number): { value: string; color: string } | null {
  if (amount !== undefined) return { value: `${amount}€`, color: '#ef4444' };
  if (!card) return null;
  if (card.amount !== undefined) {
    const isGain = ['collect_from_bank', 'collect_from_players'].includes(card.type);
    return { value: `${isGain ? '+' : '-'}${card.amount}€`, color: isGain ? '#22d3a3' : '#ef4444' };
  }
  if (card.type === 'repair_costs') {
    return { value: `${card.houseCost}€/Haus · ${card.hotelCost}€/Hotel`, color: '#ef4444' };
  }
  if (card.type === 'go_to_jail') return { value: '🔒 Gefängnis', color: '#ef4444' };
  if (card.type === 'move_to')    return { value: `→ Feld ${card.position}`, color: '#f5a623' };
  if (card.type === 'move_back')  return { value: `← ${card.spaces} Felder zurück`, color: '#f5a623' };
  if (card.type === 'move_to_nearest_railroad') return { value: '→ Bahnhof', color: '#f5a623' };
  return null;
}

export default function EventCardModal({
  type, card, amount, playerName, isMyTurn, socket, players, onClose,
}: Props) {
  const deckStyle = card ? (DECK_STYLE[card.deckType] ?? DECK_STYLE.chance) : null;

  useEffect(() => {
    if (type === 'card') playCardDraw();
    else if (type === 'tax') playTax();
    else if (type === 'repair') playTax();
  }, [type]);

  const displayAmount = amountDisplay(card, amount);

  const pending =
    type === 'tax'    ? 'pay_tax' :
    type === 'repair' ? 'repair_costs' : null;

  const handlePay = () => {
    playRentPay();
    socket.emit('game:confirm_action');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: 300, borderRadius: 18,
        background: type === 'card' ? (deckStyle?.bg ?? '#111') : '#1a0808',
        border: `2px solid ${
          type === 'tax' || type === 'repair' ? '#ef444455' :
          deckStyle?.accent + '55'
        }`,
        overflow: 'hidden',
        animation: 'fadeIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Card header */}
        <div style={{
          padding: '12px 16px 10px',
          background: type === 'card'
            ? deckStyle?.accent + '22'
            : 'rgba(239,68,68,0.12)',
          borderBottom: `1px solid ${
            type === 'card' ? deckStyle?.accent + '33' : 'rgba(239,68,68,0.2)'
          }`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 28, lineHeight: 1, marginBottom: 4,
            filter: 'drop-shadow(0 0 8px currentColor)',
          }}>
            {type === 'card' ? deckStyle?.icon :
             type === 'tax'  ? '💸' : '🔧'}
          </div>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.2em',
            color: type === 'card' ? deckStyle?.accent : '#ef4444',
          }}>
            {type === 'card' ? deckStyle?.label :
             type === 'tax'  ? 'STEUER' : 'REPARATURKOSTEN'}
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '18px 20px' }}>
          {playerName && (
            <div style={{ fontSize: 10, color: '#546a8a', marginBottom: 8, textAlign: 'center' }}>
              {playerName}
            </div>
          )}

          <div style={{
            fontSize: 15, fontWeight: 600, textAlign: 'center',
            color: '#e8edf5', lineHeight: 1.5, marginBottom: 16,
            minHeight: 44,
          }}>
            {type === 'card' ? card?.text :
             type === 'tax'  ? `Steuer: ${amount}€ → Jackpot` :
             `Reparaturen: ${card?.houseCost ?? 0}€/Haus · ${card?.hotelCost ?? 0}€/Hotel`}
          </div>

          {/* Amount highlight */}
          {displayAmount && (
            <div style={{
              textAlign: 'center', marginBottom: 16,
              fontSize: 40, fontWeight: 900,
              color: displayAmount.color,
              textShadow: `0 0 20px ${displayAmount.color}55`,
              animation: 'fadeIn 0.3s ease both',
            }}>
              {displayAmount.value}
            </div>
          )}

          {/* Action button */}
          {isMyTurn && pending && (
            <button onClick={handlePay} style={{
              width: '100%', padding: '11px', border: 'none', borderRadius: 10,
              background: '#ef4444', color: '#fff', cursor: 'pointer',
              fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e)   => (e.currentTarget.style.transform = 'scale(1)')}>
              💸 Bezahlen ({amount}€)
            </button>
          )}

          {/* Card auto-resolves (no button needed) or other player */}
          {(!isMyTurn || !pending) && (
            <div style={{
              textAlign: 'center', fontSize: 11, color: '#546a8a', fontStyle: 'italic',
            }}>
              {isMyTurn ? 'Wird automatisch verarbeitet…' : `Warte auf ${playerName}…`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
