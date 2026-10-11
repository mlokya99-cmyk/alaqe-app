import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, AuthUser } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { generateSnowflakeId } from '../utils/snowflake.js';

interface ExtendedWebSocket extends WebSocket {
  user?: AuthUser;
  isAlive?: boolean;
}

export class WebSocketHub {
  private wss: WebSocketServer;
  private userSockets: Map<number, Set<ExtendedWebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/v1/ws' });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: ExtendedWebSocket, req) => {
      // 1. Authenticate WebSocket
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token') || req.headers['sec-websocket-protocol'];

      if (!token) {
        ws.close(4001, 'كىملىك تەلەپ قىلىنىدۇ (Token required)');
        return;
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
        ws.user = decoded;
        ws.isAlive = true;

        const userId = decoded.id;
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(ws);

        console.log(`🔌 User connected via WS: ${decoded.display_name} (ID: ${userId})`);

        // Update online status in database
        db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);

        // Broadcast presence
        this.broadcastPresence(userId, true);

        // Send connection ack
        ws.send(JSON.stringify({
          event: 'connected',
          data: {
            user_id: userId,
            server_time: new Date().toISOString()
          }
        }));

        // Handle incoming messages
        ws.on('message', (raw) => {
          try {
            const parsed = JSON.parse(raw.toString());
            this.handleMessage(ws, parsed);
          } catch (e) {
            console.error('Invalid WS frame received:', e);
          }
        });

        // Heartbeat
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Disconnect
        ws.on('close', () => {
          this.handleDisconnect(ws);
        });

        ws.on('error', (err) => {
          console.error(`WS Error for user ${userId}:`, err);
        });

      } catch (err) {
        ws.close(4002, 'كىملىك ئىناۋەتسىز (Invalid token)');
      }
    });

    // Periodic heartbeat check
    setInterval(() => {
      this.wss.clients.forEach((client) => {
        const extWs = client as ExtendedWebSocket;
        if (extWs.isAlive === false) {
          return extWs.terminate();
        }
        extWs.isAlive = false;
        extWs.ping();
      });
    }, 30000);
  }

  private handleDisconnect(ws: ExtendedWebSocket) {
    if (!ws.user) return;
    const userId = ws.user.id;
    const set = this.userSockets.get(userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        this.userSockets.delete(userId);
        const now = new Date().toISOString();
        db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
        console.log(`🚪 User disconnected (all sessions): ID ${userId}`);
        this.broadcastPresence(userId, false, now);
      }
    }
  }

  private handleMessage(ws: ExtendedWebSocket, msg: { event: string; data: any }) {
    if (!ws.user) return;
    const senderId = ws.user.id;

    switch (msg.event) {
      case 'ping':
        ws.send(JSON.stringify({ event: 'pong', data: { time: Date.now() } }));
        break;

      case 'typing': {
        const { chat_id, state } = msg.data;
        if (!chat_id) return;
        this.broadcastToChat(chat_id, 'typing', {
          chat_id,
          user_id: senderId,
          display_name: ws.user.display_name,
          state: state || 'typing'
        }, senderId);
        break;
      }

      case 'message.send': {
        const { chat_id, body, type = 'text', media_url, file_name, file_size, voice_duration, reply_to } = msg.data;
        if (!chat_id || (!body && !media_url)) return;

        // Verify user is member of chat
        const membership = db.prepare('SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat_id, senderId);
        if (!membership) {
          ws.send(JSON.stringify({ event: 'error', data: { message: 'بۇ سۆھبەتكە ئۇچۇر ئەۋەتىش ھوقۇقىڭىز يوق' } }));
          return;
        }

        const msgId = generateSnowflakeId();
        const createdAt = new Date().toISOString();

        // Save message to database
        db.prepare(`
          INSERT INTO messages (msg_id, chat_id, sender_id, type, body, media_url, file_name, file_size, voice_duration, reply_to, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?)
        `).run(msgId, chat_id, senderId, type, body || '', media_url || null, file_name || null, file_size || null, voice_duration || null, reply_to || null, createdAt);

        const sender = db.prepare('SELECT id, display_name, username, avatar_url FROM users WHERE id = ?').get(senderId);

        const newMsgPayload = {
          id: msgId,
          msg_id: msgId,
          chat_id,
          sender_id: senderId,
          sender,
          type,
          body: body || '',
          media_url: media_url || null,
          file_name: file_name || null,
          file_size: file_size || null,
          voice_duration: voice_duration || null,
          reply_to: reply_to || null,
          status: 'sent',
          created_at: createdAt
        };

        // Broadcast to all chat members
        this.broadcastToChat(chat_id, 'message.new', newMsgPayload);

        // Acknowledge back to sender
        ws.send(JSON.stringify({
          event: 'message.sent_ack',
          data: {
            temp_id: msg.data.temp_id,
            msg_id: msgId,
            chat_id,
            created_at: createdAt
          }
        }));
        break;
      }

      case 'message.read': {
        const { chat_id, up_to_msg_id } = msg.data;
        if (!chat_id) return;

        // Mark as read in DB
        db.prepare(`
          UPDATE messages 
          SET status = 'read' 
          WHERE chat_id = ? AND sender_id != ? AND status != 'read'
        `).run(chat_id, senderId);

        this.broadcastToChat(chat_id, 'message.read', {
          chat_id,
          user_id: senderId,
          up_to_msg_id
        }, senderId);
        break;
      }
    }
  }

  public isUserOnline(userId: number): boolean {
    const sockets = this.userSockets.get(userId);
    return !!(sockets && sockets.size > 0);
  }

  public broadcastPresence(userId: number, online: boolean, lastSeen?: string) {
    const payload = {
      event: 'presence.update',
      data: {
        user_id: userId,
        online,
        last_seen: lastSeen || new Date().toISOString()
      }
    };
    const jsonStr = JSON.stringify(payload);

    // Broadcast to all active users
    this.userSockets.forEach((sockets) => {
      sockets.forEach((s) => {
        if (s.readyState === WebSocket.OPEN) {
          s.send(jsonStr);
        }
      });
    });
  }

  public broadcastToChat(chatId: number, event: string, data: any, excludeUserId?: number) {
    const members = db.prepare('SELECT user_id FROM chat_members WHERE chat_id = ?').all(chatId) as { user_id: number }[];
    const jsonStr = JSON.stringify({ event, data });

    members.forEach(({ user_id }) => {
      if (excludeUserId && user_id === excludeUserId) return;
      const sockets = this.userSockets.get(user_id);
      if (sockets) {
        sockets.forEach((s) => {
          if (s.readyState === WebSocket.OPEN) {
            s.send(jsonStr);
          }
        });
      }
    });
  }

  public broadcastToUser(userId: number, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      const jsonStr = JSON.stringify({ event, data });
      sockets.forEach((s) => {
        if (s.readyState === WebSocket.OPEN) {
          s.send(jsonStr);
        }
      });
    }
  }
}
