# LifeFlow

LifeFlow connects blood donors with hospitals and with individual
patients who need blood directly. This project has two parts: a
backend that handles data and matching, and a frontend that people
use in the browser.

## Running the backend

1. Open a terminal and go into the backend folder.
   cd backend

2. Create a virtual environment and turn it on.
   python -m venv venv
   On Windows: venv\Scripts\activate
   On Mac or Linux: source venv/bin/activate

3. Install the required packages.
   pip install -r requirements.txt

4. Start the server.
   uvicorn app.main:app --reload

5. The backend is now running at
   http://127.0.0.1:8000

   You can view the automatic documentation and try every route at
   http://127.0.0.1:8000/docs

A file named lifeflow.db will be created automatically the first time
you run it. This is the database, and it needs no separate setup.

## Running the frontend

1. Open a second terminal and go into the frontend folder.
   cd frontend

2. Install the required packages.
   npm install

3. Start the development server.
   npm run dev

4. Open the address shown in the terminal, usually
   http://127.0.0.1:5173

The frontend expects the backend to be running at
http://127.0.0.1:8000

If you started the backend on a different port, open
frontend/src/services/api.js and change the BASE_URL value to match.

## The three kinds of accounts

Donor, a person who can give blood. Signs up with a blood type,
phone number, and location.

Patient, called a receiver in the code, a person who needs blood
directly for themselves or a family member, without going through a
hospital. Signs up with a phone number, CNIC number, and address, so
a donor can see exactly who they would be helping.

Hospital, a licensed institution. Signs up with a license number and
phone number.

## The admin account

There is also one built-in Admin account, used to see every donor,
hospital, and patient's full history in one place -- every request
(open, closed, or still waiting), every completed donation, and
every message/request notification ever sent, across all of them.

It is created automatically the first time the backend starts, with:

    email:    admin@lifeflow.com
    password: Admin@123

Log in at /admin/login on the frontend. Change
DEFAULT_ADMIN_PASSWORD in backend/app/main.py (or seed a different
one) before putting this online for real.

## Pop-up requests and full history

Every donor, hospital, and patient sees a notification bell in the
top bar, and a live pop-up appears the moment a new request or
message comes in, without needing to refresh. All of this -- and
every donation and request -- is saved permanently in the database
per account, so it is never lost: logging out and back in, even the
next day, shows exactly the same history, and it never mixes
between different users signed in on the same device.

## Hospital staff and shifts

A hospital can create a login for each staff member from its
dashboard ("Staff & shifts" tab), assigning them to one of four
fixed shifts: Shift 1, Shift 2, Shift 3, Shift 4. The hospital hands
that email and password to whoever is coming on duty.

Each staff member logs in separately, at /staff/login, and records
every donor or patient they attend to during their shift (name,
blood type, phone number, where they came from, and notes). This
builds up that staff member's own shift record, completely separate
from every other staff member's -- so at the end of their duty they
can review exactly how many donors and patients they saw, and print
or save it as a PDF (see below). The hospital can see the combined
record from every staff member and shift together, and the admin can
see every hospital's staff and every one of their shift records too.

## Saving and printing any history as a PDF

Every history view across the site -- a donor's donations, a
hospital's or patient's requests, a staff member's shift record, and
every admin view -- has a "Print / Save as PDF" button. It opens the
browser's normal print dialog; choosing "Save as PDF" there saves
that exact record as a PDF file, or it can be sent straight to a
printer. No extra software is needed.

## Trying it out

1. Open the frontend in the browser.
2. Sign up as a donor with a blood type, phone number, and location.
3. Sign up as a patient, or as a hospital, whichever you want to try.
4. Log in as the patient or hospital and create a request, choosing
   how many bags are needed and how soon, either an emergency, a
   number of days, or a number of months.
5. You will see the list of matching donors, ranked by distance,
   each with a phone number.
6. Log in as the donor and see the open request, showing the
   requester's name, phone number, and, for a patient request, their
   CNIC number and address.
