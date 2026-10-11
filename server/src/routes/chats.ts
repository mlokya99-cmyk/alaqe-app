import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getHub } from '../websocket/index.js';
import { generateSnowflakeId } from '../utils/snowflake.js';

const router = Router();

// 1. Get all chats for current user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const hub = getHub();

  // Find all chats user is member of
  const memberChats = db.prepare(`
    SELECT c.id, c.type, c.title, c.owner_id, c.avatar_url, c.created_at, cm.role
    FROM chats c
    JOIN chat_members cm ON cm.chat_id = c.id
    WHERE cm.user_id = ?
  `).all(userId) as any[];

  const detailedChats = memberChats.map((chat) => {
    let title = chat.title;
    let avatar_url = chat.avatar_url;
    let is_online = false;
    let other_user = null;

    if (chat.type === 'dm') {
      // Find the other member in the DM
      const otherMember = db.prepare(`
        SELECT u.id, u.display_name, u.username, u.avatar_url, u.last_seen
        FROM chat_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.chat_id = ? AND cm.user_id != ?
      `).get(chat.id, userId) as any;

      if (otherMember) {
        title = otherMember.display_name;
        avatar_url = otherMember.avatar_url;
        is_online = hub ? hub.isUserOnline(otherMember.id) : false;
        other_user = {
          ...otherMember,
          is_online
        };
      }
    } else {
      // For groups or channels, count members
      const memberCount = db.prepare('SELECT COUNT(*) as count FROM chat_members WHERE chat_id = ?').get(chat.id) as { count: number };
      chat.member_count = memberCount.count;
    }

    // Get latest message
    const latestMessage = db.prepare(`
      SELECT msg_id, sender_id, type, body, media_url, file_name, voice_duration, status, created_at
      FROM messages
      WHERE chat_id = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(chat.id) as any;

    // Get unread count
    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE chat_id = ? AND sender_id != ? AND status != 'read'
    `).get(chat.id, userId) as { count: number };

    return {
      id: chat.id,
      type: chat.type,
      title: title || 'سۆھبەت',
      avatar_url: avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + chat.id,
      owner_id: chat.owner_id,
      role: chat.role,
      is_online,
      other_user,
      member_count: chat.member_count,
      latest_message: latestMessage || null,
      unread_count: unreadCount.count,
      last_activity: latestMessage ? latestMessage.created_at : chat.created_at
    };
  });

  // Sort by latest message/activity timestamp DESC
  detailedChats.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

  res.json({ success: true, chats: detailedChats });
});

// 2. Create new chat (DM or Group or Channel)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { type = 'dm', target_user_id, title, member_ids = [] } = req.body;

  if (type === 'dm') {
    if (!target_user_id) {
      res.status(400).json({ error: 'قارشى تەرەپ ئىشلەتكۈچى كىملىكى تەلەپ قىلىنىدۇ' });
      return;
    }

    // Check if DM chat already exists
    const existingChat = db.prepare(`
      SELECT c.id
      FROM chats c
      JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = ?
      JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = ?
      WHERE c.type = 'dm'
      LIMIT 1
    `).get(userId, target_user_id) as { id: number } | undefined;

    if (existingChat) {
      res.json({ success: true, chat_id: existingChat.id, is_existing: true });
      return;
    }

    // Create new DM
    const targetUser = db.prepare('SELECT display_name FROM users WHERE id = ?').get(target_user_id) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'ئىشلەتكۈچى تېپىلمىدى' });
      return;
    }

    const newChat = db.prepare(`
      INSERT INTO chats (type, title, owner_id)
      VALUES ('dm', ?, ?)
    `).run(targetUser.display_name, userId);

    const chatId = newChat.lastInsertRowid;
    db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatId, userId, 'member');
    db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatId, target_user_id, 'member');

    // Also auto-add to contacts
    db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)').run(userId, target_user_id);
    db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)').run(target_user_id, userId);

    res.json({ success: true, chat_id: chatId, is_existing: false });
    return;
  }

  // Create Group or Channel
  if (!title || title.trim().length === 0) {
    res.status(400).json({ error: 'گۇرۇپپا ياكى كانال نامى تەلەپ قىلىنىدۇ' });
    return;
  }

  const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(title.trim())}`;
  const newChat = db.prepare(`
    INSERT INTO chats (type, title, owner_id, avatar_url)
    VALUES (?, ?, ?, ?)
  `).run(type, title.trim(), userId, avatar);

  const chatId = newChat.lastInsertRowid;
  db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatId, userId, 'owner');

  // Add members
  if (Array.isArray(member_ids)) {
    const insertMember = db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)');
    for (const memId of member_ids) {
      if (memId !== userId) {
        insertMember.run(chatId, memId, 'member');
      }
    }
  }

  res.json({ success: true, chat_id: chatId });
});

// 3. Get chat details and members
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const chatId = parseInt(req.params.id as string, 10);

  const membership = db.prepare('SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
  if (!membership) {
    res.status(403).json({ error: 'سىز بۇ سۆھبەتنىڭ ئەزاسى ئەمەس' });
    return;
  }

  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;
  if (!chat) {
    res.status(404).json({ error: 'سۆھبەت تېپىلمىدى' });
    return;
  }

  const members = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.last_seen, cm.role, cm.joined_at
    FROM chat_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.chat_id = ?
    ORDER BY cm.role DESC, u.display_name ASC
  `).all(chatId);

  const hub = getHub();
  const membersWithOnline = members.map((m: any) => ({
    ...m,
    is_online: hub ? hub.isUserOnline(m.id) : false
  }));

  res.json({ success: true, chat: { ...chat, members: membersWithOnline } });
});

