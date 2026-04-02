import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Player, Tile, PropertyTile, RailroadTile, UtilityTile, TradeOffer } from '../../types';

interface TradeModalProps {
  gameState: GameState;
  myPlayerId: string;
  socket: Socket;
  onClose: () => void;
}

export default function TradeModal({ gameState, myPlayerId, socket, onClose }: TradeModalProps) {
  const { players, tiles, pendingTrades } = gameState;
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [offerMoney, setOfferMoney] = useState('0');
  const [requestMoney, setRequestMoney] = useState('0');
  const [offerProperties, setOfferProperties] = useState<number[]>([]);
  const [requestProperties, setRequestProperties] = useState<number[]>([]);

  const me = players.find((p) => p.id === myPlayerId);
  const otherPlayers = players.filter((p) => p.id !== myPlayerId && !p.isBankrupt);

  const myProperties = tiles.filter((t) => {
    if (t.type === 'property') return (t as PropertyTile).ownerId === myPlayerId;
    if (t.type === 'railroad') return (t as RailroadTile).ownerId === myPlayerId;
    if (t.type === 'utility') return (t as UtilityTile).ownerId === myPlayerId;
    return false;
  });

  const targetPlayer = players.find((p) => p.id === targetPlayerId);
  const targetProperties = tiles.filter((t) => {
    if (t.type === 'property') return (t as PropertyTile).ownerId === targetPlayerId;
    if (t.type === 'railroad') return (t as RailroadTile).ownerId === targetPlayerId;
    if (t.type === 'utility') return (t as UtilityTile).ownerId === targetPlayerId;
    return false;
  });

  // Pending trades involving me
  const incomingTrades = pendingTrades.filter(
    (t) => t.toPlayerId === myPlayerId && t.status === 'pending'
  );

  const toggleProperty = (
    pos: number,
    list: number[],
    setList: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    setList(list.includes(pos) ? list.filter((p) => p !== pos) : [...list, pos]);
  };

  const handlePropose = () => {
    if (!targetPlayerId) return;
    socket.emit('game:propose_trade', {
      toPlayerId: targetPlayerId,
      offerMoney: parseInt(offerMoney) || 0,
      offerProperties,
      requestMoney: parseInt(requestMoney) || 0,
      requestProperties,
    });
    onClose();
  };

  const handleAccept = (tradeId: string) => {
    socket.emit('game:accept_trade', { tradeId });
  };

  const handleReject = (tradeId: string) => {
    socket.emit('game:reject_trade', { tradeId });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>🤝 Handelszentrum</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Incoming trade offers */}
        {incomingTrades.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📬 Eingehende Angebote</h3>
            {incomingTrades.map((trade) => {
              const fromPlayer = players.find((p) => p.id === trade.fromPlayerId);
              return (
                <div key={trade.id} style={styles.tradeOffer}>
                  <p style={styles.tradeFrom}>Von: {fromPlayer?.name}</p>
                  <div style={styles.tradeDetails}>
                    <div style={styles.tradeCol}>
                      <p style={styles.tradeColTitle}>Bietet:</p>
                      {trade.offerMoney > 0 && <p>{trade.offerMoney}€</p>}
                      {trade.offerProperties.map((pos) => (
                        <p key={pos} style={styles.tradeProp}>
                          {tiles[pos]?.name}
                          {(tiles[pos] as PropertyTile | RailroadTile | UtilityTile).mortgaged ? ' (verpfändet)' : ''}
                        </p>
                      ))}
                      {trade.offerMoney === 0 && trade.offerProperties.length === 0 && (
                        <p style={styles.tradeEmpty}>Nichts</p>
                      )}
                    </div>
                    <div style={styles.tradeSep}>⇄</div>
                    <div style={styles.tradeCol}>
                      <p style={styles.tradeColTitle}>Möchte:</p>
                      {trade.requestMoney > 0 && <p>{trade.requestMoney}€</p>}
                      {trade.requestProperties.map((pos) => (
                        <p key={pos} style={styles.tradeProp}>
                          {tiles[pos]?.name}
                          {(tiles[pos] as PropertyTile | RailroadTile | UtilityTile).mortgaged ? ' (verpfändet)' : ''}
                        </p>
                      ))}
                      {trade.requestMoney === 0 && trade.requestProperties.length === 0 && (
                        <p style={styles.tradeEmpty}>Nichts</p>
                      )}
                    </div>
                  </div>
                  <div style={styles.tradeBtns}>
                    <button
                      onClick={() => handleAccept(trade.id)}
                      style={styles.acceptBtn}
                    >
                      ✓ Annehmen
                    </button>
                    <button
                      onClick={() => handleReject(trade.id)}
                      style={styles.rejectBtn}
                    >
                      ✕ Ablehnen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Propose new trade */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📤 Neues Angebot</h3>

          <div style={styles.field}>
            <label style={styles.label}>Handelspartner:</label>
            <select
              value={targetPlayerId}
              onChange={(e) => {
                setTargetPlayerId(e.target.value);
                setRequestProperties([]);
              }}
              style={styles.select}
            >
              <option value="">Spieler wählen...</option>
              {otherPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.twoCol}>
            <div style={styles.colLeft}>
              <p style={styles.label}>Ich biete:</p>
              <div style={styles.field}>
                <input
                  type="number"
                  min="0"
                  max={me?.money || 0}
                  value={offerMoney}
                  onChange={(e) => setOfferMoney(e.target.value)}
                  placeholder="Geld (€)"
                  style={styles.input}
                />
              </div>
              <p style={styles.subLabel}>Meine Immobilien:</p>
              {myProperties.length === 0 && (
                <p style={styles.noProps}>Keine Immobilien</p>
              )}
              {myProperties.map((t) => (
                <div
                  key={t.position}
                  onClick={() =>
                    toggleProperty(t.position, offerProperties, setOfferProperties)
                  }
                  style={{
                    ...styles.propItem,
                    background: offerProperties.includes(t.position)
                      ? '#1a3a5c'
                      : '#0d2035',
                    border: offerProperties.includes(t.position)
                      ? '1px solid #3498db'
                      : '1px solid #1a2a4a',
                  }}
                >
                  {t.name}
                  {(t as PropertyTile | RailroadTile | UtilityTile).mortgaged && (
                    <span style={styles.mortTag}> (V)</span>
                  )}
                </div>
              ))}
            </div>

            <div style={styles.colRight}>
              <p style={styles.label}>Ich möchte:</p>
              <div style={styles.field}>
                <input
                  type="number"
                  min="0"
                  max={targetPlayer?.money || 0}
                  value={requestMoney}
                  onChange={(e) => setRequestMoney(e.target.value)}
                  placeholder="Geld (€)"
                  style={styles.input}
                />
              </div>
              {targetPlayerId && (
                <>
                  <p style={styles.subLabel}>Immobilien von {targetPlayer?.name}:</p>
                  {targetProperties.length === 0 && (
                    <p style={styles.noProps}>Keine Immobilien</p>
                  )}
                  {targetProperties.map((t) => (
                    <div
                      key={t.position}
                      onClick={() =>
                        toggleProperty(t.position, requestProperties, setRequestProperties)
                      }
                      style={{
                        ...styles.propItem,
                        background: requestProperties.includes(t.position)
                          ? '#1a3a5c'
                          : '#0d2035',
                        border: requestProperties.includes(t.position)
                          ? '1px solid #3498db'
                          : '1px solid #1a2a4a',
                      }}
                    >
                      {t.name}
                      {(t as PropertyTile | RailroadTile | UtilityTile).mortgaged && (
                        <span style={styles.mortTag}> (V)</span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <button
            onClick={handlePropose}
            disabled={!targetPlayerId}
            style={targetPlayerId ? styles.proposeBtn : styles.proposeBtnDisabled}
          >
            Angebot senden
          </button>
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
    maxWidth: 'min(560px, calc(100vw - 24px))',
    width: '100%',
    border: '1px solid #0f3460',
    maxHeight: '90dvh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    color: '#e94560',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#aaa',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    color: '#aaa',
    marginBottom: '0.75rem',
  },
  tradeOffer: {
    background: '#0d2035',
    borderRadius: '10px',
    padding: '0.75rem',
    marginBottom: '0.75rem',
    border: '1px solid #1a2a4a',
  },
  tradeFrom: {
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
  },
  tradeDetails: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
  },
  tradeCol: {
    flex: 1,
    fontSize: '0.8rem',
  },
  tradeColTitle: {
    color: '#aaa',
    marginBottom: '0.25rem',
    fontWeight: 'bold',
  },
  tradeProp: {
    color: '#ccc',
    fontSize: '0.78rem',
  },
  tradeEmpty: {
    color: '#555',
    fontStyle: 'italic',
  },
  tradeSep: {
    color: '#aaa',
    padding: '0 0.25rem',
    fontSize: '1.2rem',
    alignSelf: 'center',
  },
  tradeBtns: {
    display: 'flex',
    gap: '0.5rem',
  },
  acceptBtn: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    borderRadius: '6px',
    background: '#2ecc71',
    color: '#000',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    minHeight: 44,
  },
  rejectBtn: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    borderRadius: '6px',
    background: '#e74c3c',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    minHeight: 44,
  },
  field: {
    marginBottom: '0.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#aaa',
    marginBottom: '0.25rem',
  },
  subLabel: {
    fontSize: '0.75rem',
    color: '#888',
    marginBottom: '0.25rem',
    marginTop: '0.25rem',
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #0f3460',
    background: '#0d2035',
    color: '#eee',
    fontSize: '1rem',
    minHeight: 44,
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #0f3460',
    background: '#0d2035',
    color: '#eee',
    fontSize: '1rem',
    minHeight: 44,
  },
  twoCol: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  colLeft: {
    flex: 1,
  },
  colRight: {
    flex: 1,
  },
  propItem: {
    padding: '0.3rem 0.4rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    marginBottom: '3px',
    color: '#ccc',
    userSelect: 'none',
  },
  mortTag: {
    color: '#e74c3c',
    fontSize: '0.7rem',
  },
  noProps: {
    color: '#555',
    fontSize: '0.75rem',
    fontStyle: 'italic',
  },
  proposeBtn: {
    width: '100%',
    padding: '0.6rem',
    border: 'none',
    borderRadius: '8px',
    background: '#e94560',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  proposeBtnDisabled: {
    width: '100%',
    padding: '0.6rem',
    border: 'none',
    borderRadius: '8px',
    background: '#333',
    color: '#666',
    cursor: 'not-allowed',
    fontWeight: 'bold',
  },
};
