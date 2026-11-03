# LifeFlow Deployment Guide (Neon + GitHub + Netlify + Render)

Structure:
- **Neon** = database (PostgreSQL)
- **Render** = backend (FastAPI). Netlify par Python backend nahi chalta, is liye backend Render par jata hai.
- **Netlify** = frontend (React PWA) -> yehi link users ko dena hai
- **GitHub** = code

## Step 1: Neon database
1. https://neon.tech par sign up -> **Create project** (name: lifeflow).
2. Dashboard > **Connect** > **Connection string** copy karein. Aisi hogi:
   `postgresql://user:password@ep-xxxx.aws.neon.tech/neondb?sslmode=require`
3. Tables khud ban jayengi, kuch manually nahi karna.

## Step 2: GitHub par upload
```bash
cd LifeFlow_Project
git init
git add .
git commit -m "LifeFlow v15"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lifeflow.git
git push -u origin main
```
(Pehle github.com par empty repo `lifeflow` bana lein, README/gitignore add na karein.)
`.env` files `.gitignore` mein hain, is liye secrets upload nahi hongi.

## Step 3: Backend Render par
1. https://render.com > **New > Web Service** > GitHub repo select karein.
2. Root Directory: `backend`, Runtime: **Docker**, Plan: Free.
3. **Environment variables**:
   | Key | Value |
   |---|---|
   | LIFEFLOW_DATABASE_URL | Neon connection string |
   | LIFEFLOW_SECRET_KEY | koi lambi random string |
   | LIFEFLOW_ADMIN_PASSWORD | apna strong admin password |
   | LIFEFLOW_ENV | production |
   | LIFEFLOW_BACKUP | off |
   | GROQ_API_KEY | AI ke liye (optional) |
4. Health Check Path: `/health`. Deploy ke baad URL milega, jaise `https://lifeflow-api.onrender.com`.
5. Browser mein us URL ko kholen: `{"message":"The LifeFlow backend is running."}` aana chahiye.

Note: Free Render 15 minute idle ke baad sleep ho jata hai, pehli request 30-60 second leti hai. Hourly background jobs (reminders, weekly report) sleep mein nahi chalengi. Paid plan ($7/mo) ya UptimeRobot se /health ping karwa lein.

## Step 4: Frontend Netlify par
1. https://app.netlify.com > **Add new site > Import from Git** > same repo.
2. `netlify.toml` khud settings le lega (base `frontend`, build `npm run build`, publish `dist`).
3. **Site configuration > Environment variables**: `VITE_API_URL` = Render ka URL (no trailing slash).
4. Deploy karein. Link milega: `https://xxxx.netlify.app` (Site name Domain settings mein badal sakte hain).
5. VITE_API_URL baad mein badlen to **Deploys > Trigger deploy > Clear cache and deploy** karein.

## Install (PWA) kaise kaam karega
Netlify HTTPS deta hai, aur app mein manifest + service worker + "Install LifeFlow" banner pehle se hai:
- **Android Chrome / PC Chrome / Edge**: link kholen -> Install banner ya address bar ka install icon.
- **iPhone Safari**: Share > Add to Home Screen.
Install ke baad app apni icon ke sath, bina browser bar ke khulti hai.

## Pehla login
Admin: `admin@lifeflow.com` + jo password aap ne `LIFEFLOW_ADMIN_PASSWORD` mein rakha.

## Agar masla aaye
- Login par "Network error": VITE_API_URL ghalat hai ya Netlify par dobara deploy nahi kiya.
- Render logs mein `could not connect`: Neon string mein `sslmode=require` check karein.
- Pehli request slow: Render free plan sleep se jag raha hai.
