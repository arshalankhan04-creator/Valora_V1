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

## Git workflow

- `main` — stable only, nothing pushed directly
- `dev` — integration branch, all work happens here
- `feature/<name>` branches off `dev`, one per task

See [docs/Valora_Team_Workflow.md](docs/Valora_Team_Workflow.md) §3 for
branch naming conventions and commit message style.
