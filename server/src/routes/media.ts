import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit as specified in MVP
});

const router = Router();

// Upload media file (image, voice recording, doc)
router.post('/upload', authMiddleware, upload.single('file'), (req: AuthenticatedRequest, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'ھۆججەت تەلەپ قىلىنىدۇ' });
    return;
  }

  const userId = req.user!.id;
  const file = req.file;

  // Insert to media table
  const insert = db.prepare(`
    INSERT INTO media (user_id, file_name, mime_type, file_size, file_path)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, file.originalname, file.mimetype, file.size, file.filename);

  const mediaUrl = `/uploads/${file.filename}`;

  res.json({
    success: true,
    media: {
      id: insert.lastInsertRowid,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      url: mediaUrl
    }
  });
});

export default router;
