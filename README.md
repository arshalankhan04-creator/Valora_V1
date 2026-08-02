# Valora — AI-Powered Vehicle Trust & Valuation Marketplace

A used-car marketplace where every listing is scored by four ML systems
before a buyer sees it: fair-price prediction, fraud/anomaly detection,
CNN-based condition assessment, and a combined Trust Score. See
[docs/Valora_Final_Spec_APIs.md](docs/Valora_Final_Spec_APIs.md) for the full spec and
[docs/Valora_Team_Workflow.md](docs/Valora_Team_Workflow.md) §8 for the Node↔Django API
contract (originally written for a 2-person team; built solo end-to-end).

## Structure

```
client/          React (Vite) + Tailwind CSS + React Router + Axios
server/          Node/Express + MongoDB/Mongoose — auth, listings, chat, ML client
ml-service/      Django + DRF — price prediction, fraud detection, CNN condition, trust score
docs/            Shared documentation
```

## Requirements

- Node.js 20+
- **Python 3.13** for `ml-service` — TensorFlow does not yet publish wheels
  for 3.13's successor, so the venv must be created with `py -3.13`, not
  whatever `python` resolves to by default. See `ml-service/.python-version`.
- MongoDB running locally (or a connection string in `server/.env`)

## Local setup

### client
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

### server
```bash
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, SMTP_*
npm run dev
```

### ml-service
```bash
cd ml-service
py -3.13 -m venv venv
source venv/Scripts/activate   # venv\Scripts\activate on cmd/PowerShell
pip install -r requirements.txt
cp .env.example .env            # JWT_SECRET must match server/.env exactly
python manage.py migrate
python manage.py runserver 8000
```

Each ML app (`price_prediction`, `fraud_detection`, `condition_assessment`)
ships with real preprocessing/train/inference code. An untrained app's
endpoint returns HTTP 503 with a clear message rather than a fake result.

### Training data

Raw/third-party datasets are **not committed** (unclear Kaggle redistribution
license) — only the scripts that build training data from them are. To
retrain from scratch:

