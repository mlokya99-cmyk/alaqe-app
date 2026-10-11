import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initDatabase } from './db/index.js';
import { WebSocketHub } from './websocket/hub.js';
import { setHub } from './websocket/index.js';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import chatsRouter from './routes/chats.js';
import mediaRouter from './routes/media.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Port
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: '«ئالاقە» (Alaqe) ئارقا سەپ مۇلازىمېتىرى',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// API Routes
app.use('/v1/auth', authRouter);
app.use('/v1/users', usersRouter);
app.use('/v1/chats', chatsRouter);
app.use('/v1/media', mediaRouter);

// Initialize Database & seed data
initDatabase();

// Initialize WebSocket Hub
const wsHub = new WebSocketHub(server);
setHub(wsHub);

server.listen(PORT, () => {
  console.log(`
🚀 ========================================================
   «ئالاقە» (Alaqe) ئارقا سەپ مۇلازىمېتىرى قوزغالدى!
   - REST API:     http://localhost:${PORT}/v1
   - WebSocket:    ws://localhost:${PORT}/v1/ws
   - Health Check: http://localhost:${PORT}/health
   - Static Files: http://localhost:${PORT}/uploads
========================================================
  `);
});
