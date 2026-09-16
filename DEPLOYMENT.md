# 🚀 DEPLOYMENT GUIDE (Bangla te)

**Goal:** API ek jaygay (Vercel/Railway) + Website ar ek jaygay (Vercel) — duita alada alada live, ar website api ta use korbe.

```
User er browser ──► Website (Vercel: :3000 hisebe)
                          │
                          │ (server-side, same project er /api/* route)
                          ▼
                 MOVIEBOX_API_URL env variable
                          │
                          ▼
              API (Vercel ba Railway e live)
                          │
                          ▼
                 Upstream MovieBox CDN
```

**Keno ei system e kaj hobe?** Browser direct api te call kore NA — browser shudhu website er apnar `/api/*` route e call kore (same domain). Tarpor website er server (Vercel) api te call kore. Tai **CORS er kono problem hobe na**, ar api URL change korleo code change lagbe NA — shudhu ekta env variable.

---

## Step 0 — API e live koro (choose one)

### Option A — Railway (recommended, Python er jonno sob chhotobhalo)
1. Railway.app e GitHub theke login (free tier ache).
2. **New Project → Deploy from GitHub repo** → `moviebox-api` repo select koro.
3. Railway auto-detect kore (repo te `railway.json` ache) — kichu korar dorkar nai.
4. Deploy hoye gele ekta URL pabi: `https://xxxx.up.railway.app`
5. Check: browser e `https://xxxx.up.railway.app/home` dile JSON ashe = **API live** ✅

### Option B — Render (ei option-o free, Railway er moto-i sohoj)
1. Render.com e GitHub login.
2. **New → Web Service** → `moviebox-api` repo.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy → URL pabi (`https://xxxx.onrender.com`) → `/home` e test koro.

### Option C — Vercel (tumi Vercel chaile)
Repo te `vercel.json` already ache, tai Vercel e-o deploy hobe:
1. vercel.com e GitHub login.
2. **Add New → Project** → `moviebox-api` repo.
3. Framework preset: **Other** (Python auto-detect).
4. Deploy → URL pabi (`https://moviebox-api.vercel.app`) → `/home` e test koro.

> ⚠️ **Honest note (Vercel er jonno):** Vercel free plan e serverless function er time limit ache (cold start e o thake). MovieBox API er `/home` endpoint ekbar warm-up e 10-20 second nite pare — tai Vercel e kichu endpoint slow/timeout dite pare. **Jodi Vercel e kore na, Railway/Render e niye nao — seta Python er jonno 100% solid.** Duita e free.

**Deploy er por API URL ta copy kore rakh:**
```
API_URL = https://xxxx.up.railway.app      (ba vercel/app URL)
```

---

## Step 1 — Website Vercel e live koro

1. `streambox` folder GitHub e push koro (ekta repo).
2. vercel.com → **Add New → Project** → oita repo select.
3. Vercel auto-detect korbe: **Framework: Next.js**, Build: `npm run build`, Output: `.next` — sob default thak.
4. **Environment Variables** section e ekta variable add koro:
   - Name: `MOVIEBOX_API_URL`
   - Value: tomi Step 0 e pawa API URL (example: `https://xxxx.up.railway.app`)
   - (Production + Preview dujone add koro)
5. **Deploy** → 1-2 minute por website live: `https://streambox.vercel.app`

**Website code e KICHU change lagbe NA.** Code already eita kore:
```ts
const API_URL = process.env.MOVIEBOX_API_URL || "http://127.0.0.1:8000";
```
— ar Vercel e `MOVIEBOX_API_URL` thakle sei URL use korbe.

---

## Step 2 — Local e (VSCode) cholano — jemon age chole

```
Terminal 1:  cd moviebox-api && pip install -r requirements.txt
             uvicorn main:app --host 0.0.0.0 --port 8000
Terminal 2:  cd streambox && npm install && cp .env.local.example .env.local
             npm run dev     →  http://localhost:3000
```
Local e `.env.local` er moddhe `MOVIEBOX_API_URL=http://127.0.0.1:8000` ache (default) — local api chalse code change kore na.

---

## Step 3 — Verify (3 ta check)

1. Browser e website khulo → hero + rows asche? ✅
2. Movies/Anime page e scroll kore content asche? ✅
3. Kono title er trailer play hoy (Vercel live site theke o trailer play hote pare)? ✅

Video stream er bishoy: full video play hote hole user er browser e domain ta CDN er "hotlink protection" e pass korte hobe — residential (normal) browser e generally play hoy. Jodi na hoy, admin e nijer video (direct MP4 URL) add korle ta **100% play hobe** (karon seta tomi nijer host e rakho).

---

## Shortcut — ki ki file kothay

| Kaaj | File |
|---|---|
| Website (Vercel) | `streambox/` puro folder |
| API (Railway/Vercel) | `moviebox-api/` puro folder |
| Website e API URL | Vercel dashboard → Environment Variables → `MOVIEBOX_API_URL` |
| Local config | `streambox/.env.local` (`.env.local.example` copy kore) |
