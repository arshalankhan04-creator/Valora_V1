# Valora — Two-Person Team Workflow Guide

A practical, beginner-friendly workflow for you and your teammate, modeled on how small real-world dev teams actually operate — simplified for a 2-person student project.

---

## 1. Role Split

With only two people and a project that has 4 distinct layers (MERN marketplace, Django ML backend, CNN, deployment), the cleanest split is **by system**, not by "frontend person vs backend person" — that avoids constant blocking on each other.

### Team Member A — Full Stack (MERN) Lead
- React frontend (all components, routing, state management)
- Node/Express backend (API routes, auth, middleware)
- MongoDB/Mongoose (schemas, CRUD, aggregation)
- Deployment of frontend + Node backend (Vercel + Render)

### Team Member B — ML/Data Lead
- Django + DRF backend (ML microservice, endpoints)
- All 3 ML models: regression (price), classification (fraud), CNN (condition)
- Data cleaning, EDA, dashboards (Pandas/Seaborn/Plotly/Dash)
- Web scraping (BeautifulSoup)
- Deployment of Django backend (Render)

### Shared responsibilities (both of you, always)
- **Integration** — connecting Node ↔ Django APIs (this touches both sides, do it together)
- **Testing** — each person tests their own module, but integration testing is joint
- **Documentation** — split by section, but both review each other's writing
- **Report/PPT/viva prep** — both must understand the *entire* system, not just your half, since faculty can ask either of you anything

**Important:** rotate who explains what during any internal practice runs — if faculty always sees Member A explain frontend and Member B explain ML, it looks like you only know your own half. Each of you should be able to explain the whole project.

---

## 2. Work Breakdown by Layer

| Layer | Owner | Key Tasks |
|---|---|---|
| **Frontend (React)** | Member A | Component structure, routing, forms, Axios integration, UI for Trust Score/price/fraud flag display |
| **Backend (Node/Express)** | Member A | Auth (JWT), listing CRUD APIs, chat/inquiry system, Multer uploads, calling Django endpoints |
| **Database (MongoDB)** | Member A | Schema design (User, Listing, Chat), Mongoose validation, aggregation queries for analytics |
| **AI/ML (Django)** | Member B | Regression model, classification (fraud) model, CNN (condition), DRF serializers/viewsets, JWT validation on Django side |
| **Data Analytics** | Member B | EDA, Pandas cleaning, Seaborn/Plotly/Dash dashboards |
| **Web Scraping** | Member B | BeautifulSoup scraper for market comparison data, scheduled refresh |
| **Testing** | Both | Member A tests MERN endpoints (Postman), Member B tests Django endpoints (Postman), both test end-to-end flows together |
| **Documentation** | Both | Member A writes frontend/backend setup docs, Member B writes ML model docs, both co-write the final report |
| **Deployment** | Both | Member A deploys React+Node, Member B deploys Django, both verify the full connected system live together |

This split means you can genuinely work in parallel for most of the semester without waiting on each other — you only need to sync up at integration points.

---

## 3. Git/GitHub Workflow

Keep it simple — you don't need a heavyweight enterprise flow, but you do want real discipline so nothing gets overwritten or lost.

### Repository structure
Use **one GitHub repository** with clear folders, not separate repos per person:
```
valora/
├── client/          (React app - Member A)
├── server/          (Node/Express - Member A)
├── ml-service/      (Django - Member B)
├── docs/            (shared documentation)
└── README.md
```

### Branch strategy
- `main` — always stable, working code only. Nobody pushes directly to `main`.
- `dev` — integration branch where both members' work gets merged before going to `main`
- Feature branches — one per task, named clearly:
  - `feature/react-login-page`
  - `feature/price-prediction-api`
  - `feature/fraud-classifier`
  - `fix/mongodb-schema-bug`

### Daily workflow
1. Pull latest `dev` before starting work: `git pull origin dev`
2. Create a feature branch off `dev`: `git checkout -b feature/your-task-name`
3. Commit small, frequent changes with clear messages:
   - Good: `"Add JWT middleware for protected routes"`
   - Bad: `"update"` or `"fix stuff"`
