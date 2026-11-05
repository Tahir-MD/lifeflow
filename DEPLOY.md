# LifeFlow - put it online (Neon + GitHub + Render + Netlify)

Netlify can only host the website (React). The backend (FastAPI) runs on Render (free). The database is Neon.

## 1. Neon (database)
1. neon.tech -> sign up -> Create project (name: lifeflow).
2. Copy the **Connection string** (looks like `postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require`). Keep it secret.

## 2. GitHub
```
cd LifeFlow_Project
git init
git add .
git commit -m "LifeFlow"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/lifeflow.git
git push -u origin main
```
(Create the empty repo `lifeflow` on github.com first. `.env` and `*.db` are NOT uploaded.)

## 3. Render (backend)
1. render.com -> New -> **Blueprint** -> choose your GitHub repo (it reads `render.yaml`).
2. Fill the secrets: `LIFEFLOW_DATABASE_URL` = the Neon string, `GROQ_API_KEY` = your NEW Groq key.
3. Deploy. You get an address like `https://lifeflow-backend.onrender.com`. Open `/docs` to check it works.
   (Free Render sleeps after 15 minutes; the first open takes ~30 seconds.)

## 4. Netlify (website)
1. app.netlify.com -> Add new site -> Import from GitHub -> same repo.
2. Base directory: `frontend`. (Build command and publish folder come from `netlify.toml`.)
3. Site settings -> Environment variables -> `VITE_API_URL` = your Render address (no slash at the end).
4. Deploy. Open the Netlify link.

## 5. Install on laptop or phone
Open the Netlify link in Chrome/Edge: use the install icon in the address bar (laptop) or the **Install app / Add to Home screen** option (phone). The app also shows its own install banner.

## First admin
The first admin is created automatically (see "The admin account" in README.md). Log in with it on the Login page, change the password at once, then verify hospitals and donors from the Admin dashboard.
