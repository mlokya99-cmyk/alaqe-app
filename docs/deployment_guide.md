# «ئالاقە» ئەپىنى GitHub, Supabase, Vercel ۋە Cloudflare غا چىقىرىش تولۇق قوللانمىسى

بۇ ھۆججەتتە مەھسۇلاتنى تەرتىپ بويىچە دۇنياۋى، ھەقسىز ۋە ئىشەنچلىك سۇپىلارغا تارقىتىش باسقۇچلىرى بېرىلدى.

---

## 1-قەدەم: GitHub غا كودنى چىقىرىش

1. **GitHub دا يېڭى ئامبار (Repository) قۇرۇش:**
   - [github.com/new](https://github.com/new) گە كىرىپ، ئامبار نامىنى `alaqe-app` دەپ قويۇڭ (Public ياكى Private تاللاڭ).
2. **يەرلىكتىكى كودنى يوللاش (Push):**
   ```bash
   git branch -M main
   git remote add origin https://github.com/سىزنىڭ-نامىڭىز/alaqe-app.git
   git push -u origin main
   ```

---

## 2-قەدەم: Supabase تەڭشەش (مەلۇمات ئامبىرى + Realtime + مېدىيا ساقلاش)

1. [supabase.com](https://supabase.com) گە كىرىپ ھەقسىز يېڭى تۈر (New Project) قۇرۇڭ.
2. سول تەرەپتىكى **SQL Editor** گە كىرىڭ.
3. تۈردىكى [`supabase_schema.sql`](file:///e:/OneDrive/Desktop/%D8%A6%D8%A7%D9%84%D8%A7%D9%82%DB%95%20%D8%A6%DB%95%D9%BE/supabase_schema.sql) نىڭ پۈتۈن مەزمۇنىنى كۆچۈرۈپ چاپلاڭ ۋە **"Run"** نى بېسىڭ.
   - بارلىق جەدۋەللەر (users, chats, messages)، Realtime ئۇقتۇرۇشى ۋە سىناق ھېساباتلار ئۆزلۈكىدىن قۇرۇلىدۇ.
4. **Project Settings -> API** قىسمىغا بېرىپ، تۆۋەندىكى ئىككى قىممەتنى كۆچۈرۈۋېلىڭ:
   - **Project URL** (مەسىلەن: `https://xyzcompany.supabase.co`)
   - **anon public key** (API ئاچقۇچى)

---

## 3-قەدەم: Vercel غا ئالدى سەپنى چىقىرىش (Frontend Deployment)

1. [vercel.com](https://vercel.com) گە كىرىپ، GitHub ھېساباتىڭىز بىلەن كىرىڭ.
2. **"Add New Project"** نى بېسىپ، GitHub تىكى `alaqe-app` نى تاللاڭ.
3. **Environment Variables** بۆلىكىگە يۇقىرىدا Supabase تىن ئالغان ئىككى قىممەتنى تولدۇرۇڭ:
   - `VITE_SUPABASE_URL` = `https://xyzcompany.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOi...`
4. **"Deploy"** نى بېسىڭ.
   - 1 مىنۇت ئىچىدە ئەپ تورغا چىقىدۇ ۋە سىزگە دۇنياۋى ئۇلىنىش ئادرېسى (مەسىلەن: `https://alaqe-app.vercel.app`) بېرىدۇ.
   - ئەپ ھەر قېتىم GitHub غا يېڭى كود كىرگۈزگەندە ئۆزلۈكىدىن يېڭىلىنىپ تۇرىدۇ (CI/CD).

---

## 4-قەدەم: Cloudflare غا باغلاش (ئۆز تور نامىڭىز + بىخەتەرلىك + تېزلىتىش)

1. [cloudflare.com](https://cloudflare.com) دا ئۆز تور نامىڭىزنى (مەسىلەن: `alaqe.im`) قوشۇڭ.
2. **DNS بۆلىكىگە CNAME قوشۇش:**
   - Type: `CNAME`
   - Name: `@` (ياكى `chat`)
   - Target: `cname.vercel-dns.com`
   - Proxy status: **Proxied (سېرىق بۇلۇت بەلگىسى يانسۇن)**
3. **SSL/TLS تەڭشىكى:**
   - Encryption Mode نى **Full (Strict)** غا تەڭشەڭ.
   - "Always Use HTTPS" نى ئېچىپ قويۇڭ.
4. مۇبارەك بولسۇن! ئەمدى پۈتۈن دۇنيادىكى ئىشلەتكۈچىلەر بىۋاسىتە `https://alaqe.im` ئارقىلىق ئەڭ تېز، Cloudflare CDN قوغدىشى ۋە Supabase Realtime ئاستىدا تېلېگرامدەك سۆزلىشەلەيدۇ!
