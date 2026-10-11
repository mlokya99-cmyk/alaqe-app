import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { normalizeUyghurText } from '../utils/uyghur.js';

const router = Router();

// Current user profile
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const user = db.prepare('SELECT id, phone, username, display_name, avatar_url, bio, created_at, last_seen FROM users WHERE id = ?').get(userId);
  if (!user) {
    res.status(404).json({ error: 'ئىشلەتكۈچى تېپىلمىدى' });
    return;
  }
  res.json({ success: true, user });
});

// Update profile
router.put('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { display_name, bio, avatar_url, username } = req.body;

  if (username) {
    const cleanUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(cleanUsername, userId);
    if (existing) {
      res.status(400).json({ error: 'بۇ ئىشلەتكۈچى نامى ئاللىقاچان ئىشلىتىلىپ بولغان (Username already taken)' });
      return;
    }
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(cleanUsername, userId);
  }

  if (display_name) {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(display_name.trim(), userId);
  }

  if (bio !== undefined) {
    db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio.trim(), userId);
  }

  if (avatar_url) {
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatar_url.trim(), userId);
  }

  const updatedUser = db.prepare('SELECT id, phone, username, display_name, avatar_url, bio, created_at, last_seen FROM users WHERE id = ?').get(userId);
  res.json({ success: true, user: updatedUser });
});

// Search users with Uyghur normalization
router.get('/search', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    res.json({ success: true, users: [] });
    return;
  }

  const queryText = q.trim();
  const normalizedQuery = normalizeUyghurText(queryText).toLowerCase();

  // Fetch all users except current
  const currentUserId = req.user!.id;
  const allUsers = db.prepare(`
    SELECT id, phone, username, display_name, avatar_url, bio, last_seen
    FROM users
    WHERE id != ?
    LIMIT 100
  `).all(currentUserId) as any[];

  // Filter with fuzzy / normalized comparison
  const matched = allUsers.filter(u => {
    const uName = (u.username || '').toLowerCase();
    const dName = normalizeUyghurText(u.display_name || '').toLowerCase();
    const phone = u.phone || '';

    return (
      uName.includes(normalizedQuery) ||
      dName.includes(normalizedQuery) ||
      phone.includes(queryText)
    );
  });

  res.json({ success: true, users: matched.slice(0, 20) });
});

// Contacts list
router.get('/contacts/list', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const contacts = db.prepare(`
    SELECT u.id, u.phone, u.username, u.display_name, u.avatar_url, u.bio, u.last_seen
    FROM contacts c
    JOIN users u ON u.id = c.contact_id
    WHERE c.user_id = ?
    ORDER BY u.display_name ASC
  `).all(userId);

  res.json({ success: true, contacts });
});

// Add contact
router.post('/contacts/add', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { contact_id } = req.body;

  if (!contact_id || contact_id === userId) {
    res.status(400).json({ error: 'ئىناۋەتسىز ئالاقىداش كىملىكى' });
    return;
  }

  db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)').run(userId, contact_id);
  res.json({ success: true, message: 'ئالاقىداش قوشۇلدى' });
});

// Get user by ID
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id as string, 10);
  const user = db.prepare('SELECT id, phone, username, display_name, avatar_url, bio, created_at, last_seen FROM users WHERE id = ?').get(id);

  if (!user) {
    res.status(404).json({ error: 'ئىشلەتكۈچى تېپىلمىدى' });
    return;
  }

  res.json({ success: true, user });
});

export default router;
