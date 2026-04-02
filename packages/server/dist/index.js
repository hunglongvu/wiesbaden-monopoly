"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const gameSocket_1 = require("./socket/gameSocket");
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://https://wiesbaden-monopoly-client.vercel.app';
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: CLIENT_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
exports.io = io;
(0, gameSocket_1.setupGameSocket)(io);
httpServer.listen(PORT, () => {
    console.log(`[Server] Wiesbaden Monopoly server running on port ${PORT}`);
    console.log(`[Server] Accepting connections from ${CLIENT_ORIGIN}`);
});
//# sourceMappingURL=index.js.map