7. Choose how many bags you can give and accept. If the request
   needed more bags than you gave, it stays open for another donor
   to cover the rest. Once every bag is covered, the request closes
   and disappears from the open list.

## Project layout

backend, the Python server built with FastAPI. Handles sign up,
login, requests, and the matching logic for all three account types.

frontend, the React website. Lets donors, patients, and hospitals
sign up, log in, create requests, and see matches.

## What is included in this version

Sign up and login for donors, patients, and hospitals, with secure
passwords and login tokens. Emergency and scheduled blood requests,
in bags, with an urgency timeframe. Matching by blood type
compatibility, distance, and eligibility, with contact numbers shown
on both sides. A request can be filled by more than one donor if
no single donor covers every bag needed. Points for donors based on
how many bags they give.

On top of that original core, this version adds:

- **Full donation history on every dashboard.** A donor sees every
  bag they gave and exactly who received it (hospital or patient,
  with phone number, and CNIC and address for a patient). A hospital
  or patient sees every donation they received, with the donor's
  full name, blood type, phone number, and the date and time.
- **In-app notifications.** Every account has a notification bell.
  Donors are notified the moment a compatible request opens nearby;
  hospitals and patients are notified the moment a donor accepts;
  everyone is notified about new donation camps. This stands in for
  the SMS/email/push alerts a production deployment would send
  through a provider such as Twilio or SendGrid.
- **Two-way ratings.** After a donation, the requester can rate the
  donor and the donor can rate the requester, building a visible
  reputation for both sides.
- **Donor badges, points, and a public leaderboard.** Donors earn a
  tier (Bronze through Platinum Lifesaver) based on total donations,
  and can see their community rank.
- **Hospital blood bank inventory.** Hospitals track how many bags of
  each blood type they currently hold, with a low stock warning.
- **Donation camps / blood drives.** Hospitals can organize and
  publish a camp; donors are notified and can register; hospitals see
  the full list of registered donors with contact details.
- **Per-role stats dashboards.** Donors see total donations, bags
  given, estimated lives impacted, and next eligible donation date.
  Hospitals and patients see total, open, and fulfilled requests and
  total bags received.

## What is not included yet

Real SMS/email delivery (Twilio, SendGrid, or similar), push
notifications to a mobile app, offline mode, shortage prediction,
permanent tamper proof records, multi-language support, and a formal
admin/verification panel for licensing hospitals and confirming
donor eligibility with a medical provider. A production deployment
would also replace SQLite with PostgreSQL and add Alembic migrations
before the schema changes in this version, since `Base.metadata.create_all`
only creates tables that do not exist yet - if you already have a
`lifeflow.db` from an earlier version, delete it before running this
one so the new tables and columns are created fresh.

## AI setup (Groq)

```
cd backend
export GROQ_API_KEY="gsk_..."      # free key: https://console.groq.com/keys
pip install -r requirements.txt
rm -f lifeflow.db                   # only if upgrading from an older version (new columns/tables)
uvicorn app.main:app --reload
```

Default admin: `admin@lifeflow.com` / `Admin@123` — you are forced to change it on first login.
For PostgreSQL: set `LIFEFLOW_DATABASE_URL`, then `alembic upgrade head`.
See `backend/.env.example` for all optional settings (SMS, email, push).

## Newest features (voice intake, explainable matching, sentiment flagging, re-engagement, camp suggestions, donor ID card, 2FA, reporting export)

No new pip packages are required for any of this -- 2FA uses a small stdlib-only TOTP
implementation (`backend/app/utils/totp.py`), and everything else reuses the existing
Groq/`requests` setup.

- **Voice request intake**: a 🎤 button next to the AI "describe your need" box on the
  Hospital and Patient dashboards, using Groq's hosted Whisper model.
- **"Why this donor?"**: every ranked donor match now includes a short, explainable
  reason line (distance, rating, donation history, reliability) built from the same
  numbers behind the ranking -- not a separate AI call per donor.
