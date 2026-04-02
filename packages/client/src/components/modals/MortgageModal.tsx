import React from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Tile, PropertyTile, RailroadTile, UtilityTile } from '../../types';

interface MortgageModalProps {
  gameState: GameState;
  myPlayerId: string;
  socket: Socket;
  onClose: () => void;
}

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  lightblue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#DC143C',
  yellow: '#FFD700',
  green: '#228B22',
  darkblue: '#00008B',
};

export default function MortgageModal({
  gameState,
  myPlayerId,
  socket,
  onClose,
}: MortgageModalProps) {
  const { tiles, players, config } = gameState;
  const me = players.find((p) => p.id === myPlayerId);

  const myProperties = tiles.filter((t) => {
    if (t.type === 'property') return (t as PropertyTile).ownerId === myPlayerId;
    if (t.type === 'railroad') return (t as RailroadTile).ownerId === myPlayerId;
    if (t.type === 'utility') return (t as UtilityTile).ownerId === myPlayerId;
    return false;
  });

  const handleMortgage = (pos: number) => {
    socket.emit('game:mortgage_property', { tilePosition: pos });
  };

  const handleUnmortgage = (pos: number) => {
    socket.emit('game:unmortgage_property', { tilePosition: pos });
  };

  const handleSellHouse = (pos: number) => {
    socket.emit('game:sell_house', { tilePosition: pos });
  };

  const getMortgageValue = (t: Tile): number => {
    const p = t as PropertyTile | RailroadTile | UtilityTile;
    return Math.floor(p.price / 2);
  };

  const getUnmortgageCost = (t: Tile): number => {
    const mv = getMortgageValue(t);
    return Math.ceil(mv * (1 + config.mortgageInterestRate));
  };

  const canUnmortgage = (t: Tile): boolean => {
    return (me?.money || 0) >= getUnmortgageCost(t);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>🏦 Hypothekenverwaltung</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {me && (
          <p style={styles.money}>Bargeld: {me.money.toLocaleString()}€</p>
        )}

        {myProperties.length === 0 && (
          <p style={styles.noProps}>Keine Immobilien vorhanden</p>
        )}

        <div style={styles.list}>
          {myProperties.map((t) => {
            const isProp = t.type === 'property';
            const prop = isProp ? (t as PropertyTile) : null;
            const isMortgaged = (t as PropertyTile | RailroadTile | UtilityTile).mortgaged;
            const hasHouses = isProp && prop!.houses > 0;
            const mortgageValue = getMortgageValue(t);
            const unmortgageCost = getUnmortgageCost(t);

            return (
              <div
                key={t.position}
                style={{
                  ...styles.propRow,
                  opacity: isMortgaged ? 0.7 : 1,
                  borderLeft: isProp
                    ? `4px solid ${COLOR_MAP[prop!.color] || '#555'}`
                    : t.type === 'railroad'
                    ? '4px solid #666'
                    : '4px solid #336',
                }}
              >
                <div style={styles.propInfo}>
                  <span style={styles.propName}>{t.name}</span>
                  {isMortgaged && <span style={styles.mortBadge}>VERPFÄNDET</span>}
                  {hasHouses && (
                    <span style={styles.housesBadge}>
                      {prop!.houses === 5 ? 'Hotel' : `${prop!.houses} Haus/Häuser`}
                    </span>
                  )}
                </div>

                <div style={styles.propActions}>
                  {isProp && hasHouses && (
                    <button
                      onClick={() => handleSellHouse(t.position)}
                      style={styles.sellHouseBtn}
                      title={`Haus verkaufen: +${Math.floor(prop!.housePrice / 2)}€`}
                    >
                      🏠 Haus verkaufen (+{Math.floor(prop!.housePrice / 2)}€)
                    </button>
                  )}

                  {!isMortgaged && !hasHouses && (
                    <button
                      onClick={() => handleMortgage(t.position)}
                      style={styles.mortgageBtn}
                      title={`Hypothek: +${mortgageValue}€`}
                    >
                      📋 Verpfänden (+{mortgageValue}€)
                    </button>
                  )}

                  {isMortgaged && (
                    <button
                      onClick={() => handleUnmortgage(t.position)}
                      disabled={!canUnmortgage(t)}
                      style={
                        canUnmortgage(t)
                          ? styles.unmortgageBtn
                          : styles.unmortgageBtnDisabled
                      }
                      title={`Auslösen: -${unmortgageCost}€`}
                    >
                      ✓ Auslösen (-{unmortgageCost}€)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: '#16213e',
    borderRadius: '16px',
    padding: '1.5rem',
    maxWidth: 'min(480px, calc(100vw - 24px))',
    width: '100%',
    border: '1px solid #0f3460',
    maxHeight: '90dvh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  title: {
    color: '#e94560',
    margin: 0,
    fontSize: '1.2rem',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#aaa',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  money: {
    color: '#2ecc71',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  },
  noProps: {
    color: '#555',
    textAlign: 'center',
    padding: '2rem',
    fontStyle: 'italic',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  propRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0d2035',
    borderRadius: '8px',
    padding: '0.6rem 0.75rem',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  propInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: 1,
    flexWrap: 'wrap',
  },
  propName: {
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  mortBadge: {
    background: '#e74c3c33',
    color: '#e74c3c',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    border: '1px solid #e74c3c44',
  },
  housesBadge: {
    background: '#2ecc7133',
    color: '#2ecc71',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    border: '1px solid #2ecc7144',
  },
  propActions: {
    display: 'flex',
    gap: '0.35rem',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  mortgageBtn: {
    padding: '0.3rem 0.6rem',
    border: 'none',
    borderRadius: '5px',
    background: '#e74c3c',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  unmortgageBtn: {
    padding: '0.3rem 0.6rem',
    border: 'none',
    borderRadius: '5px',
    background: '#2ecc71',
    color: '#000',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  unmortgageBtnDisabled: {
    padding: '0.3rem 0.6rem',
    border: 'none',
    borderRadius: '5px',
    background: '#333',
    color: '#666',
    cursor: 'not-allowed',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  sellHouseBtn: {
    padding: '0.3rem 0.6rem',
    border: 'none',
    borderRadius: '5px',
    background: '#f39c12',
    color: '#000',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
};
