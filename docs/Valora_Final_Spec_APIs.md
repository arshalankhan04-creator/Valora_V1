# Valora — AI-Powered Vehicle Trust & Valuation Marketplace
### Final Project Spec (Combined FCSP-2 + FSD-2 Project)

---

## 1. Real-World Problem

Buyers and sellers of used vehicles face three connected problems, not one:
1. **No fair pricing** — sellers guess prices; buyers can't verify if a listed price is reasonable.
2. **No trust signal** — buyers can't tell a genuine listing from a scam/fraudulent one before wasting time contacting the seller.
3. **No condition verification** — photos are uploaded with no real assessment of the vehicle's actual physical condition, so "good condition" claims are unverifiable until an in-person visit.

Existing marketplaces (OLX, CarDekho-style listings) solve none of these — they're just ad boards with zero intelligence layered on top.

---

## 2. Why It's Useful

Valora isn't "a marketplace with a price predictor bolted on" — it's a **trust and valuation engine** that gives every listing four independent layers of AI-backed confidence before a buyer ever messages a seller:

- **Is this price fair?** → Regression-based prediction
- **Is this listing likely fraudulent?** → Classification-based fraud detection
- **Is the car actually in the condition claimed?** → CNN-based image analysis
- **Should I trust this seller/listing overall?** → Combined Trust Score

This turns a one-dimensional "price calculator" into a genuinely multi-model intelligent system — which is both more useful in the real world and a much stronger demonstration of the ML syllabus.

---

## 3. Key Features

### Core Marketplace (MERN)
- User auth (JWT), role-based (buyer/seller/admin)
- Listing CRUD with image uploads (Multer)
- Search/filter by make, year, fuel type, price range
- Buyer–seller chat/inquiry system
- Email notifications (Nodemailer) for inquiries, price alerts
- Admin panel with regional demand heatmaps (Seaborn)

### Intelligence Layer 1 — Fair Price Prediction (Regression)
- Trained on car listing data (year, km driven, fuel type, brand, condition)
- Linear + Polynomial Regression, evaluated with R², MAE, MSE
- Returns predicted price **range** (not a single number) with confidence level
- Feature-importance breakdown shown to the user ("mileage and age are the biggest factors lowering this price") for explainability

### Intelligence Layer 2 — Fraud/Anomaly Detection (Classification)
- Random Forest / SVM classifier trained on labeled genuine-vs-suspicious listings (synthetic labels acceptable: e.g., price far outside predicted range + missing details + new account = suspicious)
- Every new listing gets a "Risk Flag": Low / Medium / High
- Evaluated using confusion matrix — accuracy, sensitivity, specificity
- High-risk listings are auto-flagged for admin review before going live

### Intelligence Layer 3 — Condition Assessment (CNN + Transfer Learning)
- Seller uploads vehicle photos
- Pre-trained CNN (transfer learning, e.g., fine-tuned MobileNet/ResNet) analyzes photos for visible damage/wear (dents, scratches, rust)
- Outputs a "Visual Condition Score" that feeds into the price prediction as an additional factor
- This is the most demo-friendly feature — visually shows AI "looking" at a photo and reacting

### Intelligence Layer 4 — Trust Score (Combined Scoring Logic)
- Combines: price fairness (Layer 1) + fraud risk (Layer 2) + condition match (Layer 3) + seller history (response rate, past successful deals, account age)
- Produces a single 0–100 Trust Score displayed on every listing
- Buyers can sort/filter listings by Trust Score, not just price

### Supporting Features
- Web-scraped market comparison data (BeautifulSoup) to keep price model current
- Seller analytics dashboard (Plotly/Dash): price trends by brand, fuel type, year, condition
- Depreciation forecast (stretch): estimated resale value 1–2 years out

---

## 4. Syllabus Topics Covered

**FCSP-2 (Python/Django/ML):**
- Unit 1 — Pandas, EDA, outlier detection (used in fraud detection + data cleaning)
- Unit 2 — Seaborn/Plotly/Dash (analytics dashboards, heatmaps)
- Unit 3 — Feature engineering, train-validation split (all 4 models)
- Unit 4 — Linear/Polynomial Regression, R²/MAE/MSE (price prediction)
- Unit 5 — kNN/Decision Tree/Random Forest/SVM, confusion matrix (fraud detection)
- Unit 6 — CNN, transfer learning, pooling/dropout (condition assessment)
- Unit 7 — Web scraping (BeautifulSoup), REST APIs, JSON handling
- Unit 8 — Django MVT, Models, ORM, migrations
- Unit 9 — Django auth, forms, CSRF, user management
- Unit 10 — DRF serializers/viewsets, JWT auth, Postman testing

**FSD-2 (MERN):**
- Unit 1 — JSON handling across all API responses
- Unit 2–3 — Node core modules, HTTP/Express server setup
- Unit 4 — Express routing & middleware
- Unit 5 — Sessions, cookies, RESTful API design, CORS
- Unit 6 — Multer (image uploads), Nodemailer (alerts)
- Unit 7 — React setup, JSX, component structure, routing
- Unit 8 — React hooks (useState/useEffect/useContext), Axios API integration
- Unit 9 — MongoDB queries, aggregation framework
- Unit 10 — Mongoose schemas, validation, CRUD, indexing