- **Sentiment analysis on ratings**: a rating comment is classified positive/neutral/negative
  when submitted (AI if configured, keyword fallback otherwise); negative ones are flagged
  and surfaced to admins under Admin → "Verification, audit & AI" → Flagged ratings.
- **Donor re-engagement**: same admin tab lists overdue/never-donated donors for blood
  types currently running short, drafts a personalized AI message per donor, and sends
  it through every configured channel (in-app, SMS, email, push) after you review it.
- **AI camp-location suggestions**: same tab, clusters recent request demand on a simple
  grid and suggests where to plan the next donation camp.
- **Digital donor card**: Donor dashboard → Stats tab. Blood type, donation count, and a
  scannable QR code; printable/saveable as PDF with the existing print button.
- **Two-factor authentication**: Hospital dashboard → AI tools tab, and Admin →
  governance tab. TOTP-based (Google Authenticator, Authy, etc.); once turned on, login
  requires a second 6-digit-code step.
- **Reporting export**: Admin governance tab -- a by-blood-type summary, viewable on
  screen or downloaded as CSV, for handing to a health authority.


## Languages and easy forms

The language chooser (English, اردو, سنڌي, Español, Français) changes every page: forms,
hints, error messages, dashboards and tab names. Sign-up, login and password pages also show
big language buttons at the top. The "Listen" button in the top bar reads the page aloud for
people who cannot read well (it uses the voices installed in the browser; if the browser has
no Sindhi voice it uses Urdu).

Translations live in frontend/src/i18n/formTranslations.js. To add or fix a line, change the
text next to the English sentence. Any sentence without a translation is shown in English.

After changing anything in frontend, run `npm install` once and then `npm run dev`
(or `npm run build`). The old dist folder was removed because it was out of date.


## New in this version (v2.2)

Run `pip install -r requirements.txt` again in `backend` (new: openpyxl, reportlab).
The database upgrades itself on start, so you do not have to delete lifeflow.db.

| Feature | Where to find it |
|---|---|
| Health questionnaire before donor sign-up (age, weight, illness, medicines, tattoo, surgery, pregnancy...). A person who cannot donate cannot register, and is told when to come back. The server checks it again. | Donor sign-up |
| Phone OTP: a 6-digit code by SMS or WhatsApp must be entered before a donor, patient or hospital can sign up | All three sign-up pages |
| SMS and WhatsApp alerts (donors choose which) | Donor dashboard, top card |
| Emergency SOS button (blood type + bags only, reaches donors within 100 km and the nearest hospitals) | Patient and hospital dashboards |
| Live request tracking (created, stock checked, donors alerted, accepted, on the way, arrived, received) | "Track live" under each request. Donors tap "I am on the way / I have arrived" |
| Blood expiry tracking (batches, oldest used first, hourly warning and automatic removal of expired bags) | Hospital > Blood expiry dates |
| Fake request detection (explainable score; risky requests are held for the admin) | Admin > Request review |
| Donation reminders (men 90 days, women 120 days) | Automatic, hourly, plus a button in Admin > Request review |
| Digital certificates with a QR code that anyone can check at /verify/CODE | Donor > My certificates |
| Health tips before and after donating | Donor > Health tips |
| Bulk messages to donors by blood group and area (app, SMS or WhatsApp; limits apply) | Hospital and Admin > Message donors |
| Hospital-to-hospital blood transfer requests | Hospital > Hospital transfers |
| Excel and PDF downloads | Admin top bar, Hospital > My requests, Donor > My certificates |

### Settings (backend/.env)

* `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` turn on real SMS.
* `TWILIO_WHATSAPP_FROM` (for example `whatsapp:+14155238886`) turns on WhatsApp.
* Without Twilio the OTP code is printed in the backend window and shown on the sign-up page, so you can test everything.
* Set `LIFEFLOW_ENV=production` before going live: codes are then never shown on screen.
* `LIFEFLOW_BACKGROUND_JOBS=off` stops the hourly expiry and reminder jobs.

