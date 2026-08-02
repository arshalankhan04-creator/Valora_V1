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

#### Email

Inquiry notifications (new inquiry, new reply) go through `emailService.js`.
Sending is fire-and-forget — a slow or misconfigured SMTP server logs an
error but never fails the request itself (see `inquiryController.js`).

For local dev/demo, skip real SMTP entirely and use a free
[Ethereal](https://ethereal.email) sandbox account — no signup, just:
```bash
node -e "import('nodemailer').then(async ({default:n})=>console.log(await n.createTestAccount()))"
```
Copy the printed `user`/`pass` into `SMTP_USER`/`SMTP_PASS`, set
`SMTP_HOST=smtp.ethereal.email`. Nothing is delivered to a real inbox —
instead, every `sendMail()` call logs a preview URL
(`nodemailer.getTestMessageUrl`) you can open to see exactly what would
have been sent. Good enough to demo the feature working end-to-end without
risking a stray email to a real address during testing/grading.

For an actual deployment where real delivery matters, swap in a real
provider (Gmail app password, SendGrid, Mailtrap, Resend, etc.) — same
`SMTP_*` env vars, no code changes needed.

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

`price_prediction` uses a `RandomForestRegressor` (200 trees) over one-hot
brand/model/fuel/transmission plus numeric year/km/condition, fit on
log(price) — test R² 0.89, MAE ≈₹1.13L on the CarDekho dataset. A plain
`LinearRegression` on the same features only reached R² 0.71: brand/model
depreciation isn't additive (a Ferrari and a Datsun don't lose the same
rupee amount per year), which a linear model over one-hot columns can't
capture but a forest can. `feature_importance` in the API response is the
forest's `feature_importances_`, aggregated per original field (all of a
categorical feature's one-hot columns summed back into one number) — it's
an unsigned relative-importance score, not a signed % effect on price like
a linear coefficient would be.

## Analytics

The spec calls for a "Plotly/Dash" analytics dashboard — built differently
on purpose (see `CLAUDE.md` for the full reasoning): Dash is a standalone
Python web framework, and bolting it on would mean a third server with its
own auth/deployment story for no real benefit, when the project already
has one React frontend.

- **Live seller dashboard** (`/analytics` in the client, seller/admin only):
  real-time price trends — by brand, fuel type, year (depreciation curve),
  and condition-score bucket — aggregated over live Valora listings via
  a real MongoDB aggregation pipeline (`GET /api/listings/analytics`,
  `analyticsController.js`), rendered with Chart.js. Not historical
  training data — this grows and changes as the actual marketplace does.
- **EDA charts** (`python -m price_prediction.eda`, after `prepare_data.py`):
  a Seaborn-based data-science artifact over the training dataset —
  price-by-fuel-type, depreciation trend, price-vs-mileage, and a
  correlation heatmap — satisfying the syllabus's actual Seaborn/heatmap
  mention as a report/EDA deliverable rather than a live feature. Saves
  PNGs to `price_prediction/eda_charts/` (gitignored, regenerate anytime).

## Testing

### server
```bash
cd server
cp .env.test.example .env.test   # separate DB from your dev data — see tests/setup.js
npm test
```
Vitest + Supertest, hitting a real Express app instance against a dedicated
`valora_v1_test` MongoDB database (cleared between every test). ML service
and email calls are mocked (`vi.mock(...)`), so these tests don't need
Django or a real SMTP server and stay deterministic regardless of model
quality. 46 tests: auth (incl. the NoSQL-injection type-confusion fix),
listing CRUD/ownership/status-whitelisting, search filters, wishlist
idempotency, inquiry email notifications (both directions), and the
market-analytics aggregation math (including that a flagged listing must
be excluded from every average). `npm run test:watch` for watch mode.

### ml-service
```bash
cd ml-service
source venv/Scripts/activate
python manage.py test
```
Django's test runner (SQLite in-memory, no `.env` database needed). 34
tests. Covers the trust-score formula against the spec's worked example,
the fraud preprocessing math (including the zero-width-range edge case),
price preprocessing's condition-score fallback, and the shared JWT auth
class — via the trust-score endpoint, since it's the one ML endpoint with
no trained model to worry about. Every model-serving view (`predict-price`,
`detect-fraud`, `assess-condition`, `trust-score`) also has its own
APITestCase covering: auth required (401), payload validation (400), a
mocked `ModelNotTrainedError` → 503, and a mocked successful prediction →
200 with the exact response body. The trained model itself is never
invoked in tests — `inference.predict`/`inference.assess` are mocked per
test via `unittest.mock.patch.object`, so these tests don't depend on
model quality or need real training artifacts to exist.

### client
```bash
cd client
npm test
```
Vitest + React Testing Library, jsdom environment (`src/test/setup.js`
loads jest-dom matchers and clears localStorage between tests). 51 tests
across 11 files:
- Pure logic: `utils/format.js`, the trust-score tier boundaries in
  `TrustScoreBadge`, `RiskFlagBadge`/`StatusBadge` label mapping.
- `AuthContext`/`WishlistContext`: localStorage persistence, the
  optimistic wishlist toggle *and* its rollback on a failed request
  (mocking `services/wishlist.js`).
- `ProtectedRoute`: redirect-to-login, redirect-on-wrong-role, and
  renders-through cases, via a real `MemoryRouter`.
- `Login`/`Register`: submits the right payload, navigates on success,
  shows the server's error message vs. a generic fallback — mocking
  `services/api.js` rather than hitting a real network call.
- `ListingForm` (shared by Create/Edit): pre-fills from `initialValues`,
  calls `onSubmit` with current field values, `showImages`/`submitting`
  prop behavior.

Not covered: the data-fetching pages themselves (`Listings`,
`ListingDetail`, `SellerDashboard`, `AdminDashboard`, `Inquiries`,
`Wishlist`) — each would need its own service-layer mocking in the same
style as `Login`/`Register` above; skipped here for time, not because
it's harder. The server's integration tests plus manual browser
verification during development are what's actually exercised those
flows so far.

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