4. Push your branch and open a **Pull Request (PR)** into `dev`, not `main`
5. The other person reviews the PR — even a quick 5-minute read — before merging
6. Merge into `dev`, test that everything still works together
7. Periodically (e.g., weekly, or before each faculty review), merge `dev` into `main`

### Code review — keep it lightweight
Since it's just two of you, code review doesn't need to be formal. A quick checklist works:
- Does it run without errors?
- Does it break anything that was already working?
- Is it reasonably readable (so the other person could maintain it later)?

### Merge conflict avoidance
Because your split is by *layer* (React vs Django vs Node), you'll rarely touch the same files — this is the biggest advantage of this role split over splitting by "frontend vs backend of the same app." Conflicts will mostly happen only in shared files like `README.md` or `package.json` — communicate before editing those.

---

## 4. Task Tracking & Communication

### Task tracking
Use **GitHub Projects** (free, built into your repo) or **Trello** — either works. Set up 3 columns:
- **To Do**
- **In Progress**
- **Done**

Break the project into weekly milestones (see suggested timeline below) and add cards for each concrete task ("Build listing CRUD API," "Train regression model," "Design Trust Score formula"). This gives you a visual, shared source of truth instead of relying on memory or scattered chats.

### Communication
- **Daily/every-other-day check-in** (even 10 minutes) — what did you finish, what are you starting next, any blockers. Doesn't need a formal meeting; a WhatsApp voice note or quick call works.
- **Weekly sync** (30–45 min) — review progress against your milestone plan, re-plan if something's behind schedule, do a quick integration test of whatever's been built so far.
- Keep a **shared doc** (Google Doc or Notion) for decisions you make together — e.g., "we decided Trust Score = 40% price fairness + 30% fraud risk + 30% condition score" — so neither of you forgets *why* something was built a certain way.

---

## 5. Suggested Timeline (adjust to your actual semester length)

| Week(s) | Member A (MERN) | Member B (ML) | Joint |
|---|---|---|---|
| 1–2 | Project setup, DB schema design, basic auth | Dataset collection & EDA | Finalize feature list, Trust Score formula |
| 3–4 | Listing CRUD, image upload | Train regression model, expose via DRF | — |
| 5–6 | Chat/inquiry system, dashboards UI | Train fraud classifier | First integration test (Node calls Django) |
| 7–8 | Frontend polish, search/filter | Train CNN condition model | Second integration test |
| 9–10 | Deployment (frontend + Node) | Deployment (Django) | Full live system test |
| 11–12 | Bug fixes, UI polish | Model tuning, dashboard polish | Documentation, report writing |
| 13+ | — | — | Viva prep, practice explaining both halves |

Build in buffer time — ML model training and debugging integration issues almost always take longer than expected.

---

## 6. Best Practices for First-Time Team Projects

- **Agree on coding conventions early** — naming style, folder structure, indentation — takes 10 minutes to discuss and saves hours of messy merges later.
- **Write a one-page "contract" of who owns what** — not for bureaucracy, but so there's zero ambiguity later about who was supposed to do what (helps avoid "I thought you were doing that" moments).
- **Integrate early and often** — don't wait until Week 10 to connect Node and Django for the first time. Do a basic "hello world" connection between them in Week 1–2, even before either side is fully built, so you catch integration issues early instead of at the end.
- **Test on each other's machines** — something that works on your laptop might fail on your teammate's due to environment differences (Node version, missing `.env` variables). Do this check at least twice during the project.
- **Keep secrets out of Git** — use a `.env` file for API keys/DB connection strings, add it to `.gitignore` immediately in Week 1. Share secrets via a private message, never commit them.
- **Document as you go, not at the end** — write a short note in your shared doc every time you make a non-obvious decision. Reconstructing "why did we do it this way" in Week 12 is painful.

---

## 7. Common Mistakes to Avoid