The health questionnaire is a screening only. A doctor at the blood bank always decides on the day.


## New in this version (v2.3)

| Feature | Where to find it |
|---|---|
| **Email codes** (Gmail/SMTP or SendGrid) as a way to verify sign-up, no SMS needed | All sign-up pages: "Send by email" |
| **WhatsApp Cloud API** (Meta) instead of Twilio | Sign-up codes, alerts, bulk messages |
| **Android phone as an SMS gateway**, or any SMS company's web API | Sign-up codes, alerts, bulk messages |
| **Ambulance and emergency directory** (public page, no login) | Top bar: "Emergency numbers". Admin: "Emergency directory". Hospital: "Ambulance & contacts" |
| **Staff roles**: receptionist, lab technician, doctor, manager, each with different permissions | Hospital > Staff & shifts. Staff dashboard shows only the tabs the role may use |
| **Dark mode and large-text mode** (remembered on the device) | Top bar: moon/sun button and A / A+ / A++ button |
| **Invite friends**: personal link, WhatsApp share, bonus points after the friend's first donation | Donor > Invite friends |
| **Camp QR check-in**: scan the donor card QR, walk-ins added, printable and downloadable attendance | Hospital > Donation camps, and Staff > Camp check-in |

### Which staff role can do what

| | Log visitors | Camp check-in | Blood stock & expiry | Donor screening |
|---|---|---|---|---|
| Receptionist | yes | yes | no | no |
| Lab technician | yes | yes | yes | no |
| Doctor | yes | yes | no | yes |
| Manager | yes | yes | yes | yes |

Older staff accounts become "receptionist" (what they could always do).

### Setting up the sending methods (all go in backend/.env, see .env.example)

**1. Email (easiest and free).** In your Google account turn on 2-step verification, open
myaccount.google.com/apppasswords, create an app password, then set `SMTP_HOST=smtp.gmail.com`,
`SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD` (the 16 letters), `SMTP_FROM`. Restart the backend.
The sign-up page now offers "Send by email".

