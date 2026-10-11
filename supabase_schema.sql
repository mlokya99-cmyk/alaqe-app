-- ========================================================
-- «ئالاقە» (Alaqe) — Supabase PostgreSQL تولۇق سىستېما كودى
-- بۇ كودنى Supabase نىڭ SQL Editor قىسمىغا چاپلاپ "Run" نى بېسىڭ
-- ========================================================

-- 1. ئىشلەتكۈچىلەر جەدۋىلى (Users Table)
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  phone_hash TEXT,
  username TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- 2. سۆھبەتلەر جەدۋىلى (Chats Table)
CREATE TABLE IF NOT EXISTS public.chats (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'dm', -- 'dm', 'group', 'channel'
  title TEXT,
  owner_id BIGINT REFERENCES public.users(id),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. سۆھبەت ئەزالىرى (Chat Members Table)
CREATE TABLE IF NOT EXISTS public.chat_members (
  chat_id BIGINT REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  muted_until TIMESTAMPTZ,
  PRIMARY KEY (chat_id, user_id)
);

-- 4. ئۇچۇرلار جەدۋىلى (Messages Table)
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  msg_id TEXT UNIQUE NOT NULL,
  chat_id BIGINT REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES public.users(id),
  type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'file', 'voice', 'system'
  body TEXT,
  media_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  voice_duration INT,
  reply_to TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read'
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_for_all INT DEFAULT 0
);

-- 5. ئالاقىداشلار (Contacts Table)
CREATE TABLE IF NOT EXISTS public.contacts (
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, contact_id)
);

-- 6. OTP تىزىملىتىش كودلىرى (OTP codes)
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- كۆرسەتكۈچلەر (Indexes for maximum speed)
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- ========================================================
-- 7. Supabase Realtime نى قوزغىتىش (ھەقىقىي ۋاقىتلىق ئۇچۇر ئۈچۈن)
-- ========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- ========================================================
-- 8. Row Level Security (RLS) سەپلىمىسى
-- ========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- ئاممىۋى ئوقۇش/يېزىشقا رۇخسەت بېرىش سىياسىتى (MVP ئۈچۈن)
CREATE POLICY "Users public read/write" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Chats public read/write" ON public.chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Members public read/write" ON public.chat_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Messages public read/write" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Contacts public read/write" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- 9. مېدىيا ساقلاش بۆلۈمى (Storage Bucket for photos & voice)
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Media public bucket read/write"
ON storage.objects FOR ALL
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

-- ========================================================
-- 10. دەسلەپكى ئۇيغۇر ھېساباتلىرىنى قوشۇش (Initial Seed Data)
-- ========================================================
INSERT INTO public.users (id, phone, username, display_name, avatar_url, bio)
VALUES
  (1, '+998901234567', 'alisher', 'ئەلىشەر باھاۋۇدۇن', 'https://api.dicebear.com/7.x/bottts/svg?seed=alisher', 'دەستۇرلۇق پىروگراممېر، ئالاقە ئەپىگە خۇش كېلىپسىز!'),
  (2, '+905551234567', 'dilara', 'دىلارە ئابلىكىم', 'https://api.dicebear.com/7.x/bottts/svg?seed=dilara', 'لايىھەلىگۈچى (UI/UX) ۋە رەسسام'),
  (3, '+14155552671', 'bahram', 'بەھرام قەييۇم', 'https://api.dicebear.com/7.x/bottts/svg?seed=bahram', 'سۈنئىي ئەقىل ۋە يۇمشاق دېتال قۇرۇلۇشى'),
  (4, '+491512345678', 'alaqe_bot', 'ئالاقە رەسمىي ياردەمچىسى', 'https://api.dicebear.com/7.x/bottts/svg?seed=alaqe', '«ئالاقە» سۇپىسىنىڭ رەسمىي ئۇچۇر ۋە سىستېما بوتى')
ON CONFLICT (id) DO NOTHING;

-- سۆھبەتلەر
INSERT INTO public.chats (id, type, title, owner_id, avatar_url)
VALUES
  (1, 'group', 'ئۇيغۇر تەتقىقاتچىلار ۋە ئېچىۋاتقانلار', 1, 'https://api.dicebear.com/7.x/identicon/svg?seed=techuyghur'),
  (2, 'channel', 'ئالاقە يېڭىلىقلىرى (رەسمىي كانال)', 4, 'https://api.dicebear.com/7.x/identicon/svg?seed=alaqenews'),
  (3, 'dm', 'دىلارە ئابلىكىم', 1, 'https://api.dicebear.com/7.x/bottts/svg?seed=dilara')
ON CONFLICT (id) DO NOTHING;

-- ئەزالار
INSERT INTO public.chat_members (chat_id, user_id, role)
VALUES
  (1, 1, 'owner'), (1, 2, 'admin'), (1, 3, 'member'),
  (2, 4, 'owner'), (2, 1, 'member'), (2, 2, 'member'), (2, 3, 'member'),
  (3, 1, 'member'), (3, 2, 'member')
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- ئۇچۇرلار
INSERT INTO public.messages (msg_id, chat_id, sender_id, type, body, status)
VALUES
  ('1000000000001', 1, 1, 'text', 'ئەسسالامۇ ئەلەيكۇم قېرىنداشلار! «ئالاقە» ئەپىنىڭ يېڭى بېتى پۈتۈنلەي ئۇيغۇرچە RTL ۋە دۇنيا ئۆلچىمىدە پۈتۈۋاتىدۇ.', 'read'),
  ('1000000000002', 1, 2, 'text', 'ۋەئەلەيكۇم ئەسسالام! كۆرۈنۈشى تېلېگرامغا بەك ئوخشاپتۇ، خەت شەكلى بىلەن ئۇيغۇرچە يۆنىلىشى تولىمۇ راۋان ئىكەن.', 'read'),
  ('1000000000004', 2, 4, 'text', '📢 «ئالاقە» ئەپىگە قەدەم تەشرىپ قىلغىنىڭىزنى قارشى ئالىمىز! بۇ سۇپىدا سىز تېلېگرام ئۇسلۇبىدا ئەڭ تېز، بىخەتەر ۋە ئۆز ئانا تىلىمىزدا ئالاقە قىلالايسىز.', 'read')
ON CONFLICT (msg_id) DO NOTHING;