1. **Splitting work by "you do frontend, I do backend of the same feature"** — this forces constant back-and-forth and blocking. Split by *system* (MERN vs Django) instead, like this guide suggests.
2. **Both people working on `main` directly** — one bad push can break everything both of you have built. Always use branches + PRs.
3. **No integration testing until the very end** — the most common cause of last-minute panic in two-service projects. Integrate early, even with placeholder/dummy responses.
4. **Only one person understanding the whole system** — if only Member B can explain the ML side, faculty will notice immediately in the viva. Both of you must be able to explain every part.
5. **Not tracking tasks anywhere** — relying on memory or scattered WhatsApp messages leads to duplicate work or forgotten tasks. Use the GitHub Projects/Trello board, even if it feels like overhead at first.
6. **Underestimating ML training/debugging time** — CNN training especially can eat far more time than expected (data collection, cleaning, tuning). Build buffer weeks into your timeline.
7. **Skipping code review entirely** — even a 5-minute glance at your teammate's PR catches bugs and keeps both of you familiar with the whole codebase.
8. **Not deciding on the Trust Score formula together early** — this is the one piece that ties both your halves together (ML output → frontend display), so agree on its exact structure before either of you builds around it.

---

## 8. Node ↔ Django API Contract

To enable Member A (MERN) and Member B (ML) to build their respective halves in parallel, the following JSON request/response shapes must be adhered to for the internal service-to-service communication.

All Django endpoints should reside under `/api/ml/` and require JWT authentication headers.

### 1. Visual Condition Assessment (CNN Model)
* **Endpoint**: `POST /api/ml/assess-condition/`
* **Content-Type**: `multipart/form-data`
* **Request Payload**:
  * `images`: File[] (Multer-uploaded car images sent from Node backend)
* **Response Payload**:
  ```json
  {
    "visual_condition_score": 85.0,
    "detected_damages": [
      {
        "part": "bumper_front",
        "damage_type": "scratch",
        "confidence": 0.89
      }
    ]
  }
  ```

### 2. Fair Price Prediction (Regression Model)
* **Endpoint**: `POST /api/ml/predict-price/`
* **Content-Type**: `application/json`
* **Request Payload**:
  ```json
  {
    "brand": "Honda",
    "model": "City",
    "year": 2021,
    "km_driven": 32000,
    "fuel_type": "Petrol",
    "transmission": "Automatic",
    "condition_score": 85.0
  }
  ```
* **Response Payload**:
  ```json
  {
    "predicted_price_min": 2250000,
    "predicted_price_max": 2400000,
    "confidence_level": "high",
    "feature_importance": {
      "year": 0.45,
      "km_driven": -0.30,
      "condition_score": 0.25
    }
  }
  ```

### 3. Fraud/Anomaly Detection (Classification Model)
* **Endpoint**: `POST /api/ml/detect-fraud/`
* **Content-Type**: `application/json`
* **Request Payload**:
  ```json
  {
    "price": 2300000,
    "predicted_price_min": 2250000,
    "predicted_price_max": 2400000,
    "seller_account_age_days": 5,
    "has_missing_details": false,
    "num_previous_listings": 0
  }
  ```
* **Response Payload**:
  ```json
  {
    "risk_flag": "Low",
    "fraud_probability": 0.12,
    "reasons": []
  }
  ```

### 4. Overall Trust Score
* **Endpoint**: `POST /api/ml/trust-score/`
* **Content-Type**: `application/json`
* **Request Payload**:
  ```json
  {
    "price_fairness_score": 95,
    "fraud_risk_score": 90,
    "condition_score": 85,
    "seller_history": {
      "response_rate": 92,
      "past_deals": 5,
      "account_age_days": 180
    }
  }
  ```
* **Response Payload**:
  ```json
  {
    "trust_score": 92,
    "breakdown": {
      "price_fairness": 38.0,
      "fraud_risk": 27.0,
      "condition_match": 25.5,
      "seller_factor": 1.5
    }
  }
  ```

---

## Quick Reference Checklist

- [ ] GitHub repo created with `main`/`dev` branches and `.gitignore` set up (Week 1)
- [ ] Roles and task board set up (Week 1)
- [ ] Trust Score formula agreed upon in writing (Week 1–2)
- [ ] First "hello world" Node ↔ Django connection working (Week 2)
- [ ] Weekly sync meetings happening consistently
- [ ] Each person can explain both halves of the system by Week 10
- [ ] Full integration test completed before final submission
- [ ] Secrets/API keys never committed to Git
