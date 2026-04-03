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

const DECK: Record<string, { bg: string; border: string; accent: string; icon: string; label: string }> = {
  chance:          { bg: '#fffbe8', border: '#d4a01244', accent: '#c47d0a', icon: '?', label: 'EREIGNISKARTE' },
  community_chest: { bg: '#f0fff8', border: '#16884a33', accent: '#16884a', icon: '📦', label: 'GEMEINSCHAFTSKARTE' },
};

function getAmountDisplay(card?: ActionCard, amount?: number): { value: string; color: string } | null {
  if (amount !== undefined) return { value: `${amount}€`, color: '#c42828' };
  if (!card) return null;
  if (card.amount !== undefined) {
    const gain = ['collect_from_bank', 'collect_from_players'].includes(card.type);
    return { value: `${gain ? '+' : '-'}${card.amount}€`, color: gain ? '#16884a' : '#c42828' };
  }
  if (card.type === 'repair_costs') return { value: `${card.houseCost}€/Haus · ${card.hotelCost}€/Hotel`, color: '#c42828' };
  if (card.type === 'go_to_jail')   return { value: '🔒 Gefängnis', color: '#c42828' };
  if (card.type === 'move_to')      return { value: `→ Feld ${card.position}`, color: '#c47d0a' };
  if (card.type === 'move_back')    return { value: `← ${card.spaces} Felder zurück`, color: '#c47d0a' };
  if (card.type === 'move_to_nearest_railroad') return { value: '→ Bahnhof', color: '#2252c8' };
  return null;
}

export default function EventCardModal({ type, card, amount, playerName, isMyTurn, socket, players, onClose }: Props) {
  const deck = card ? (DECK[card.deckType] ?? DECK.chance) : null;

  useEffect(() => {
    if (type === 'card') playCardDraw();
    else playTax();
  }, [type]);

  const displayAmount = getAmountDisplay(card, amount);
  const pending = type === 'tax' ? 'pay_tax' : type === 'repair' ? 'repair_costs' : null;

  const handlePay = () => { playRentPay(); socket.emit('game:confirm_action'); };

  const isChance    = type === 'card' && card?.deckType !== 'community_chest';
  const isCommunity = type === 'card' && card?.deckType === 'community_chest';
  const isTaxType   = type === 'tax' || type === 'repair';

  const accentBg     = isTaxType ? '#fff5f5'  : (deck?.bg ?? '#fffbe8');
  const accentBorder = isTaxType ? '#c4282833' : (deck?.border ?? '#d4a01244');
  const accentColor  = isTaxType ? '#c42828'   : (deck?.accent ?? '#c47d0a');

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,20,12,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 320, borderRadius: 20,
        background: '#faf6ed',
        border: `1px solid #d0c4aa`,
        overflow: 'hidden',
        animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        boxShadow: '0 32px 80px rgba(26,20,12,0.35)',
      }}>
        {/* Top accent bar */}
        <div style={{ height: 6, background: accentColor }} />

        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          background: accentBg,
          borderBottom: `1px solid ${accentBorder}`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 44, lineHeight: 1, marginBottom: 8,
            filter: 'drop-shadow(0 2px 4px rgba(26,20,12,0.15))',
          }}>
            {type === 'card' ? (isChance ? '❓' : '📦') : type === 'tax' ? '💸' : '🔧'}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: accentColor,
          }}>
            {type === 'card' ? deck?.label : type === 'tax' ? 'STEUER' : 'REPARATURKOSTEN'}
          </div>
          {playerName && (
            <div style={{ fontSize: 11, color: '#9e8e78', marginTop: 5 }}>{playerName}</div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>
          {/* Card text */}
          <div style={{
            fontSize: 15, fontWeight: 600, textAlign: 'center', color: '#1a1510',
            lineHeight: 1.55, marginBottom: 18, minHeight: 46,
          }}>
            {type === 'card' ? card?.text :
             type === 'tax'  ? `Steuer: ${amount}€ → Jackpot` :
             `Reparaturen: ${card?.houseCost ?? 0}€/Haus · ${card?.hotelCost ?? 0}€/Hotel`}
          </div>

          {/* Amount */}
          {displayAmount && (
            <div style={{
              textAlign: 'center', marginBottom: 20,
              fontSize: 44, fontWeight: 900,
              color: displayAmount.color,
              animation: 'bounceIn 0.35s ease both',
              letterSpacing: '-1px',
            }}>
              {displayAmount.value}
            </div>
          )}

          {/* Pay button */}
          {isMyTurn && pending && (
            <button onClick={handlePay} style={{
              width: '100%', padding: '13px', border: 'none', borderRadius: 12,
              background: '#c42828', color: '#fff', cursor: 'pointer',
              fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
              boxShadow: '0 3px 12px rgba(196,40,40,0.4)',
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e)   => (e.currentTarget.style.transform = 'scale(1)')}>
              💸 Bezahlen ({amount}€)
            </button>
          )}

          {/* Confirm button for card events */}
          {type === 'card' && (
            <button onClick={onClose} style={{
              width: '100%', padding: '13px', border: 'none', borderRadius: 12,
              background: accentColor, color: '#fff', cursor: 'pointer',
              fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
              boxShadow: `0 3px 12px ${accentColor}55`,
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e)   => (e.currentTarget.style.transform = 'scale(1)')}>
              ✓ Verstanden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