**Coverage result:** All 10 units of both subjects, with 4 distinct ML techniques instead of 1 — meaning nearly every classification/regression/deep-learning unit has a genuine, load-bearing use case in the product instead of being included just to "check a box."

---

## 5. Recommended Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + React Router + Axios + Chart.js |
| Core Backend | Node.js + Express + MongoDB + Mongoose |
| ML Backend | Django + Django REST Framework |
| Regression / Fraud models | scikit-learn |
| CNN / Transfer Learning | TensorFlow / Keras |
| Scraping | BeautifulSoup + `requests` |
| Scheduling | `node-cron` or Python `APScheduler` for periodic market data refresh |
| Auth | JWT (shared between Node and Django) |
| Optional stretch | Socket.io for real-time chat |

**Architecture:** React frontend → Node/Express (marketplace, users, chat, listings) → calls Django/DRF ML microservice internally for price prediction, fraud score, condition score, and trust score.

---

## 6. Expected Difficulty

**High.** This is now a genuine multi-model ML system connected to a full-stack marketplace — appropriately ambitious for a combined-subject semester project, while every individual piece (regression, classification, CNN, MERN CRUD) is something your labs already walk you through. The complexity comes from **integration**, not from learning unfamiliar technology, which keeps risk manageable.

*(If time gets tight: the CNN condition layer and depreciation forecast are the easiest to scope down first — the core Regression + Fraud Detection + Trust Score combination alone already clears the "just a price predictor" bar.)*

---

## 7. Future Enhancements

- Agentic AI negotiation assistant (autonomous agent that negotiates within the ML-predicted price range) — planned as Phase 2 after core system is stable
- Real-time bidding/auction mode
- Loan/EMI calculator integration
- Depreciation/resale-value forecasting (time-series)
- Mobile app version
- Blockchain-based ownership/history ledger (only if time allows well beyond Phase 2)

---

## 8. Why It's a Strong Semester Project

1. **Directly extends your own syllabus's suggested projects** — the FCSP-2 syllabus itself proposes an "Online Vehicle Marketplace" and an "Intelligent Data Analysis and Prediction System." Valora merges both into one coherent, real product.
2. **Four ML models, not one** — regression, classification, CNN, and a combined scoring system means nearly every ML unit in your syllabus has genuine, demonstrable use — not just the regression unit.
3. **Full syllabus coverage on both subjects** — nothing is included just for coverage's sake; every feature has a clear reason to exist in the product.
4. **Explainable, demo-friendly, low-risk architecture** — standard REST/DB stack (no unfamiliar infra like blockchain), so live demos are reliable, while still being technically substantial enough to stand out from single-feature "AI" projects.
5. **Clear growth path** — the agentic AI negotiation layer is a natural, well-motivated Phase 2 if time permits, without being required for a complete, gradeable submission.

---

## 9. APIs Used

### Internal APIs (core architecture — built by the team)

| API | Built with | Purpose |
|---|---|---|
| Node/Express REST API | Express routes | Auth (login/register, JWT), listing CRUD, chat/inquiry system, search/filter — everything the React frontend calls |
| Django REST Framework (DRF) API | DRF serializers/viewsets | Price prediction, fraud risk score, condition score, Trust Score — everything Node calls internally |
| Internal service-to-service API | Node → Django | When a listing is created/updated, Node sends the car's data to Django's endpoint and receives back the prediction and scores |

This internal API layer is the core technical backbone of the project — it directly demonstrates FCSP-2 Unit 10 (DRF, JWT, API versioning) and FSD-2 Unit 5 (RESTful API design, CORS).

### External APIs (optional enhancements)

| API | What it adds | Free tier? |
|---|---|---|
| Google Maps / OpenStreetMap API | Show listing locations on a map; supports the regional-demand dashboard | Yes, generous free tiers |
| Cloudinary API | Better image hosting/optimization for vehicle photos instead of raw server storage | Yes (free tier sufficient for student use) |
| Nodemailer (SMTP, not a third-party API but functions similarly) | Email notifications for inquiries/price alerts | Free, uses your own email account |
| Vehicle registration/VIN lookup API (region-dependent) | Auto-fill car details from a registration number | Varies — needs to be checked for availability/cost in your region |

### Phase 2 (Agentic AI negotiation layer)

| API | Purpose | Cost |
|---|---|---|
| LLM API (e.g., Claude or GPT) | Powers the negotiation agent's reasoning and tool-calling | Small, usage-based cost — the only part of the project with a potential (minor) cost |

---

## 10. Elevator Pitch (for quick explanations)

> "Valora is a used-car marketplace where every listing gets checked by four different AI systems before a buyer even sees it: one predicts if the price is fair, one flags likely scams, one looks at the photos to verify the car's actual condition, and one combines all of that into a single Trust Score. It's not just 'AI tells you a price' — it's a full trust layer for used-car buying, built as a real MERN marketplace connected to a Django machine-learning backend."
