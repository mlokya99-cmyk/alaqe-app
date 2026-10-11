import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'alaqe.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrent throughput
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- ئىشلەتكۈچىلەر (Users table)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      phone_hash TEXT,
      username TEXT UNIQUE,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now'))
    );

    -- ئۈسكۈنىلەر (Devices table for multi-device support)
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform TEXT DEFAULT 'web',
      push_token TEXT,
      public_key TEXT,
      last_active TEXT DEFAULT (datetime('now'))
    );

    -- سۆھبەتلەر (Chats: dm, group, channel)
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'dm', 'group', 'channel'
      title TEXT,
      owner_id INTEGER REFERENCES users(id),
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- سۆھبەت ئەزالىرى (Chat members)
    CREATE TABLE IF NOT EXISTS chat_members (
      chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
      joined_at TEXT DEFAULT (datetime('now')),
      muted_until TEXT,
      PRIMARY KEY (chat_id, user_id)
    );

    -- ئالاقىداشلار (Contacts)
    CREATE TABLE IF NOT EXISTS contacts (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      synced_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, contact_id)
    );

    -- ئۇچۇرلار (Messages table)
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      msg_id TEXT UNIQUE NOT NULL,
      chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'file', 'voice', 'system'
      body TEXT,
      media_id INTEGER,
      media_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      voice_duration INTEGER,
      reply_to TEXT,
      status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read'
      created_at TEXT DEFAULT (datetime('now')),
      edited_at TEXT,
      deleted_for_all INTEGER DEFAULT 0
    );

    -- قوبۇل قىلىش ۋە ئوقۇلۇش بەلگىلىرى (Message receipts)
    CREATE TABLE IF NOT EXISTS message_receipts (
      chat_id INTEGER NOT NULL,
      msg_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      delivered_at TEXT,
      read_at TEXT,
      PRIMARY KEY (chat_id, msg_id, user_id)
    );

    -- OTP تىزىملىتىش كودلىرى (OTP codes table)
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- مېدىيا ھۆججەتلەر (Media files table)
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ئۈنۈملۈك كۆرسەتكۈچلەر (Indexes)
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, id DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  `);

  // Seed demo data if database is brand new
  seedDemoData();
}

function seedDemoData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  console.log('🌱 Seeding demo Uyghur accounts and community channels...');

  // Demo users
  const insertUser = db.prepare(`
    INSERT INTO users (phone, username, display_name, avatar_url, bio, last_seen)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  const u1 = insertUser.run('+998901234567', 'alisher', 'ئەلىشەر باھاۋۇدۇن', 'https://api.dicebear.com/7.x/bottts/svg?seed=alisher', 'دەستۇرلۇق پىروگراممېر، ئالاقە ئەپىگە خۇش كېلىپسىز!').lastInsertRowid;
  const u2 = insertUser.run('+905551234567', 'dilara', 'دىلارە ئابلىكىم', 'https://api.dicebear.com/7.x/bottts/svg?seed=dilara', 'لايىھەلىگۈچى (UI/UX) ۋە رەسسام').lastInsertRowid;
  const u3 = insertUser.run('+14155552671', 'bahram', 'بەھرام قەييۇم', 'https://api.dicebear.com/7.x/bottts/svg?seed=bahram', 'سۈنئىي ئەقىل ۋە يۇمشاق دېتال قۇرۇلۇشى').lastInsertRowid;
  const u4 = insertUser.run('+491512345678', 'alaqe_bot', 'ئالاقە رەسمىي ياردەمچىسى', 'https://api.dicebear.com/7.x/bottts/svg?seed=alaqe', '«ئالاقە» سۇپىسىنىڭ رەسمىي ئۇچۇر ۋە سىستېما بوتى').lastInsertRowid;

  // Contacts
  const insertContact = db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)');
  insertContact.run(u1, u2);
  insertContact.run(u2, u1);
  insertContact.run(u1, u3);
  insertContact.run(u3, u1);
  insertContact.run(u1, u4);

  // Group / Channel
  const insertChat = db.prepare(`
    INSERT INTO chats (type, title, owner_id, avatar_url)
    VALUES (?, ?, ?, ?)
  `);

  const c1 = insertChat.run('group', 'ئۇيغۇر تەتقىقاتچىلار ۋە ئېچىۋاتقانلار', u1, 'https://api.dicebear.com/7.x/identicon/svg?seed=techuyghur').lastInsertRowid;
  const c2 = insertChat.run('channel', 'ئالاقە يېڭىلىقلىرى (رەسمىي كانال)', u4, 'https://api.dicebear.com/7.x/identicon/svg?seed=alaqenews').lastInsertRowid;
  const c3 = insertChat.run('dm', 'دىلارە ئابلىكىم', u1, 'https://api.dicebear.com/7.x/bottts/svg?seed=dilara').lastInsertRowid;

  // Chat members
  const insertMember = db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)');
  insertMember.run(c1, u1, 'owner');
  insertMember.run(c1, u2, 'admin');
  insertMember.run(c1, u3, 'member');

  insertMember.run(c2, u4, 'owner');
  insertMember.run(c2, u1, 'member');
  insertMember.run(c2, u2, 'member');
  insertMember.run(c2, u3, 'member');

  insertMember.run(c3, u1, 'member');
  insertMember.run(c3, u2, 'member');

  // Messages
  const insertMsg = db.prepare(`
    INSERT INTO messages (msg_id, chat_id, sender_id, type, body, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertMsg.run('1000000000001', c1, u1, 'text', 'ئەسسالامۇ ئەلەيكۇم قېرىنداشلار! «ئالاقە» ئەپىنىڭ يېڭى بېتى پۈتۈنلەي ئۇيغۇرچە RTL ۋە دۇنيا ئۆلچىمىدە پۈتۈۋاتىدۇ.', 'read', '-30 minutes');
  insertMsg.run('1000000000002', c1, u2, 'text', 'ۋەئەلەيكۇم ئەسسالام! كۆرۈنۈشى تېلېگرامغا بەك ئوخشاپتۇ، خەت شەكلى بىلەن ئۇيغۇرچە يۆنىلىشى تولىمۇ راۋان ئىكەن.', 'read', '-25 minutes');
  insertMsg.run('1000000000003', c1, u3, 'text', 'مۇبارەك بولسۇن! ئاۋازلىق ئۇچۇر ۋە ھۆججەت يوللاش تېزلىكىنىمۇ سىناپ باقساق بولغۇدەك.', 'read', '-10 minutes');

  insertMsg.run('1000000000004', c2, u4, 'text', '📢 «ئالاقە» ئەپىگە قەدەم تەشرىپ قىلغىنىڭىزنى قارشى ئالىمىز! بۇ سۇپىدا سىز تېلېگرام ئۇسلۇبىدا ئەڭ تېز، بىخەتەر ۋە ئۆز ئانا تىلىمىزدا ئالاقە قىلالايسىز.', 'read', '-1 hour');

  insertMsg.run('1000000000005', c3, u2, 'text', 'سالام ئەلىشەر، كۆرۈنمە يۈزنىڭ قاراڭغۇ نۇسخىسى (Dark Mode) تامامەن تەييار بولدى، كۆرۈپ باقتىڭىزمۇ؟', 'read', '-5 minutes');

  console.log('✅ Demo seed completed successfully!');
}
