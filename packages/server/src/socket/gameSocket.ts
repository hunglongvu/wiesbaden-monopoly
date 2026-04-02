import { Server, Socket } from 'socket.io';
import {
  createGame,
  addPlayer,
  startGame,
  handleRollDice,
  handleBuyProperty,
  handleDeclineProperty,
  handleAuctionBid,
  handleAuctionPass,
  handleConfirmAction,
  handlePayJailFee,
  handleBuildHouse,
  handleDeclineBuild,
  handleMortgageProperty,
  handleUnmortgageProperty,
  handleSellHouse,
  handleProposeTrade,
  handleAcceptTrade,
  handleRejectTrade,
  handleEndTurn,
} from '../engine/gameEngine';
import { GameState } from '../engine/types';

// In-memory game store (one game per room for MVP)
const games = new Map<string, GameState>();
// Map socket id → room id
const socketRooms = new Map<string, string>();

const ROOM_ID = 'main'; // Single room for MVP

export function setupGameSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── Lobby events ────────────────────────────────────────────────────────
    socket.on('game:join', (data: { playerName: string }) => {
      try {
        let game = games.get(ROOM_ID);
        if (!game) {
          game = createGame();
          games.set(ROOM_ID, game);
        }

        if (game.gamePhase !== 'lobby') {
          socket.emit('game:error', 'Game already in progress');
          return;
        }

        if (game.players.length >= 4) {
          socket.emit('game:error', 'Game is full');
          return;
        }

        const playerName = (data?.playerName || 'Player').trim().slice(0, 20) || 'Player';
        game = addPlayer(game, socket.id, playerName);
        games.set(ROOM_ID, game);

        socketRooms.set(socket.id, ROOM_ID);
        socket.join(ROOM_ID);

        io.to(ROOM_ID).emit('game:state_update', sanitizeState(game));
        io.to(ROOM_ID).emit('game:event', `${playerName} ist beigetreten`);
      } catch (err: any) {
        socket.emit('game:error', err.message || 'Failed to join game');
      }
    });

    socket.on('game:start', () => {
      try {
        let game = games.get(ROOM_ID);
        if (!game) {
          socket.emit('game:error', 'No game found');
          return;
        }

        // Only allow first player (host) to start
        if (game.players[0]?.id !== socket.id) {
          socket.emit('game:error', 'Only the host can start the game');
          return;
        }

        game = startGame(game);
        games.set(ROOM_ID, game);
        io.to(ROOM_ID).emit('game:state_update', sanitizeState(game));
        io.to(ROOM_ID).emit('game:event', 'Spiel gestartet!');
      } catch (err: any) {
        socket.emit('game:error', err.message || 'Failed to start game');
      }
    });

    // ── Admin reset ─────────────────────────────────────────────────────────
    socket.on('game:admin_reset', (data: { code: string }) => {
      if (data?.code !== '5500') {
        socket.emit('game:error', 'Falscher Code');
        return;
      }
      games.delete(ROOM_ID);
      socketRooms.forEach((room, sid) => { if (room === ROOM_ID) socketRooms.delete(sid); });
      io.to(ROOM_ID).emit('game:reset');
      console.log('[Server] Game reset by admin');
    });

    // ── Dice ────────────────────────────────────────────────────────────────
    socket.on('game:roll_dice', () => {
      handleAction(socket, io, (game) => handleRollDice(game, socket.id));
    });

    // ── Property buying ─────────────────────────────────────────────────────
    socket.on('game:buy_property', () => {
      handleAction(socket, io, (game) => handleBuyProperty(game, socket.id));
    });

    socket.on('game:decline_property', () => {
      handleAction(socket, io, (game) => handleDeclineProperty(game, socket.id));
    });

    // ── Auction ─────────────────────────────────────────────────────────────
    socket.on('game:auction_bid', (data: { amount: number }) => {
      handleAction(socket, io, (game) =>
        handleAuctionBid(game, socket.id, Number(data?.amount) || 0)
      );
    });

    socket.on('game:auction_pass', () => {
      handleAction(socket, io, (game) => handleAuctionPass(game, socket.id));
    });

    // ── Building ─────────────────────────────────────────────────────────────
    socket.on('game:build_house', (data: { tilePosition: number }) => {
      handleAction(socket, io, (game) =>
        handleBuildHouse(game, socket.id, Number(data?.tilePosition))
      );
    });

    socket.on('game:decline_build', () => {
      handleAction(socket, io, (game) => handleDeclineBuild(game, socket.id));
    });

    // ── Mortgage ────────────────────────────────────────────────────────────
    socket.on('game:mortgage_property', (data: { tilePosition: number }) => {
      handleAction(socket, io, (game) =>
        handleMortgageProperty(game, socket.id, Number(data?.tilePosition))
      );
    });

    socket.on('game:unmortgage_property', (data: { tilePosition: number }) => {
      handleAction(socket, io, (game) =>
        handleUnmortgageProperty(game, socket.id, Number(data?.tilePosition))
      );
    });

    // ── House selling ────────────────────────────────────────────────────────
    socket.on('game:sell_house', (data: { tilePosition: number }) => {
      handleAction(socket, io, (game) =>
        handleSellHouse(game, socket.id, Number(data?.tilePosition))
      );
    });

    // ── Trade ────────────────────────────────────────────────────────────────
    socket.on(
      'game:propose_trade',
      (data: {
        toPlayerId: string;
        offerMoney: number;
        offerProperties: number[];
        requestMoney: number;
        requestProperties: number[];
      }) => {
        handleAction(socket, io, (game) =>
          handleProposeTrade(
            game,
            socket.id,
            data.toPlayerId,
            Number(data.offerMoney) || 0,
            data.offerProperties || [],
            Number(data.requestMoney) || 0,
            data.requestProperties || []
          )
        );
      }
    );

    socket.on('game:accept_trade', (data: { tradeId: string }) => {
      handleAction(socket, io, (game) =>
        handleAcceptTrade(game, socket.id, data.tradeId)
      );
    });

    socket.on('game:reject_trade', (data: { tradeId: string }) => {
      handleAction(socket, io, (game) =>
        handleRejectTrade(game, socket.id, data.tradeId)
      );
    });

    // ── Jail ─────────────────────────────────────────────────────────────────
    socket.on('game:pay_jail_fee', () => {
      handleAction(socket, io, (game) => handlePayJailFee(game, socket.id));
    });

    socket.on('game:roll_for_jail', () => {
      // roll_for_jail is the same as roll_dice when in jail
      handleAction(socket, io, (game) => handleRollDice(game, socket.id));
    });

    // ── Confirm action (for mandatory payments) ──────────────────────────────
    socket.on('game:confirm_action', () => {
      handleAction(socket, io, (game) => handleConfirmAction(game, socket.id));
    });

    // ── End turn ─────────────────────────────────────────────────────────────
    socket.on('game:end_turn', () => {
      handleAction(socket, io, (game) => handleEndTurn(game, socket.id));
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      const roomId = socketRooms.get(socket.id);
      socketRooms.delete(socket.id);

      if (roomId) {
        const game = games.get(roomId);
        if (game && game.gamePhase === 'lobby') {
          // Remove from lobby if not started
          const updatedGame = {
            ...game,
            players: game.players.filter((p) => p.id !== socket.id),
          };
          games.set(roomId, updatedGame);
          io.to(roomId).emit('game:state_update', sanitizeState(updatedGame));
        }
      }
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function handleAction(
  socket: Socket,
  io: Server,
  action: (game: GameState) => GameState
): void {
  try {
    const roomId = socketRooms.get(socket.id);
    if (!roomId) {
      socket.emit('game:error', 'Not in a game room');
      return;
    }

    let game = games.get(roomId);
    if (!game) {
      socket.emit('game:error', 'Game not found');
      return;
    }

    game = action(game);
    games.set(roomId, game);

    // Broadcast updated state to all players in room
    io.to(roomId).emit('game:state_update', sanitizeState(game));

    // Emit recent log events
    if (game.eventLog.length > 0) {
      const lastEvent = game.eventLog[game.eventLog.length - 1];
      io.to(roomId).emit('game:event', lastEvent);
    }
  } catch (err: any) {
    console.error('[Socket] Action error:', err.message);
    socket.emit('game:error', err.message || 'Action failed');
  }
}

/**
 * Remove deck internals from state before sending to client
 * (we don't want clients to see the full deck order).
 */
function sanitizeState(state: GameState): GameState {
  return {
    ...state,
    // Don't expose deck contents, just the count
    chanceDeck: state.chanceDeck.map((c) => ({ ...c, id: c.id })),
    communityChestDeck: state.communityChestDeck.map((c) => ({ ...c, id: c.id })),
  };
}