**2. WhatsApp Cloud API (Meta, no Twilio).** Go to developers.facebook.com, create an app of type
Business, add the WhatsApp product. Copy the temporary access token and the *Phone number ID* into
`WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. For testing, add up to 5 recipient numbers on the API
setup page. WhatsApp only allows a business to start a chat with an approved *template*: create an
**Authentication** template (for example `otp_code`) in WhatsApp Manager, wait for approval, and set
`WHATSAPP_OTP_TEMPLATE`. Temporary tokens expire in about a day; for real use create a permanent
token through a System User.

**3. SMS from your own Android phone.** Install an open-source SMS-gateway app on a phone with a SIM
(for example "SMS Gateway for Android"), start its local server, and put the address it shows into
`SMS_GATEWAY_URL`. `SMS_GATEWAY_AUTH` is the username and password the app shows. `SMS_GATEWAY_BODY` is
the JSON the app expects, where `{to}` becomes the phone number and `{message}` the text. **Different
apps and versions use different addresses and field names, so copy the exact URL and example body from
the app's own screen or documentation.** The same three settings work for any Pakistani SMS company's
web API. If a company wants GET with a query string, set `SMS_GATEWAY_METHOD=GET` and write the
query fields in `SMS_GATEWAY_BODY`. The phone and the server must be able to reach each other (same
Wi-Fi, or a tunnel). Phone SIMs have daily sending limits: this is fine for tests and small pilots.

Without any of these, the code is printed in the backend window and shown on the sign-up page.
The sign-up page only offers the methods that are really set up on the server.

### Notes
* The emergency directory starts with well-known national numbers (1122, 115, 1020, 1021, 15, 16, 130,
  1098). Coverage differs by city, so the admin should check them and add local numbers.
* Camp check-in camera scanning needs a browser with `BarcodeDetector` (Chrome or Edge on Android and
  computers). Other browsers can type the Donor ID shown on the donor card.
* Large-text mode scales the whole page. Very old browsers may ignore it.


## Version 5.0 (top bar and footer)

* **Top bar in one line.** *Log in* is one drop-down with Donor, Patient, Hospital, Staff and Admin.
  *Contact* is a drop-down with "Contact us" and "Emergency numbers". The Listen button is now just
  a speaker icon, and the language, dark-mode and text-size buttons are small.
* **Footer on every page:** "Engineered by: Tahir Mahmood", the copyright line, the version (v5.0)
  and clickable icons: LinkedIn, GitHub and Streamlit open in a new tab, the envelope opens the
  email app, and the WhatsApp icon opens a chat.
* To change the version or the developer's links, edit one file: `frontend/src/appInfo.js`.

## Version 6.0 (AI features)

Every AI feature only **suggests**. A person always checks and confirms. Photos and voice recordings are read in memory and are never saved. Features that need AI (voice, slip scanner, AI-written report text) use the same `GROQ_API_KEY` as before. Without a key the app still works: reports are written from the numbers, and the ETA, camp, donor-response and health-chat answers use plain formulas.

* **Automatic weekly report** (admin: Verification, audit & AI tab; hospital: AI tools tab). A report is written every week by the hourly background job for the admin and for every hospital, and the owner gets a notification. Download as Excel or PDF, print, or listen to it. Press "Make this week's report now" for an instant one.
* **Ambulance and ETA suggestions** (hospital and patient: "My requests", and hospital AI tools). For one request: fastest source of blood (hospital stock or nearest donor), estimated road time, a Google Maps link, and ambulance and blood-bank numbers from the emergency directory for that city.
* **Camp turnout and staffing predictor** (hospital: Donation camps). Expected donors, bags, beds, and staff by role, from registrations, past show-up rate and nearby eligible donors.
* **Donor response prediction** (hospital: "My requests" and AI tools). Each matching donor gets a chance of saying yes and a speed guess, with the reasons. New alerts now go out in this order, so likely responders are reached first. Nobody is left out.
* **Urdu / Sindhi voice assistant** (patient and hospital new-request page; donor "Voice & health chat" tab). Speak or type; it understands blood requests and fills the form for you to check, and reads the answer back. Sindhi speech recognition is weaker than Urdu, so always check the details. If the browser has no Sindhi voice, the answer is read in Urdu.
* **Doctor slip scanner** (patient and hospital new-request page). Take a photo of a prescription or blood requisition. AI suggests blood group, bags, patient details; warnings show when something was unclear.
* **Conversational health check** (donor sign-up, and donor "Voice & health chat" tab). One question at a time, by tapping, typing or speaking, in English, Urdu or Sindhi. It fills the same health form and the same server rules decide the result.

Optional setting: `LIFEFLOW_UTC_OFFSET_HOURS` (default 5, Pakistan) is used for the time-of-day part of donor response prediction.

## New in v9 — installable app, Android, backups, full Urdu/Sindhi

### 1. Installable app (PWA) with offline use and push
* Open the site in Chrome/Edge (Android, desktop) and tap **Install**; on iPhone use Share → *Add to Home Screen* (the app shows these steps).
* Works offline for pages already opened; an offline page shows emergency numbers. A "new version" banner appears after updates.
* **Set the backend address** before `npm run build`: copy `frontend/.env.example` to `.env.production` and set `VITE_API_URL`.
* Push: run `python backend/scripts/generate-vapid-keys.py`, set the printed `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIM_EMAIL` on the server. The "Enable alerts" button then appears after login.
* PWAs need **https** (localhost is fine for testing).

### 2. Android app
Capacitor project files, build scripts and Firebase push are included. Follow **frontend/ANDROID.md**
(`frontend/scripts/build-android.sh` or `.bat`, then Android Studio). Server side: `FCM_SERVICE_ACCOUNT_FILE=...` (`pip install google-auth`).

### 3. Automatic database backups
* Runs inside the server's background job (default every 24 h, newest 14 kept, gzip-compressed; SQLite uses its safe online backup, PostgreSQL uses `pg_dump` or a JSON export).
* Admin dashboard → **Backups** tab: see, back up now, download.
* Settings: `LIFEFLOW_BACKUP_DIR` (default `./backups`), `LIFEFLOW_BACKUP_KEEP`, `LIFEFLOW_BACKUP_EVERY_HOURS`, `LIFEFLOW_BACKUP=off`.
* Restore (stop the server first): `python backend/scripts/restore_backup.py backups/<file>.sqlite.gz`
* Also copy backups off the server (another machine / cloud storage).

### 4. Urdu and Sindhi
Every screen text now has Urdu and Sindhi (audit: 0 missing). New sentences are in `frontend/src/i18n/v9Translations.js`; please have a native Sindhi speaker proofread.

### Not tested
This package was prepared without npm/pip access: the front-end was not built and the server not started (static checks, Python compile and a backup-logic test only). The `android/` folder is generated on your computer. If anything fails, send me the error text.

## New in v15 (merged with the v14 features)

- One login page for donors, patients, hospitals, staff and admins (old per-role login links redirect to /login). Sign up opens a chooser to the three register forms.
- Hospitals see stock requests, accept or reject them and choose how many bags to give. Nothing is taken automatically.
- A donation counts only after the hospital confirms it. Unconfirmed promises are cancelled after 48 hours.
- Staff roles, shifts with start and end time, shift-change requests, attendance (check in / check out) and a monthly staff report.
- Lab tests, My profile, security-question password reset, hospital ratings, hospital verification by admin, registered people page, feedback pop-up.
- The assistant chatbot shows for every user and greets them by name.
- Urdu and Sindhi texts for all of the above (Sindhi should be proofread by a native speaker).

How to run: same as before (backend with uvicorn, frontend with npm install and npm run dev). New database columns are added automatically, so the old lifeflow.db can stay. Press Ctrl+Shift+R after updating.

Not tested: this version was checked with static checks only and was not run end to end. Please test the main flows once.

## v15.1 (clean, simple version)

- Simple light theme, one top bar, icons on every tab, robot assistant with a "Hello" bubble.
- Leaderboard, donor and hospital star ratings, health tips, "hospitals near me", maps and "use my current location" are removed.
- Only one app rating pop up, shown once after every login (admin sees the answers).
- One Create new account page (/signup) with Donor / Patient / Hospital tabs. The link is on the Login page only.
- Location is typed by hand: country, province, city / town, area or village. The server finds the position itself; if the internet lookup fails it uses a built-in offline guess, so matching still works.
- Dashboards: repeated tabs were merged (for example hospital: Staff & attendance, Blood stock & expiry; donor: My donations & certificates).
- Still not run end to end: please test the main flows once.

## v15.3

- Fixed: the donor dashboard went blank when an open request existed.
- Admin now sees bags that hospitals gave from their stock (All donations tab) and, on every request, how many bags came from stock and from donors.
- Admin and hospital pages are grouped: a few big groups on top and the pages of the group underneath.
- Location: Pakistan has a province list and a city list (or "Other" to type the city); other countries use typed fields. Area or village is optional.
- Phone numbers are formatted while typing, following the chosen country.

## v15.5 changes
- One sign-up page with a single "I am signing up as" dropdown (Donor / Patient / Hospital).
- Phone, CNIC and email are collected for every account; no second account may use the same email, phone or CNIC.
- A person can be both donor and patient: nav button "I also want to donate" / "I also need blood" / "Switch to ...".
- A donor can give at most 3 bags. For a patient's request the donor says Yes (with bags) or No; the patient accepts or says no thanks; afterwards the patient confirms "received" or "not received". Hospital requests still use hospital confirmation.
- Admin button next to Log in (same login page for everyone).
- Request forms clear after submit; each notification pops up only once.
