import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { signToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// 1. Send OTP verification code
router.post('/send_code', (req: Request, res: Response): void => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
    res.status(400).json({ error: 'تېلېفون نومۇرىنى توغرا كىرگۈزۈڭ (Invalid phone number)' });
    return;
  }

  const cleanPhone = phone.trim();
  // Generate 6 digit code (or fixed 123456 for predictable easy local testing)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(cleanPhone);
  db.prepare('INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)').run(cleanPhone, code, expiresAt);

  console.log(`📱 SMS OTP Code sent to ${cleanPhone}: [${code}]`);

  res.json({
    success: true,
    message: 'تەستىقلاش كودى مۇۋەپپەقىيەتلىك ئەۋەتىلدى',
    phone: cleanPhone,
    dev_code: code // Convenience for instant testing
  });
});

// 2. Verify OTP code and Login / Register
router.post('/verify_code', (req: Request, res: Response): void => {
  const { phone, code, display_name, username } = req.body;

  if (!phone || !code) {
    res.status(400).json({ error: 'تېلېفون نومۇرى ۋە تەستىق كودى كەم بولسا بولمايدۇ' });
    return;
  }

  const cleanPhone = phone.trim();
  const cleanCode = code.toString().trim();

  // Validate OTP code (allow master test code 123456 as well)
  const otpRecord = db.prepare('SELECT * FROM otp_codes WHERE phone = ? AND code = ?').get(cleanPhone, cleanCode) as { expires_at: string } | undefined;

  const isMasterCode = cleanCode === '123456';
  if (!otpRecord && !isMasterCode) {
    res.status(400).json({ error: 'تەستىقلاش كودى خاتا ياكى ۋاقتى ئۆتكەن' });
    return;
  }

  // Clean OTP once verified
  db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(cleanPhone);

  // Check if user already exists
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone) as any;

  if (!user) {
    // Register new user
    const finalName = display_name?.trim() || `ئىشلەتكۈچى ${cleanPhone.slice(-4)}`;
    const finalUsername = username?.trim().toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${finalUsername}`;
    const phoneHash = crypto.createHash('sha256').update(cleanPhone).digest('hex');

    const result = db.prepare(`
      INSERT INTO users (phone, phone_hash, username, display_name, avatar_url, bio, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(cleanPhone, phoneHash, finalUsername, finalName, avatar, 'سالام! مەن «ئالاقە» ئەپىنى ئىشلىتىۋاتىمەن.');

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
  } else {
    // Update last_seen
    db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(user.id);
  }

  const token = signToken(user);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      created_at: user.created_at,
      last_seen: user.last_seen
    }
  });
});

// 3. Quick demo login (switch directly between demo accounts)
router.post('/quick_login', (req: Request, res: Response): void => {
  const { user_id, username } = req.body;

  let user: any;
  if (user_id) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  } else if (username) {
    user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  } else {
    // Default to first user
    user = db.prepare('SELECT * FROM users ORDER BY id ASC LIMIT 1').get();
  }

  if (!user) {
    res.status(404).json({ error: 'ئىشلەتكۈچى تېپىلمىدى' });
    return;
  }

  db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(user.id);
  const token = signToken(user);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      created_at: user.created_at,
      last_seen: user.last_seen
    }
  });
});

// 4. Get demo users list for easy switching in UI
router.get('/demo_users', (_req: Request, res: Response): void => {
  const users = db.prepare('SELECT id, phone, username, display_name, avatar_url, bio FROM users LIMIT 10').all();
  res.json({ success: true, users });
});

export default router;