// 4. Get messages for chat (Paginated)
router.get('/:id/messages', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const chatId = parseInt(req.params.id as string, 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

  const membership = db.prepare('SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
  if (!membership) {
    res.status(403).json({ error: 'سىز بۇ سۆھبەتنىڭ ئەزاسى ئەمەس' });
    return;
  }

  // Fetch messages with sender info
  const messages = db.prepare(`
    SELECT m.id, m.msg_id, m.chat_id, m.sender_id, m.type, m.body, m.media_url, 
           m.file_name, m.file_size, m.voice_duration, m.reply_to, m.status, 
           m.created_at, m.edited_at,
           u.display_name as sender_display_name, u.username as sender_username, u.avatar_url as sender_avatar_url
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ? AND m.deleted_for_all = 0
    ORDER BY m.id DESC
    LIMIT ?
  `).all(chatId, limit) as any[];

  // Reverse so client gets chronological order (oldest to newest)
  messages.reverse();

  // Map to structured sender object
  const formatted = messages.map((m) => ({
    id: m.msg_id,
    msg_id: m.msg_id,
    chat_id: m.chat_id,
    sender_id: m.sender_id,
    sender: {
      id: m.sender_id,
      display_name: m.sender_display_name,
      username: m.sender_username,
      avatar_url: m.sender_avatar_url
    },
    type: m.type,
    body: m.body,
    media_url: m.media_url,
    file_name: m.file_name,
    file_size: m.file_size,
    voice_duration: m.voice_duration,
    reply_to: m.reply_to,
    status: m.status,
    created_at: m.created_at,
    edited_at: m.edited_at
  }));

  res.json({ success: true, messages: formatted });
});

// 5. Send message via REST (fallback)
router.post('/:id/messages', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const senderId = req.user!.id;
  const chatId = parseInt(req.params.id as string, 10);
  const { body, type = 'text', media_url, file_name, file_size, voice_duration, reply_to } = req.body;

  const membership = db.prepare('SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, senderId);
  if (!membership) {
    res.status(403).json({ error: 'بۇ سۆھبەتكە ئۇچۇر ئەۋەتىش ھوقۇقىڭىز يوق' });
    return;
  }

  const msgId = generateSnowflakeId();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO messages (msg_id, chat_id, sender_id, type, body, media_url, file_name, file_size, voice_duration, reply_to, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?)
  `).run(msgId, chatId, senderId, type, body || '', media_url || null, file_name || null, file_size || null, voice_duration || null, reply_to || null, createdAt);

  const sender = db.prepare('SELECT id, display_name, username, avatar_url FROM users WHERE id = ?').get(senderId);

  const newMsg = {
    id: msgId,
    msg_id: msgId,
    chat_id: chatId,
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

  // Broadcast via WebSocket Hub
  const hub = getHub();
  if (hub) {
    hub.broadcastToChat(chatId, 'message.new', newMsg);
  }

  res.json({ success: true, message: newMsg });
});

// 6. Mark messages in chat as read
router.post('/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const chatId = parseInt(req.params.id as string, 10);
  const { up_to_msg_id } = req.body;

  db.prepare(`
    UPDATE messages
    SET status = 'read'
    WHERE chat_id = ? AND sender_id != ? AND status != 'read'
  `).run(chatId, userId);

  const hub = getHub();
  if (hub) {
    hub.broadcastToChat(chatId, 'message.read', {
      chat_id: chatId,
      user_id: userId,
      up_to_msg_id
    }, userId);
  }

  res.json({ success: true });
});

// 7. Delete message
router.delete('/messages/:msg_id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const msgId = req.params.msg_id as string;

  const msg = db.prepare('SELECT * FROM messages WHERE msg_id = ?').get(msgId) as any;
  if (!msg) {
    res.status(404).json({ error: 'ئۇچۇر تېپىلمىدى' });
    return;
  }

  if (msg.sender_id !== userId) {
    res.status(403).json({ error: 'بۇ ئۇچۇرنى ئۆچۈرۈش ھوقۇقىڭىز يوق' });
    return;
  }

  db.prepare('UPDATE messages SET deleted_for_all = 1 WHERE msg_id = ?').run(msgId);

  const hub = getHub();
  if (hub) {
    hub.broadcastToChat(msg.chat_id, 'message.deleted', {
      chat_id: msg.chat_id,
      msg_id: msgId
    });
  }

  res.json({ success: true, message: 'ئۇچۇر ئۆچۈرۈلدى' });
});

export default router;
