import React, { useEffect, useState, useCallback } from 'react';
import { socket, connectSocket } from './socket';
import { GameState, TradeOffer } from './types';
import Lobby from './components/Lobby';
import Game from './components/Game';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setError('Verbindung zum Server fehlgeschlagen. Läuft der Server?');
    });

    socket.on('game:state_update', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game:error', (message: string) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    socket.on('game:reset', () => {
      setGameState(null);
      setHasJoined(false);
      setPlayerName('');
    });

    connectSocket();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('game:state_update');
      socket.off('game:error');
      socket.off('game:reset');
    };
  }, []);

  const handleJoin = useCallback((name: string) => {
    setPlayerName(name);
    socket.emit('game:join', { playerName: name });
    setHasJoined(true);
  }, []);

  const handleStartGame = useCallback(() => {
    socket.emit('game:start');
  }, []);

  if (!connected) {
    return (
      <div style={styles.centered}>
        <div style={styles.card}>
          <h1 style={styles.title}>🏙️ Wiesbaden Monopoly</h1>
          {error ? (
            <>
              <p style={styles.errorText}>{error}</p>
              <button
                style={styles.retryButton}
                onClick={() => { setError(null); socket.connect(); }}
              >
                Erneut verbinden
              </button>
            </>
          ) : (
            <p style={styles.subtext}>Verbinde mit Server...</p>
          )}
        </div>
      </div>
    );
  }

  if (!gameState || !hasJoined) {
    return (
      <div style={styles.centered}>
        {error && <div style={styles.errorBanner}>{error}</div>}
        <Lobby
          gameState={gameState}
          onJoin={handleJoin}
          onStart={handleStartGame}
          mySocketId={socket.id || ''}
        />
      </div>
    );
  }

  if (gameState.gamePhase === 'lobby') {
    return (
      <div style={styles.centered}>
        {error && <div style={styles.errorBanner}>{error}</div>}
        <Lobby
          gameState={gameState}
          onJoin={handleJoin}
          onStart={handleStartGame}
          mySocketId={socket.id || ''}
        />
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      {error && <div style={styles.errorBanner}>{error}</div>}
      <Game
        gameState={gameState}
        myPlayerId={socket.id || ''}
        socket={socket}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    background: '#16213e',
    padding: '2rem 3rem',
    borderRadius: '12px',
    border: '1px solid #0f3460',
    textAlign: 'center',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '1rem',
    color: '#e94560',
  },
  subtext: {
    color: '#aaa',
  },
  errorText: {
    color: '#e74c3c',
    marginTop: '0.5rem',
  },
  retryButton: {
    marginTop: '1rem',
    padding: '0.6rem 1.5rem',
    background: '#e94560',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  errorBanner: {
    position: 'fixed',
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#e74c3c',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    zIndex: 9999,
    fontWeight: 'bold',
  },
  appContainer: {
    width: '100%',
    minHeight: '100vh',
  },
};
