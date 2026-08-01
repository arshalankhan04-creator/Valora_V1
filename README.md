# Valora — AI-Powered Vehicle Trust & Valuation Marketplace

A used-car marketplace where every listing is scored by four ML systems
before a buyer sees it: fair-price prediction, fraud/anomaly detection,
CNN-based condition assessment, and a combined Trust Score. See
[Valora_Final_Spec_APIs.md](Valora_Final_Spec_APIs.md) for the full spec and
[Valora_Team_Workflow.md](Valora_Team_Workflow.md) §8 for the Node↔Django API
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
ships with real preprocessing/train/inference code but no trained model yet —
supply a dataset under that app's `data/` folder and run
`python -m <app>.train` before calling its endpoint (it returns HTTP 503
with a clear message otherwise, rather than a fake result).

## Git workflow

- `main` — stable only, nothing pushed directly
- `dev` — integration branch, all work happens here
- `feature/<name>` branches off `dev`, one per task

See [Valora_Team_Workflow.md](Valora_Team_Workflow.md) §3 for branch naming
conventions and commit message style.