| App | Source | Steps |
|---|---|---|
| `fraud_detection` | Synthetic (spec explicitly allows this — no real "labeled scam" dataset exists) | `python -m fraud_detection.generate_synthetic_data` then `python -m fraud_detection.train` |
| `price_prediction` | [CarDekho Used Car Dataset](https://www.kaggle.com/datasets/manishkr1754/cardekho-used-car-data) (Kaggle) | Download `cardekho_dataset.csv` into `price_prediction/data/`, then `python -m price_prediction.prepare_data` and `python -m price_prediction.train` |
| `condition_assessment` | [Coco Car Damage Detection Dataset](https://www.kaggle.com/datasets/lplenka/coco-car-damage-detection-dataset) + [Annotated Dataset of Car Parts with Damage](https://www.kaggle.com/datasets/shubhammkumaar/car-damage-parts-detection) (Kaggle — same underlying 1024x1024 photos, confirmed by matching filenames/dimensions) | Download both into `condition_assessment/data/` (keep their original folder names), then `python -m condition_assessment.prepare_data` and `python -m condition_assessment.train` |

`fraud_detection` and `price_prediction` are trained and committed as of
this writing; `condition_assessment` is trained but proof-of-concept scale
only — 63 images across 8 damage/part classes, expect low recall until a
larger dataset is collected.

## Testing

### server
```bash
cd server
cp .env.test.example .env.test   # separate DB from your dev data — see tests/setup.js
npm test
```
Vitest + Supertest, hitting a real Express app instance against a dedicated
`valora_v1_test` MongoDB database (cleared between every test). ML service
calls are mocked (`vi.mock('../src/services/mlService.js', ...)`), so these
tests don't need Django running and stay deterministic regardless of model
quality. Covers auth, listing CRUD/ownership/status-whitelisting, search
filters, and wishlist idempotency. `npm run test:watch` for watch mode.

### ml-service
```bash
cd ml-service
source venv/Scripts/activate
python manage.py test
```
Django's test runner (SQLite in-memory, no `.env` database needed). Covers
the trust-score formula against the spec's worked example, the fraud
preprocessing math (including the zero-width-range edge case), price
preprocessing's condition-score fallback, and the shared JWT auth class —
via the trust-score endpoint, since it's the one ML endpoint with no trained
model to worry about. Model-serving views (`predict-price`, `detect-fraud`,
`assess-condition`) aren't covered — testing them meaningfully needs a
trained model artifact per app, which is a separate, larger step (fixture
models or mocking `inference.predict` per app) than this pass covers.

### client
Not covered yet — would need a Vitest + Testing Library setup from scratch.
Deferred as a follow-up; the marketplace flows are covered by the server's
integration tests plus manual browser verification during development.

## Deployment

Target stack: **Vercel** (client), **Render** (server + ml-service),
**MongoDB Atlas** (database) — matches `docs/Valora_Team_Workflow.md`'s
original plan. Account creation and dashboard clicking are inherently
manual steps (Claude has no access to any of these three platforms in this
project) — everything below is what to actually enter once you're in each
dashboard. `render.yaml` at the repo root is a best-effort Blueprint for the
two Render services, but it's untested against a live Render account —
if "New Blueprint" rejects something, fall back to creating each service
manually and use the env var lists below directly.

**Known limitation, decide now whether it's acceptable:** Render's free
tier filesystem is ephemeral — uploaded listing photos (`server/uploads/`)
are wiped on every redeploy or restart. Fine for a demo/viva; if you need
photos to survive redeploys, swap `multer`'s disk storage for Cloudinary
(already listed as an optional external API in the spec doc) — that's a
separate task, not done here.

### Order of operations (each step needs the previous one's output)

1. **MongoDB Atlas** — create a free M0 cluster, a database user, allow
   network access from anywhere (`0.0.0.0/0`, simplest for a free-tier demo),
   and copy the connection string (add `/valora_v1` before the `?` query
   params as the database name).
2. **Pick one JWT_SECRET value** (any long random string) — you'll paste
   this exact value into *both* Render services below. If it's not
   character-for-character identical, every Node→Django ML call 401s.
3. **Deploy `ml-service` to Render first** (server needs its URL next):
   New Web Service → this repo → root directory `ml-service` → Python
   runtime, pinned to **3.13.x** (see `render.yaml`'s `pythonVersion` — this
   is not optional, TensorFlow has no 3.14 wheels).
   - Build: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start: `gunicorn valora_ml.wsgi:application --workers 1 --timeout 120 --bind 0.0.0.0:$PORT`
   - Env vars: `DJANGO_SECRET_KEY` (Render can generate this), `DJANGO_DEBUG=False`,
     `DJANGO_ALLOWED_HOSTS=<this-service>.onrender.com`, `JWT_SECRET=<step 2>`,
     `CORS_ALLOWED_ORIGINS=` (leave blank for now, filled in step 5).
   - Note the assigned URL (e.g. `https://valora-ml-service.onrender.com`).
4. **Deploy `server` to Render**: New Web Service → root directory `server`
   → Node runtime → build `npm install` → start `npm start`.
   - Env vars: `MONGODB_URI=<step 1>`, `JWT_SECRET=<step 2>`, `JWT_EXPIRES_IN=7d`,
     `ML_SERVICE_URL=<step 3 URL>/api/ml`, `CLIENT_URL=` (blank for now,
     step 6), `SMTP_*` (optional — inquiry emails silently log-and-continue
     without them, see `inquiryController.js`).
   - Note the assigned URL.
5. **Go back to `ml-service`'s env vars** and set
   `CORS_ALLOWED_ORIGINS=<step 4 URL>` (defense in depth only — browsers
   never call ml-service directly, only Node does). Restart the service.
6. **Deploy `client` to Vercel**: import the repo, root directory `client`
   (Vite auto-detected). Set `VITE_API_URL=<step 4 URL>/api` as an
   **environment variable in Vercel's project settings before building** —
   Vite bakes env vars in at build time, not runtime, so adding it after
   the fact means rebuilding, not just restarting.
7. **Go back to `server`'s env vars** and set `CLIENT_URL=<step 6 Vercel URL>`
   (needed for CORS). Restart the service.
8. **Seed the production database (optional)**: there's no shell access on
   Render's free tier. Easiest path: temporarily point your *local*
   `server/.env`'s `MONGODB_URI` at the Atlas connection string, run
   `npm run seed` from your machine, then change it back to your local
   Mongo instance.
9. **Smoke test**: visit the Vercel URL, register, browse, and create a
   listing. If `ml-service` had been idle, the first listing creation can
   take 60-90s (Render free-tier cold start) — this is expected, not a bug;
   `mlService.js`'s 90s axios timeout is sized for exactly this.

## Git workflow

- `main` — stable only, nothing pushed directly
- `dev` — integration branch, all work happens here
- `feature/<name>` branches off `dev`, one per task

See [docs/Valora_Team_Workflow.md](docs/Valora_Team_Workflow.md) §3 for
branch naming conventions and commit message style.
