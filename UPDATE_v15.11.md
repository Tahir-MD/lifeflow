# LifeFlow v15.12: what is new and how to put it live

## Put it live (about 5 minutes)
1. Copy these files over your local LifeFlow folder (replace when asked), then in the folder:
   `git add . && git commit -m "v15.12" && git push`
2. Render (backend) and Netlify (frontend) rebuild by themselves after the push.
3. New database columns are added automatically at start-up (`utils/migrate.py`). Nothing to run on Neon.
4. Netlify installs `leaflet` from package.json by itself (needed for the map).

## What changed
| # | Feature | Where |
|---|---------|-------|
| 1 | Automated tests | `backend/tests/` ; run `pip install -r requirements-dev.txt` then `pytest -q` in `backend/` |
| 1 | Staging site | see "Staging" below |
| 2 | Map and live donor location (OpenStreetMap, free, no key) | `MapView.jsx`, `LiveDonorMap.jsx`, `/tracking/{id}/live-location` |
| 3 | Admin settings from environment | `LIFEFLOW_ADMIN_EMAIL`, `LIFEFLOW_ADMIN_PASSWORD`, `LIFEFLOW_ADMIN_RESET_PASSWORD` (see below) |
| 4 | Doctor sign-off on donor clearance (name + registration no.) | Admin > Review & safety. Real hospital-system integration needs an agreement with each hospital: not possible in code alone. |
| 5 | Cancel request + status (Pending, Donor Accepted, Donation in Progress, Partially Fulfilled, Completed, Cancelled) | `POST /requests/{id}/cancel`, `RequestStatusBar.jsx` |
| 6 | Android / iPhone | PWA install works now (see below). Play Store / App Store need your developer accounts; see `ANDROID.md`. |
| 7 | Shortage analytics by city and blood type, with camp suggestion | Admin > Records > Shortage analytics |
| 8 | Admin removes any user; hospital removes its own staff | `DELETE /admin/users/{role}/{id}`, `DELETE /staff/{id}`. Removal keeps old records but wipes personal data and blocks login. |
| 9 | Mobile layout | safe-area spacing, 44px touch targets, no zoom on inputs, no sideways scroll at 390px |

## Admin password and reset (item 3)
Set in Render > Environment:
- `LIFEFLOW_ADMIN_EMAIL` and `LIFEFLOW_ADMIN_PASSWORD`: used when the admin is first created.
- Forgot the password? Set `LIFEFLOW_ADMIN_RESET_PASSWORD` to a new value, redeploy, log in, then **delete that variable**.
Change the default `Admin@123` before real use.

## Staging site (item 1)
1. Git: `git checkout -b staging` and push it.
2. Netlify: Site settings > Build & deploy > Branches > enable branch deploys for `staging` (gives its own URL).
3. Render: New Web Service from the same repo, branch `staging`, its own Neon database branch, and set `LIFEFLOW_DATABASE_URL` to that staging database.
4. Test there first, then merge `staging` into `main`.

## Install on phones (item 6)
- Android (Chrome): open the Netlify link > menu > Install app.
- iPhone (Safari): Share > Add to Home Screen.

## v15.12
Footer: "Engineered by Tahir Mahmood", LinkedIn, GitHub and WhatsApp logos, phone and both emails. Only `frontend/src/components/SiteFooter.jsx`, `frontend/src/index.css`, `frontend/src/appInfo.js` and `frontend/src/i18n/v15Translations.js` changed.
