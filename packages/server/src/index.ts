import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupGameSocket } from './socket/gameSocket';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupGameSocket(io);

httpServer.listen(PORT, () => {
  console.log(`[Server] Wiesbaden Monopoly server running on port ${PORT}`);
  console.log(`[Server] Accepting connections from ${CLIENT_ORIGIN}`);
});

export { app, io };
