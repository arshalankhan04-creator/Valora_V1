# Valora — Complete Project Documentation

**AI-Powered Vehicle Trust & Valuation Marketplace**
A solo-built MERN marketplace paired with a Django/DRF machine-learning microservice.

This document is written for three audiences at once:
1. **You (the developer)** — so every module makes sense months from now.
2. **Faculty during viva** — so the project can be explained and defended confidently.
3. **Another developer** — so they can understand the system without reading a single line of source code first.

Nothing below is aspirational. Every claim in this document reflects code that
actually exists and runs in this repository as of the date this file was
generated.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Tech Stack (With Reasons)](#4-tech-stack-with-reasons)
5. [Complete Folder Structure](#5-complete-folder-structure)
6. [System Architecture](#6-system-architecture)
7. [Frontend Workflow](#7-frontend-workflow)
8. [Backend Workflow](#8-backend-workflow)
9. [Authentication Flow](#9-authentication-flow)
10. [Database Schema](#10-database-schema)
11. [API Documentation](#11-api-documentation)
12. [Every Feature, Explained Step-by-Step](#12-every-feature-explained-step-by-step)
13. [User Roles Explained](#13-user-roles-explained)
14. [Complete Application Flow (End-to-End)](#14-complete-application-flow-end-to-end)
15. [Validation and Security](#15-validation-and-security)
16. [State Management](#16-state-management)
17. [Routing](#17-routing)
18. [File Upload Flow](#18-file-upload-flow)
19. [Error Handling](#19-error-handling)
20. [Environment Variables](#20-environment-variables)
21. [Installation](#21-installation)
22. [Running Locally](#22-running-locally)
23. [Future Improvements](#23-future-improvements)
24. [Known Limitations](#24-known-limitations)
25. [Faculty Viva Questions With Answers](#25-faculty-viva-questions-with-answers)
26. [Glossary of Technical Terms](#26-glossary-of-technical-terms)

---

## 1. Project Overview

Valora is a full-stack used-car marketplace where **every listing is scored
by four independent AI systems before a buyer ever sees it**. It is not a
"marketplace with a price predictor bolted on" — it is a trust and
valuation engine wrapped around a real, working MERN application.

The project is split into two independently-runnable services that
communicate over a private REST API:

| Service | Technology | Responsibility |
|---|---|---|
| **Client** | React (Vite) | Everything the user sees and clicks |
| **Server** | Node.js / Express / MongoDB | Users, listings, chat, wishlist — the marketplace itself |
| **ml-service** | Django / DRF / scikit-learn / TensorFlow | The 4 AI models: price prediction, fraud detection, condition assessment, trust score |

The **client never talks to ml-service directly**. Every AI-scored value a
buyer sees was computed by Django, sent to Node, saved into MongoDB, and
only then served to the browser. This single rule is the most important
architectural fact about the whole system — see [Section 6](#6-system-architecture).

Built solo, end-to-end, as a combined final-semester project covering both
an ML/Python syllabus (FCSP-2) and a full-stack syllabus (FSD-2).

---

## 2. Problem Statement

Reproduced from the project's original specification
(`docs/Valora_Final_Spec_APIs.md`), because this is the actual reasoning
the project was designed around — not an after-the-fact justification.

Buyers and sellers of used vehicles face **three connected problems**, not
one:

1. **No fair pricing** — sellers guess prices; buyers have no way to verify
   whether a listed price is reasonable for that car's age, mileage, and
   condition.
2. **No trust signal** — buyers cannot tell a genuine listing from a
   scam/fraudulent one before wasting time contacting the seller.
3. **No condition verification** — photos are uploaded with zero real
   assessment of the vehicle's actual physical condition, so a seller's
   "good condition" claim is unverifiable until an in-person visit.

Existing marketplaces (OLX-style, CarDekho-style listing boards) solve
**none** of these — they are ad boards with zero intelligence layered on
top. A listing on those platforms is just text and photos; nothing
independently checks whether the price, the seller, or the car itself can
be trusted.

**Valora's answer:** attach four independent AI-backed confidence checks
to every single listing, automatically, before it's even visible to a
buyer:

- *Is this price fair?* → Regression-based price prediction
- *Is this listing likely fraudulent?* → Classification-based fraud detection
- *Is the car actually in the condition claimed?* → CNN-based image analysis
- *Should I trust this seller/listing overall?* → A combined Trust Score

---

## 3. Objectives

1. Build a fully working, real (not mocked) marketplace with authentication,
   listing management, search, buyer-seller communication, and moderation —
   the same core feature set as any real classifieds platform.
2. Wire in four genuinely distinct machine learning techniques — regression,
   classification, a convolutional neural network, and a rule-based scoring
   combination — each with a real, load-bearing purpose in the product, not
   included just to "check a syllabus box."
3. Make the two backends (Node and Django) talk to each other over a real,
   authenticated internal API, demonstrating REST API design and JWT-based
   service-to-service trust.
4. Cover both syllabi (FCSP-2 Python/ML/Django and FSD-2 MERN) end-to-end,
   with every unit backed by an actual working feature rather than a toy
   example.
5. Ship with automated tests across all three services (174 tests total),
   proving the system behaves correctly rather than just "looking done."
6. Apply real, if lightweight, security hardening (rate limiting, security
   headers, injection-safe query building) rather than treating security as
   out of scope for a student project.
7. Keep the whole system honestly documented — including what was
   deliberately **not** built and why (see [Section 24](#24-known-limitations)).

---

## 4. Tech Stack (With Reasons)

### Frontend

| Technology | Why this, specifically |
|---|---|
| **React 19** | Component-based UI matches the app's structure naturally (a `ListingCard` used in three different pages, a `TrustScoreBadge` used in five places). Hooks (`useState`/`useEffect`/`useContext`) map directly to the FSD-2 syllabus's React unit. |
| **Vite** | Near-instant dev server start and hot reload compared to older bundlers (Create React App, Webpack) — matters a lot when iterating on UI during development. Also produces a small, fast production build (`npm run build`) with zero extra config. |
| **React Router (v7)** | Client-side routing for a single-page app — `/listings`, `/listings/:id`, `/my-listings`, etc. — without full page reloads. `BrowserRouter` + nested `<Route>`s map cleanly onto the app's page list. |
| **Axios** | Promise-based HTTP client with **interceptors** — used here to automatically attach the JWT to every outgoing request (see `services/api.js`) without repeating that logic in every service function. |
| **Tailwind CSS v4** | Utility-first styling means no separate CSS files to maintain per component, and no naming-convention bikeshedding (BEM, CSS modules, etc.) for a solo-built project. |
| **Chart.js + react-chartjs-2** | Renders the market-analytics charts (bar/line) directly in React with a declarative `data`/`options` API — no separate charting server needed. |
| **Vitest + React Testing Library** | Vitest is Vite-native (shares config, near-instant test runs). RTL tests behavior (what a user sees/clicks) instead of implementation details, which is exactly what's needed to test pages without over-specifying internals. |

### Backend (Core Marketplace)

| Technology | Why this, specifically |
|---|---|
| **Node.js + Express 5** | Express is the de facto standard for REST APIs in Node — minimal, unopinionated routing and middleware that maps directly onto FSD-2's Express unit. |
| **MongoDB + Mongoose** | Listings are naturally document-shaped (a listing has a nested, variable-shape `ml` sub-object with damage arrays, feature-importance maps, etc.) — a relational schema would need several joined tables for the same data. Mongoose adds schema validation, middleware (password hashing), and the aggregation framework used for analytics. |
| **JWT (jsonwebtoken)** | Stateless auth — no server-side session store needed, and the **same** secret is shared with Django so one token format can authenticate both a user (Node) and a service call (Django), which is central to the whole ML-integration architecture. |
| **bcryptjs** | Industry-standard password hashing (adaptive, salted) — used in a `pre('save')` Mongoose hook so no controller ever has to remember to hash a password manually. |
| **Multer** | The standard Express middleware for `multipart/form-data` file uploads — handles listing photo uploads directly to local disk. |
| **Nodemailer + Ethereal** | Sends real SMTP email for inquiry notifications without needing a paid provider or real recipient inboxes during development — Ethereal is a free sandbox SMTP service made for exactly this. |
| **Helmet** | One-line security-header hardening (prevents clickjacking, disables risky legacy features, sets sane `Content-Security-Policy` defaults) — a real, if lightweight, security measure. |
| **express-rate-limit** | Blunts brute-force login attempts and registration spam on the two most abuse-prone routes. |
| **Vitest + Supertest** | Supertest lets tests make real HTTP requests against the Express app object without actually binding a port — fast, realistic integration tests. |

### ML Backend

| Technology | Why this, specifically |
|---|---|
| **Django + Django REST Framework (DRF)** | A second backend was needed anyway to isolate ML dependencies (scikit-learn, TensorFlow) from the Node process — Django/DRF is the standard, syllabus-required way to expose Python ML models as REST endpoints, with serializers doing request validation for free. |
| **scikit-learn** | Powers price prediction (`RandomForestRegressor`) and fraud detection (`RandomForestClassifier`) — the standard library for classical ML in Python, directly matching the regression/classification units of the syllabus. |
| **TensorFlow / Keras (MobileNetV2)** | Powers the CNN condition-assessment model via **transfer learning** — MobileNetV2 is small and fast enough to fine-tune on a tiny (63-image) dataset without needing a GPU, while still being a real, pretrained-on-ImageNet convolutional network. |
| **PyJWT** | Verifies the shared-secret service token Node sends on every ML call — the Python-side half of the JWT trust boundary described above. |
| **joblib** | Serializes trained scikit-learn pipelines (including the fitted preprocessor) to disk so training and inference never drift apart. |
| **Seaborn + matplotlib** | Produces the EDA charts (`price_prediction/eda.py`) satisfying the syllabus's Seaborn/heatmap requirement as a data-science report artifact, separate from the live-serving Chart.js dashboard. |

### Why two backends instead of one?

This is a common viva question, so it's worth stating directly: **Django
was not chosen because Node "can't do ML."** It was chosen because:
1. The syllabus explicitly requires Django/DRF as a deliverable.
2. Python's ML ecosystem (scikit-learn, TensorFlow) has no real equivalent
   in Node — reimplementing a CNN or a Random Forest in JavaScript would be
   reinventing well-tested wheels for no benefit.
3. Keeping ML dependencies in a separate process means the Node server's
   dependency tree stays small and fast to install, and a slow/failing ML
   call (e.g., cold-starting TensorFlow) can't block simple things like
   logging in.

---

## 5. Complete Folder Structure

```
Valora_V1/
├── client/                          React frontend (Vite)
│   ├── src/
│   │   ├── components/              Reusable UI pieces
│   │   │   ├── Layout.jsx           Navbar + <Outlet/> shell every page renders inside
│   │   │   ├── ListingCard.jsx      One listing's summary card (used in Listings, Wishlist)
│   │   │   ├── ListingForm.jsx      Shared form for Create AND Edit listing
│   │   │   ├── ProtectedRoute.jsx   Route guard — redirects if not logged in / wrong role
│   │   │   ├── TrustScoreBadge.jsx  Colored badge showing a listing's Trust Score tier
│   │   │   ├── RiskFlagBadge.jsx    Colored badge showing Low/Medium/High fraud risk
│   │   │   ├── StatusBadge.jsx      Colored badge for listing status (active/flagged/etc.)
│   │   │   └── WishlistButton.jsx   Heart icon toggle, used inside ListingCard & ListingDetail
│   │   ├── context/                 React Context providers (global state)
│   │   │   ├── AuthContext.jsx      Current logged-in user + login()/logout()
│   │   │   └── WishlistContext.jsx  The buyer's saved-listing IDs + optimistic toggle
│   │   ├── pages/                   One file per route/page
│   │   │   ├── Home.jsx             Landing page
│   │   │   ├── Login.jsx / Register.jsx
│   │   │   ├── Listings.jsx         Browse + search/filter
│   │   │   ├── ListingDetail.jsx    Single listing + ML breakdown + contact-seller form
│   │   │   ├── CreateListing.jsx    Seller: list a new car
│   │   │   ├── EditListing.jsx      Seller/admin: edit an existing listing
│   │   │   ├── SellerDashboard.jsx  Seller: view/edit/delete own listings
│   │   │   ├── AdminDashboard.jsx   Admin: moderate all listings
│   │   │   ├── Inquiries.jsx        Buyer/seller chat inbox
│   │   │   ├── Wishlist.jsx         Buyer's saved listings
│   │   │   ├── Analytics.jsx        Live market-analytics dashboard (charts)
│   │   │   └── NotFound.jsx         404 page
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx        The single source of truth for every URL → page mapping
│   │   ├── services/                Thin wrappers around Axios calls — one function per API endpoint
│   │   │   ├── api.js                The shared Axios instance (base URL + JWT interceptor)
│   │   │   ├── listings.js
│   │   │   ├── inquiries.js
│   │   │   └── wishlist.js
│   │   ├── utils/
│   │   │   └── format.js            formatPrice()/formatKm() — Indian-locale number formatting
│   │   ├── App.jsx                  Wraps the whole app in Router + AuthProvider + WishlistProvider
│   │   └── main.jsx                 React entry point (ReactDOM.createRoot)
│   └── package.json
│
├── server/                          Node/Express backend (the marketplace itself)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                Connects Mongoose to MongoDB
│   │   ├── controllers/             One file per resource — the actual request-handling logic
│   │   │   ├── authController.js    register / login / getMe
│   │   │   ├── listingController.js CRUD + search/filter + admin listing views
│   │   │   ├── inquiryController.js Create inquiry, list inquiries, reply
│   │   │   ├── userController.js    Wishlist add/remove/get
│   │   │   └── analyticsController.js  MongoDB aggregation for the analytics dashboard
│   │   ├── middleware/
│   │   │   ├── auth.js              protect (JWT check) + authorize (role check)
│   │   │   ├── upload.js            Multer config for listing photo uploads
│   │   │   ├── rateLimiters.js      Rate limit for /auth routes
│   │   │   └── errorHandler.js      Central error → HTTP response translator
│   │   ├── models/                  Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Listing.js
│   │   │   └── Inquiry.js
│   │   ├── routes/                  Maps URLs to controller functions + middleware chains
│   │   │   ├── authRoutes.js
│   │   │   ├── listingRoutes.js
│   │   │   ├── inquiryRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── services/                 Business logic that isn't a single HTTP request/response
│   │   │   ├── mlService.js          HTTP client for calling ml-service's 4 endpoints
│   │   │   ├── listingIntelligence.js Orchestrates the 4-model ML pipeline for one listing
│   │   │   └── emailService.js       Nodemailer wrapper (sendMail)
│   │   ├── scripts/
│   │   │   └── seed.js               Populates MongoDB with demo users/listings/inquiry
│   │   ├── utils/
│   │   │   ├── ApiError.js           A custom Error subclass carrying an HTTP status code
│   │   │   ├── asyncHandler.js       Wraps async controllers so thrown errors reach errorHandler
│   │   │   └── escapeRegex.js        Makes user search input safe to embed in a RegExp
│   │   ├── app.js                    Express app: middleware + route mounting (no app.listen here)
│   │   └── server.js                 Entry point: connects DB, then starts listening
│   ├── tests/                        Vitest + Supertest integration tests (46 tests)
│   └── package.json
│
├── ml-service/                       Django/DRF ML microservice
│   ├── core/                         Shared, cross-app pieces
│   │   └── authentication.py         ServiceJWTAuthentication — verifies Node's service token
│   ├── price_prediction/             Intelligence Layer 1: regression
│   │   ├── prepare_data.py           Cleans the raw Kaggle CSV into training-ready data
│   │   ├── preprocessing.py          Shared feature-building logic (train AND inference use this)
│   │   ├── train.py                  Fits the RandomForestRegressor, saves the model artifact
│   │   ├── inference.py              Loads the saved model, makes a prediction
│   │   ├── serializers.py            DRF request validation for POST /predict-price/
│   │   ├── views.py                  The actual HTTP endpoint
│   │   └── eda.py                    Seaborn EDA charts (report artifact, not live-serving)
│   ├── fraud_detection/              Intelligence Layer 2: classification
│   │   ├── generate_synthetic_data.py  Builds the synthetic labeled training set
│   │   ├── preprocessing.py / train.py / inference.py / serializers.py / views.py
│   ├── condition_assessment/         Intelligence Layer 3: CNN
│   │   ├── prepare_data.py           Pairs two Kaggle datasets into image+label pairs
│   │   ├── preprocessing.py / train.py / inference.py / views.py
│   ├── trust_score/                  Intelligence Layer 4: combined scoring
│   │   ├── scoring.py                The trust-score formula itself (pure math, no ML model)
│   │   ├── serializers.py / views.py
│   └── valora_ml/                    Django project settings/urls
│
└── docs/                             Original project spec documents
    ├── Valora_Final_Spec_APIs.md
    └── Valora_Team_Workflow.md
```

---

## 6. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (React SPA)                        │
│                     React Router · Axios · Context                │
└───────────────────────────────┬────────────────────────────────────┘
                                 │  HTTPS/HTTP
                                 │  Authorization: Bearer <user JWT>
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                 NODE / EXPRESS  (server, port 5000)                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │   Auth     │  │  Listings  │  │ Inquiries  │  │  Wishlist   │  │
│  │ Controller │  │ Controller │  │ Controller │  │ Controller  │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘  │
│        │               │               │                │         │
│        └───────────────┴───────┬───────┴────────────────┘         │
│                                 ▼                                  │
│                     Mongoose  ↔  MongoDB (valora_v1)                │
│                                                                      │
│        On listing create/score:  listingIntelligence.js            │
│                                 │                                   │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │  HTTP (internal only)
                                  │  Authorization: Bearer <service JWT>
                                  │  { service: 'valora-node' }, 60s expiry
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│               DJANGO / DRF  (ml-service, port 8000)                 │
│                                                                      │
│   POST /predict-price/     →  price_prediction (RandomForestRegressor)│
│   POST /detect-fraud/      →  fraud_detection (RandomForestClassifier)│
│   POST /assess-condition/  →  condition_assessment (MobileNetV2 CNN) │
│   POST /trust-score/       →  trust_score (rule-based formula)       │
│                                                                      │
│   ServiceJWTAuthentication verifies every call against the SAME     │
│   JWT_SECRET Node used to sign it — the only trust boundary         │
│   between the two backends. No separate Django user/session system.│
└──────────────────────────────────────────────────────────────────┘
```

**The one rule that explains the whole architecture:** the browser only
ever talks to Node. Node is the only client Django will ever see. This
means:
- The client never needs to know ml-service exists.
- Django can be swapped, scaled, or taken down independently.
- There is exactly one place (`mlService.js`) that knows the ML API
  contract — if it changes, only one file needs updating.

### Request flow for the most important operation: creating a listing

```
Seller submits "List your car" form (with photos)
        │
        ▼
POST /api/listings  (Node)
        │
        ├─ 1. Multer saves uploaded photos to server/uploads/listings/
        ├─ 2. Listing.create() — status defaults to 'pending_review'
        │
        ▼
listingIntelligence.scoreListing(listing, seller)
        │
        ├─ (a) if photos exist → POST /assess-condition/  → visualConditionScore, detectedDamages
        ├─ (b) always          → POST /predict-price/      → predictedPriceMin/Max, confidenceLevel
        ├─ (c) always          → POST /detect-fraud/       → riskFlag, fraudProbability, reasons
        ├─ (d) always          → POST /trust-score/        → trustScore, trustBreakdown
        │        (a → b → c → d, strictly sequential — b needs a's output,
        │         c needs b's output, d needs a+b+c's output)
        ▼
listing.ml = { ...all of the above }
listing.status = ml.riskFlag === 'High' ? 'flagged' : 'active'
listing.save()
        │
        ▼
201 response with the fully-scored listing back to the browser
```

---

## 7. Frontend Workflow

1. **Entry point** (`main.jsx`) mounts `<App />` into the DOM.
2. **`App.jsx`** wraps everything in three layers, outside-in:
   - `<BrowserRouter>` — enables client-side routing.
   - `<AuthProvider>` — makes the logged-in user available everywhere via `useAuth()`.
   - `<WishlistProvider>` — makes the buyer's saved-listing IDs available everywhere via `useWishlist()`. Nested *inside* AuthProvider because it needs to know who the current user is.
3. **`AppRoutes.jsx`** defines every page as a `<Route>`, all nested inside one shared `<Layout>` (navbar + page content).
4. **Every page** follows the same pattern for data it needs from the server:
   ```jsx
   const [data, setData] = useState(initial)
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState('')

   useEffect(() => {
     fetchSomething()
       .then(setData)
       .catch(() => setError('...'))
       .finally(() => setLoading(false))
   }, [dependencies])
   ```
   This is deliberate consistency, not accidental repetition — every
   data-fetching page (`Listings`, `ListingDetail`, `SellerDashboard`,
   `AdminDashboard`, `Inquiries`, `Wishlist`, `Analytics`) reads the same
   way, which is also why they could all be tested with the same mocking
   pattern (see [Section 12](#12-every-feature-explained-step-by-step)).
5. **Service functions** (`services/*.js`) are the only place that knows an
   API URL exists — a page component calls `getListings(filters)`, never
   `axios.get('/listings')` directly. This means the API base URL, auth
   header, or response shape can change in one file without touching any
   page.
6. **Global state** (auth user, wishlist IDs) lives in React Context, not
   Redux/Zustand — the app doesn't have enough cross-cutting state to
   justify a state-management library; two `createContext()` calls cover
   everything that needs to be global (see [Section 16](#16-state-management)).

---

## 8. Backend Workflow

Every request into the Node server follows the same pipeline:

```
Incoming HTTP request
    │
    ▼
app.js middleware (in order):
    helmet()              → security headers
    cors()                → only allow the configured CLIENT_URL origin
    express.json()        → parse JSON body
    morgan('dev')         → request logging (skipped in test env)
    express.static('uploads')  → serve uploaded images directly
    │
    ▼
Router match (authRoutes / listingRoutes / inquiryRoutes / userRoutes)
    │
    ▼
Route-specific middleware chain, e.g. for POST /api/listings:
    protect                        → must have a valid JWT
    authorize('seller', 'admin')   → must be that role
    uploadListingImages.array(...) → parse multipart photos via Multer
    │
    ▼
Controller function (wrapped in asyncHandler)
    │
    ├─ reads/writes MongoDB via a Mongoose model
    ├─ may call out to ml-service via mlService.js
    │
    ▼
res.json(...) / res.status(...).send()
    │
    (if anything threw) ──────────▶ errorHandler middleware
                                         │
                                         ▼
                              consistent { message } JSON response
                              with the right HTTP status code
```

Two structural details worth calling out explicitly:

- **`asyncHandler`** exists because Express does not automatically catch
  rejected Promises thrown inside `async` route handlers — without
  wrapping every controller in it, a thrown error would crash the request
  with an unhandled rejection instead of reaching `errorHandler`.
- **`ApiError`** is a small `Error` subclass carrying an HTTP status code.
  Controllers `throw new ApiError(404, 'Listing not found')` instead of
  manually calling `res.status(404).json(...)` inline — this keeps
  "what went wrong" (business logic) separate from "how it's reported"
  (`errorHandler`'s job).

---

## 9. Authentication Flow

Valora uses **stateless JWT authentication** — no server-side session
store. There are actually **two separate, unrelated JWT systems** in this
project, and confusing them is a common point of misunderstanding:

| | User auth (Node ↔ Browser) | Service auth (Node ↔ Django) |
|---|---|---|
| Who is authenticated | A human user (buyer/seller/admin) | The Node server itself, as a trusted caller |
| Token lifetime | 7 days (`JWT_EXPIRES_IN`) | 60 seconds |
| Token payload | `{ id: user._id, role: user.role }` | `{ service: 'valora-node' }` |
| Verified by | `middleware/auth.js`'s `protect` | `core/authentication.py`'s `ServiceJWTAuthentication` |
| Where it's stored | Browser `localStorage` | Never stored — minted fresh per outgoing call |

### User login flow (step by step)

```
1. User submits email + password on the Login page
2. POST /api/auth/login  { email, password }
3. authController.login:
     a. Rejects if email/password are missing OR not strings
        (blocks NoSQL-injection payloads like {"email":{"$ne":null}})
     b. User.findOne({ email }).select('+password')
        (password has `select: false` in the schema — must opt in explicitly)
     c. bcrypt.compare(candidatePassword, user.password)
     d. If either check fails → 401 "Invalid email or password"
4. On success: jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' })
5. Response: { user: {id, name, email, role}, token }
6. Client's AuthContext.login(user, token):
     localStorage.setItem('token', token)
     localStorage.setItem('user', JSON.stringify(user))
     setUser(user)   → triggers a re-render everywhere useAuth() is used
7. Every subsequent Axios request automatically attaches:
     Authorization: Bearer <token>
   via the request interceptor in services/api.js
```

### Registration flow

Identical to login except `POST /api/auth/register`: validates
name/email/password are non-empty strings, checks no existing user has
that email (409 if so), creates the user (password is bcrypt-hashed
automatically by a Mongoose `pre('save')` hook), and immediately logs them
in (same token-issuing response shape as login — a new user doesn't have
to log in separately after registering).

### Protecting a route (server side)

```js
router.post('/', protect, authorize('seller', 'admin'), uploadListingImages.array('images', 8), createListing)
```
- `protect` reads the `Authorization` header, verifies the JWT, loads the
  full `User` document from MongoDB by the token's `id`, and attaches it
  as `req.user`. If any step fails → 401.
- `authorize(...roles)` checks `req.user.role` is in the allowed list. If
  not → 403. It **must** run after `protect`, since it depends on
  `req.user` already being set.

### Protecting a page (client side)

```jsx
<ProtectedRoute roles={['seller', 'admin']}>
  <SellerDashboard />
</ProtectedRoute>
```
`ProtectedRoute` checks `useAuth().user`: if there's no user, redirect to
`/login`; if `roles` is given and the user's role isn't in it, redirect to
`/`. This is a **UX convenience only** — it stops a logged-out user from
seeing a page that would fail anyway. It is **not** a security boundary;
the real enforcement is server-side (`protect`/`authorize`), because a
client-side check can always be bypassed by calling the API directly.

### Service-to-service authentication (Node → Django)

```
1. Node needs to call, say, POST /api/ml/predict-price/
2. mlService.js mints a fresh, short-lived token:
     jwt.sign({ service: 'valora-node' }, JWT_SECRET, { expiresIn: '60s' })
3. Sends it as: Authorization: Bearer <service-token>
4. Django's ServiceJWTAuthentication.authenticate():
     a. Requires the header to start with "Bearer "
     b. jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
     c. If valid → returns a ServiceUser stand-in (no Django user model involved)
     d. If invalid/expired → raises AuthenticationFailed → DRF returns 401
5. Only if authenticated does the view's logic (predict/detect/assess/score) run
```

The **entire trust boundary** between the two backends is this one shared
`JWT_SECRET` environment variable. If it drifts out of sync between
`server/.env` and `ml-service/.env`, every single ML call starts failing
with 401 — this is documented as a critical "don't" in `CLAUDE.md` because
it has real, immediate, whole-system-breaking consequences.

---

## 10. Database Schema

Valora uses **MongoDB** (via Mongoose) with three collections.

### `users`

| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `email` | String | required, unique, lowercased, trimmed |
| `password` | String | required, `select: false` (never returned by default), bcrypt-hashed on save |
| `role` | String enum | `buyer` \| `seller` \| `admin`, default `buyer` |
| `responseRate` | Number | default 0 — feeds the Trust Score's seller-history bonus |
| `pastDeals` | Number | default 0 — same |
| `wishlist` | [ObjectId → Listing] | managed with `$addToSet`/`$pull`, never `push`/manual filtering (guarantees no duplicate entries without extra application logic) |
| `accountAgeDays` | **virtual**, not stored | `(Date.now() - createdAt) / 1 day` — computed on read, used by the fraud-detection and trust-score ML calls |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### `listings`

| Field | Type | Notes |
|---|---|---|
| `seller` | ObjectId → User | required |
| `brand`, `model` | String | free text; search does case-insensitive partial match, not exact equality |
| `year`, `kmDriven`, `price` | Number | required |
| `fuelType` | String enum | `Petrol\|Diesel\|Electric\|CNG\|LPG\|Hybrid` |
| `transmission` | String enum | `Manual\|Automatic` |
| `description` | String | optional |
| `images` | [String] | forward-slash relative paths, e.g. `uploads/listings/173...-812.jpg`, served statically |
| `status` | String enum | `pending_review \| active \| sold \| flagged` — **set by the ML pipeline, never chosen by the seller directly** |
| `ml.visualConditionScore` | Number | from condition_assessment (0–100) |
| `ml.detectedDamages` | [{part, damageType, confidence}] | from condition_assessment |
| `ml.predictedPriceMin` / `Max` | Number | from price_prediction |
| `ml.confidenceLevel` | String | `high\|medium\|low`, from price_prediction |
| `ml.featureImportance` | Map<String, Number> | from price_prediction, per-feature importance |
| `ml.riskFlag` | String enum | `Low\|Medium\|High`, from fraud_detection |
| `ml.fraudProbability` | Number | 0–1, from fraud_detection |
| `ml.fraudReasons` | [String] | human-readable reasons, from fraud_detection |
| `ml.trustScore` | Number | 0–100, from trust_score |
| `ml.trustBreakdown` | {priceFairness, fraudRisk, conditionMatch, sellerFactor} | from trust_score |

**Index:** `{ brand: 1, model: 1, year: 1, price: 1 }` compound index —
speeds up the most common search/filter combination (browsing by
brand+model, narrowing by year/price).

**Why `ml` field names mirror Django's response 1:1** (just snake_case →
camelCase): the entire point is that Node can take Django's JSON response
and write it almost directly into the schema, with no translation layer
that could silently drop or mis-map a field.

### `inquiries`

| Field | Type | Notes |
|---|---|---|
| `listing` | ObjectId → Listing | required |
| `buyer` | ObjectId → User | required |
| `seller` | ObjectId → User | required |
| `messages` | [{ sender: ObjectId→User, text: String, timestamps }] | an embedded sub-document array — the whole conversation lives inside one Inquiry document |

**Why one Inquiry per (listing, buyer) pair, not per message:**
`createInquiry` does `Inquiry.findOne({ listing, buyer })` first and
reuses the existing thread if found, instead of creating a new document
per message. This means a buyer asking a seller three separate questions
about the same car produces **one** conversation thread with three
messages, not three separate, disconnected threads.

### Entity-Relationship diagram

```
┌───────────┐          ┌───────────┐          ┌───────────┐
│   User    │1        N│  Listing  │1        N│  Inquiry  │
│           │──────────│           │──────────│           │
│ _id       │  seller  │ _id       │ listing  │ _id       │
│ name      │          │ seller ●──┘          │ listing ●─┘
│ email     │          │ brand     │          │ buyer  ●──┐
│ password  │          │ model     │          │ seller ●──┤
│ role      │          │ ...       │          │ messages[]│
│ wishlist[]│──────────│ ml.*      │          │  {sender●─┘
│      ●────┘  (N:N,   │ status    │          │   text}   │
│  responseRate│ via    └───────────┘          └───────────┘
│  pastDeals   │ ObjectId
└───────────┘   array)
```

---

## 11. API Documentation

### 11.1 Client-facing REST API (Node, base path `/api`)

All routes except `GET /listings`, `GET /listings/:id`,
`POST /auth/register`, and `POST /auth/login` require
`Authorization: Bearer <user JWT>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | — | Create a buyer/seller account, returns user + token |
| POST | `/auth/login` | — | Authenticate, returns user + token |
| GET | `/auth/me` | any user | Returns the current user's public profile |
| GET | `/listings` | — | Browse/search active listings (query-string filters) |
| GET | `/listings/mine` | seller/admin | The current seller's own listings, any status |
| GET | `/listings/admin` | admin | All listings, any status, optional `?status=` filter |
| GET | `/listings/analytics` | seller/admin | Aggregated market-analytics data (see below) |
| GET | `/listings/:id` | — | A single listing's full detail |
| POST | `/listings` | seller/admin | Create a listing (`multipart/form-data`, up to 8 images) — triggers the ML pipeline |
| PATCH | `/listings/:id` | seller (own) / admin | Edit a listing; only admins may set `status` |
| DELETE | `/listings/:id` | seller (own) / admin | Delete a listing |
| GET | `/inquiries` | any user | All inquiries where the user is buyer OR seller |
| POST | `/inquiries` | any user | Start (or continue) a conversation about a listing |
| POST | `/inquiries/:id/messages` | buyer or seller of that inquiry | Reply to an existing thread |
| GET | `/users/me/wishlist` | any user | The current user's saved listings |
| POST | `/users/me/wishlist/:listingId` | any user | Save a listing |
| DELETE | `/users/me/wishlist/:listingId` | any user | Remove a saved listing |
| GET | `/health` | — | Liveness check, returns `{ status: 'ok' }` |

**Important routing detail:** `/listings/mine`, `/listings/admin`, and
`/listings/analytics` are registered **before** `/listings/:id` in
`listingRoutes.js`. If reordered, Express would match the literal word
`"mine"` (etc.) as the `:id` parameter instead of routing to the intended
handler — a classic Express pitfall with static-vs-dynamic route
ordering.

**`GET /listings` query parameters** (all optional, combinable):
`brand`, `model` (case-insensitive partial match), `fuelType` (exact),
`minPrice`/`maxPrice`, `minYear`/`maxYear`, `minKm`/`maxKm`,
`minTrustScore`.

**`GET /listings/analytics` response shape:**
```json
{
  "byBrand":     [{ "brand": "Honda", "avgPrice": 1500000, "count": 2 }, ...],
  "byFuelType":  [{ "fuelType": "Petrol", "avgPrice": 1500000, "count": 2 }, ...],
  "byYear":      [{ "year": 2021, "avgPrice": 1500000, "count": 1 }, ...],
  "byCondition": [{ "bucketStart": 85, "avgPrice": 1500000, "count": 2 }, ...]
}
```
Computed live via **MongoDB aggregation pipelines** over
`{ status: 'active' }` listings only — flagged, sold, and pending listings
never skew the averages.

### 11.2 Internal ML API (Node ↔ Django, base path `/api/ml`)

All four endpoints require `Authorization: Bearer <service JWT>` (see
[Section 9](#9-authentication-flow)). The client never calls these
directly.

**`POST /predict-price/`**
```
→ { brand, model, year, km_driven, fuel_type, transmission, condition_score }
← { predicted_price_min, predicted_price_max, confidence_level, feature_importance }
```
`condition_score` is optional (nullable) — a listing with no photos yet
has no visual score; the model falls back to a neutral default (70.0)
when absent. `feature_importance` is a `{feature_name: importance}` map
covering every input feature (brand, model, fuel_type, transmission,
year, km_driven, condition_score).

**`POST /detect-fraud/`**
```
→ { price, predicted_price_min, predicted_price_max, seller_account_age_days,
    has_missing_details, num_previous_listings }
← { risk_flag, fraud_probability, reasons: [] }
```
`risk_flag` is `Low` (<0.33 probability) / `Medium` (0.33–0.66) / `High`
(≥0.66). `reasons` is a list of plain-English strings the fraud model's
input features triggered (e.g. "Seller account is very new").

**`POST /assess-condition/`** (multipart form, one or more `images` files)
```
← { visual_condition_score, detected_damages: [{ part, damage_type, confidence }] }
```
`part` will be `"unknown"` unless the trained classes (from the small,
63-image real dataset) actually match what's in the photo — see
[Section 24](#24-known-limitations).

**`POST /trust-score/`**
```
→ { price_fairness_score, fraud_risk_score, condition_score,
    seller_history: { response_rate, past_deals, account_age_days } }
← { trust_score, breakdown: { price_fairness, fraud_risk, condition_match, seller_factor } }
```
Pure arithmetic — see the exact formula in
[Section 12.4](#124-trust-score-intelligence-layer-4).

All four endpoints return **503** with a `{ detail: "..." }` message if
their underlying model file hasn't been trained yet (`ModelNotTrainedError`)
— the API never fabricates a fake prediction.

---

## 12. Every Feature, Explained Step-by-Step

Each feature below follows the same format: **what it does, why it
exists, which files are responsible, which APIs are involved, which
database collections are used, and what happens internally step by
step.**

### 12.1 User Registration & Login

**What it does:** Lets a person create a `buyer` or `seller` account, or
log into an existing one, receiving a JWT that authenticates every
subsequent request.

**Why it exists:** Nothing else in the app works without knowing who the
current user is — role-based access (seller vs. buyer vs. admin) is the
foundation everything else is built on.

**Files responsible:**
- Client: `pages/Login.jsx`, `pages/Register.jsx`, `context/AuthContext.jsx`
- Server: `routes/authRoutes.js`, `controllers/authController.js`, `models/User.js`, `middleware/rateLimiters.js`

**APIs involved:** `POST /api/auth/register`, `POST /api/auth/login`,
`GET /api/auth/me`

**Database collections:** `users`

**Internal step-by-step (login):**
1. User fills the login form; `handleSubmit` calls `api.post('/auth/login', form)`.
2. `authLimiter` middleware checks this IP hasn't exceeded 20 attempts in 15 minutes.
3. `authController.login` validates both fields are non-empty strings (rejects type-confused injection attempts).
4. `User.findOne({ email }).select('+password')` — password is normally hidden by the schema; explicitly re-included here since it's needed for comparison.
5. `bcrypt.compare()` checks the password hash.
6. On success, a 7-day JWT is signed with `{ id, role }` and returned alongside the public user object.
7. Client's `AuthContext.login()` persists both to `localStorage` and updates React state, which re-renders the navbar (now showing role-specific links) and redirects to `/`.

---

### 12.2 Listing Creation (with the Full ML Pipeline)

**What it does:** Lets a seller publish a new car listing, optionally with
up to 8 photos, and automatically runs it through all four AI models
before it becomes visible to buyers.

**Why it exists:** This is the core "trust engine" feature — a listing is
never shown to a buyer un-scored.

**Files responsible:**
- Client: `pages/CreateListing.jsx`, `components/ListingForm.jsx`, `services/listings.js`
- Server: `controllers/listingController.js` (`createListing`), `middleware/upload.js`, `services/listingIntelligence.js`, `services/mlService.js`, `models/Listing.js`

**APIs involved:** `POST /api/listings` (client→Node), which internally
calls all four `/api/ml/*` endpoints (Node→Django).

**Database collections:** `listings` (write), reads the seller's own
`users` document (for `responseRate`/`pastDeals`/`accountAgeDays`).

**Internal step-by-step:**
1. Seller fills `ListingForm` (brand, model, year, km, fuel type,
   transmission, price, description) and optionally selects up to 8 image
   files.
2. `CreateListing.handleSubmit` builds a `FormData` object (required for
   file upload) and calls `createListing(formData)`.
3. Server route: `protect` → `authorize('seller','admin')` →
   `uploadListingImages.array('images', 8)` (Multer saves files to
   `server/uploads/listings/`, rejecting anything that isn't an image
   MIME type or exceeds 5 MB) → `createListing` controller.
4. `Listing.create(...)` saves the listing with `status: 'pending_review'`
   (the schema default) and image paths normalized to forward slashes.
5. `scoreListing(listing, seller)` runs, **strictly in this order** (each
   step depends on the previous one's output):
   - **If images exist:** `POST /assess-condition/` → `visualConditionScore`, `detectedDamages`.
   - **Always:** `POST /predict-price/` (using the condition score just computed, or none) → `predictedPriceMin/Max`, `confidenceLevel`, `featureImportance`.
   - **Always:** `POST /detect-fraud/` (using the predicted price range just computed, plus the seller's account age and history) → `riskFlag`, `fraudProbability`, `fraudReasons`.
   - **Always:** compute `priceFairnessScore` (how close the actual asking price is to the predicted range) and `fraudRiskScore` (`(1 - fraudProbability) * 100`) locally in Node, then `POST /trust-score/` → `trustScore`, `trustBreakdown`.
6. `listing.status = ml.riskFlag === 'High' ? 'flagged' : 'active'` — **the
   seller never chooses this.**
7. `listing.save()` persists the full `ml` sub-document.
8. `201` response returns the fully-scored listing; the client navigates
   to `/listings/:id` to show it immediately.

---

### 12.3 Browse, Search & Filter Listings

**What it does:** Lets anyone (logged in or not) browse all `active`
listings and narrow the list by brand, model, fuel type, price/year/km
range, and minimum Trust Score.

**Why it exists:** A marketplace with no search is unusable at any scale
beyond a handful of listings.

**Files responsible:** Client: `pages/Listings.jsx`. Server:
`controllers/listingController.js` (`getListings`), `utils/escapeRegex.js`.

**APIs involved:** `GET /api/listings?brand=...&fuelType=...&minPrice=...`

**Database collections:** `listings` (read only)

**Internal step-by-step:**
1. Every filter field change updates local `filters` state; a `useEffect`
   depending on `filters` re-fetches automatically (debounced only by
   React's own batching — there's no explicit debounce timer).
2. Server validates that `brand`/`model`/`fuelType` are strings (not
   objects — see [Section 15](#15-validation-and-security)), builds a
   Mongo filter object: `{ status: 'active' }` plus any provided fields.
3. Free-text fields (`brand`, `model`) become **case-insensitive partial
   match** regexes (`new RegExp(escapeRegex(value), 'i')`) — searching
   "swift" matches "Maruti Suzuki Swift". `escapeRegex` prevents both a
   crash (a literal `+` or `.` in input) and a regex-injection style
   attack.
4. Numeric ranges (`minPrice`/`maxPrice`, `minYear`/`maxYear`,
   `minKm`/`maxKm`) become `$gte`/`$lte` Mongo operators.
5. `minTrustScore` filters on `'ml.trustScore': { $gte: N }`.
6. Results sorted newest-first (`createdAt: -1`), returned as `{ listings }`.
7. Client renders one `ListingCard` per result inside a responsive grid.

---

### 12.4 Trust Score (Intelligence Layer 4)

**What it does:** Combines the outputs of the other three ML layers plus
the seller's track record into one 0–100 number shown on every listing.

**Why it exists:** A buyer shouldn't have to mentally combine "is the
price fair," "is this a scam," and "is the car actually in good shape"
themselves — Trust Score does that combination once, consistently, for
every listing.

**Files responsible:** `ml-service/trust_score/scoring.py`,
`serializers.py`, `views.py`; Node's `services/listingIntelligence.js`
(computes `priceFairnessScore`/`fraudRiskScore` before calling this).

**APIs involved:** `POST /api/ml/trust-score/`

**Database collections:** none directly (pure computation) — the result
is written into `listings.ml.trustScore`/`trustBreakdown`.

**The formula:**
```
trust_score = min(100, round(
    0.4 × price_fairness_score +
    0.3 × fraud_risk_score +
    0.3 × condition_score +
    seller_bonus
, 2))

seller_bonus = min(5.0,
    (response_rate / 100) × 1.0 +
    min(past_deals, 10) / 10 × 0.5 +
    min(account_age_days, 365) / 365 × 1.0
)
```
**Worked example** (matches the original spec exactly):
inputs `price_fairness=95, fraud_risk=90, condition=85`,
seller history `{response_rate: 92, past_deals: 5, account_age_days: 180}`
→ `trust_score = 92.16`, breakdown
`{price_fairness: 38.0, fraud_risk: 27.0, condition_match: 25.5, seller_factor: 1.66}`.

**Internal step-by-step:**
1. Node computes `priceFairnessScore`: 100 if the asking price falls
   inside the predicted min/max range; otherwise it decays linearly the
   further outside the range the price is.
2. Node computes `fraudRiskScore = (1 - fraudProbability) × 100` — i.e.
   this is a "safety" score, the inverse of risk.
3. `conditionScore` is the CNN's `visualConditionScore`, or `100` if the
   listing has no photos (absence of damage evidence is treated as
   neutral-positive, not penalized).
4. Node sends all three plus the seller's history to `/trust-score/`.
5. `TrustScoreRequestSerializer` validates all scores are 0–100 and the
   seller-history sub-object is well-formed.
6. `scoring.compute()` runs the formula above and returns both the final
   score and its full breakdown (so the UI can show *why* a listing has
   the score it does, not just the number).

**Note documented deliberately in code:** the three seller-bonus
components mathematically max out at `1.0 + 0.5 + 1.0 = 2.5`, meaning
`MAX_SELLER_BONUS = 5.0` can never actually be reached given the current
weights. This is intentional headroom (a safety ceiling), not a bug — but
it means the bonus in practice never exceeds 2.5 points.

---

### 12.5 Price Prediction (Intelligence Layer 1)

**What it does:** Predicts a fair price **range** (not a single number)
for a car based on its brand, model, year, mileage, fuel type,
transmission, and visual condition score.

**Why it exists:** Sellers currently guess prices; buyers have no
independent reference point. A predicted range with a confidence level is
more honest than a single point estimate, and directly demonstrates the
regression unit of the syllabus.

**Files responsible:**
`ml-service/price_prediction/{prepare_data,preprocessing,train,inference,serializers,views}.py`

**APIs involved:** `POST /api/ml/predict-price/`

**Database collections:** none directly — result written into
`listings.ml.predictedPriceMin/Max/confidenceLevel/featureImportance`.

**Model:** `RandomForestRegressor` (200 trees) fit on `log(price)`
(prices are heavily right-skewed — a handful of very expensive cars next
to a mass of cheaper ones — log-transforming the target measurably
improved fit quality). Trained on the real, cleaned CarDekho Kaggle
dataset (~15,000 rows after deduplication). Achieves **test R² = 0.89**
(up from R² = 0.71 with a plain linear regression on the same features —
brand/model depreciation isn't additive, which a tree ensemble captures
and a linear model structurally cannot).

**Internal step-by-step:**
1. `request_to_dataframe()` turns the validated request into a
   single-row DataFrame matching the exact column order the fitted
   pipeline expects; a missing `condition_score` defaults to `70.0` (a
   listing with no photos yet still needs *some* numeric value fed to the
   model).
2. The fitted `ColumnTransformer` one-hot encodes `brand`/`model`/
   `fuel_type`/`transmission` and passes `year`/`km_driven`/
   `condition_score` straight through.
3. The Random Forest predicts a point estimate in log-space.
4. `predicted_price_min/max = exp(point_estimate ± residual_std_log)` —
   the training residual's standard deviation defines how wide the
   returned range is.
5. `confidence_level` is derived from that same residual spread: `< 0.05`
   → `high`, `< 0.15` → `medium`, else `low`.
6. `feature_importance` aggregates the forest's `feature_importances_`
   back down to one value per **original** field (summing all of a
   categorical feature's one-hot columns into a single number), so the
   API returns one importance score per brand/model/fuel_type/
   transmission/year/km_driven/condition_score rather than per
   individual brand value.

**Important documented caveat:** `condition_score` in the *training*
data is **synthetic** (a function of vehicle age and mileage plus noise) —
the real, tabular CarDekho dataset has no genuine visual condition field.
An EDA heatmap (`price_prediction/eda.py`) confirms a 0.81 correlation
between the synthetic `condition_score` and `year`, direct visual
confirmation that this feature is currently a proxy for age, not an
independent visual signal, during training. At **inference** time, real
listings that have gone through the CNN do supply a genuine
`visualConditionScore` — the caveat is specifically about what the model
learned *from*, not what it's fed at prediction time.

---

### 12.6 Fraud / Anomaly Detection (Intelligence Layer 2)

**What it does:** Flags every new listing as `Low`/`Medium`/`High` fraud
risk based on price deviation, seller account age, missing details, and
listing history.

**Why it exists:** Buyers can't distinguish a genuine listing from a scam
before wasting time contacting the seller; auto-flagging suspicious
listings for admin review closes that gap.

**Files responsible:**
`ml-service/fraud_detection/{generate_synthetic_data,preprocessing,train,inference,serializers,views}.py`

**APIs involved:** `POST /api/ml/detect-fraud/`

**Database collections:** none directly — result feeds
`listings.ml.riskFlag/fraudProbability/fraudReasons`, and (critically)
**decides `listings.status`** in `listingIntelligence.js`.

**Model:** `RandomForestClassifier` (200 trees), trained on a
**synthetically generated** labeled dataset (2,000 samples, 15% fraud
rate, 5% label noise so the classes aren't perfectly separable). The
project's own spec explicitly permits synthetic labels here — no
real-world "confirmed scam listing" dataset exists to train on, so
generating one with a known, plausible generating process (fraudulent
listings skew toward extreme price deviation, brand-new accounts, missing
details, and no history) is the documented, intentional approach.

**Internal step-by-step:**
1. Node computes `has_missing_details` (true if the listing has no
   description) and reads the seller's `accountAgeDays` (virtual field)
   and `pastDeals`.
2. `price_deviation_ratio(price, predicted_min, predicted_max)` computes
   how far outside the ML-predicted fair-price range the actual asking
   price sits, as a ratio (0 if inside the range).
3. `FraudDetectionRequestSerializer` validates all fields (non-negative
   numbers, boolean flag).
4. The trained classifier predicts a fraud probability from these
   features.
5. `_risk_flag()`: `≥0.66` → `High`, `≥0.33` → `Medium`, else `Low`.
6. `_reasons()` independently checks each individual feature against a
   threshold (price deviation `> 0.5`, missing details, account age
   `< 7` days, zero previous listings) and returns a plain-English reason
   string for each one that applies — giving the admin (and eventually
   the buyer) an explainable "why" instead of just a bare number.
7. Back in Node: if `riskFlag === 'High'`, the listing's `status` becomes
   `'flagged'` instead of `'active'` — it will not appear in public
   browse/search results until an admin reviews and approves it.

---

### 12.7 Condition Assessment (Intelligence Layer 3 — CNN)

**What it does:** Analyzes uploaded listing photos to detect visible
damage (dents, scratches, broken parts) and produce a 0–100 visual
condition score.

**Why it exists:** "Good condition" claims in listing text are currently
unverifiable without an in-person visit — this is the single most
demo-friendly feature, visibly showing AI "looking at" a photo and
reacting to it.

**Files responsible:**
`ml-service/condition_assessment/{prepare_data,preprocessing,train,inference,views}.py`

**APIs involved:** `POST /api/ml/assess-condition/` (multipart, one or
more image files)

**Database collections:** none directly — result feeds
`listings.ml.visualConditionScore/detectedDamages`.

**Model:** Transfer learning on **MobileNetV2** (pretrained on ImageNet).
The last 50 of its 154 layers are fine-tuned (not the whole network, and
not fully frozen) at a low learning rate, on top of a class-weighted
binary cross-entropy loss — see the reasoning below. Trained on a
genuinely small, real dataset: **63 images across 8 (damage_type, part)
classes**, built by pairing two separate Kaggle datasets (one had the
LabelMe part+damage annotations, the other had the actual source photos —
confirmed to be the same underlying 1024×1024 images by matching
filenames and pixel dimensions).

**Internal step-by-step:**
1. Seller's uploaded image files are read directly from the multipart
   request (`request.FILES.getlist('images')`); if none were provided,
   the view returns `400` immediately.
2. `batch_from_files()` resizes every image to 224×224 (MobileNetV2's
   expected input size) and normalizes pixel values to `[0, 1]`.
3. The model predicts a probability for each of the 8
   (damage_type, part) classes, independently (this is a **multi-label**
   problem — a photo can show a dent AND a scratch at once, so the output
   layer uses `sigmoid`, not `softmax`).
4. Any class scoring `≥ 0.5` confidence is included in `detected_damages`.
5. `visual_condition_score = 100 × (1 - average_confidence_of_detected_damages)`
   — no detected damage at all → a perfect 100 score.
6. Back in Node, this score both displays directly to the buyer and feeds
   into both `predictPrice` (as `condition_score`) and `getTrustScore` (as
   `conditionScore`).

**Why class-weighted loss + partial fine-tuning, specifically:** with only
63 images across 8 classes — one of which (`broken_windshield`) has a
single positive example in the *entire* dataset — a naive model can score
misleadingly high on plain `binary_accuracy` just by always predicting
"no damage" on rare classes. Evaluating instead with **macro
precision/recall/F1** (each class weighted equally regardless of how rare
it is) exposed this: a fully-frozen backbone with unweighted loss scored
macro-F1 ≈ 0.09. Weighting each class's loss inversely to its frequency,
combined with fine-tuning (not freezing) the last 50 layers so the
network can adapt its features to car-damage-specific texture cues rather
than staying at generic ImageNet features, roughly doubled that to
macro-F1 ≈ 0.19 (measured via repeated 5-fold cross-validation, not a
single lucky split). This is still low in absolute terms — see
[Section 24](#24-known-limitations) — but it is a real, measured
improvement over the naive baseline, not just a differently-drawn
train/test split.

---

### 12.8 Contacting a Seller (Inquiry Creation)

**What it does:** Lets a logged-in buyer send a message to a listing's
seller, starting (or continuing) a private conversation about that car.

**Why it exists:** The whole point of Trust Score/price/fraud/condition
signals is to help a buyer decide whether it's worth actually talking to
the seller — this is that next step.

**Files responsible:** Client: `pages/ListingDetail.jsx`,
`services/inquiries.js`. Server: `controllers/inquiryController.js`
(`createInquiry`), `models/Inquiry.js`, `services/emailService.js`.

**APIs involved:** `POST /api/inquiries`

**Database collections:** `inquiries` (read+write), `listings` (read, to
find the seller), `users` (read, for the seller's email)

**Internal step-by-step:**
1. `ListingDetail` shows the contact form only if: the user is logged in,
   is **not** an admin, and is **not** the listing's own seller
   (`canContactSeller` computed from those three conditions).
2. Buyer types a message and submits; `createInquiry(listingId, text)`
   calls the API.
3. Server looks up the listing (to find the seller), then
   `Inquiry.findOne({ listing, buyer })` — **reuses** an existing thread
   if the buyer has already messaged about this listing before, rather
   than creating a duplicate conversation.
4. If no thread exists, one is created; either way, the new message is
   pushed into `messages[]` and saved.
5. `sendMail()` fires an email notification to the seller — **fire and
   forget**: the promise's rejection is caught and logged, but the
   inquiry API response doesn't wait on or fail because of a slow/down
   SMTP server.
6. Client shows "Message sent" and a link to `/inquiries`.

---

### 12.9 Buyer–Seller Chat (Replying to an Inquiry)

**What it does:** Lets either party in an existing conversation send
follow-up messages, viewed as a simple chat thread.

**Why it exists:** A single-message inquiry isn't a conversation — buyers
and sellers need back-and-forth to actually negotiate/clarify details.

**Files responsible:** Client: `pages/Inquiries.jsx`. Server:
`controllers/inquiryController.js` (`getMyInquiries`, `addMessage`).

**APIs involved:** `GET /api/inquiries`, `POST /api/inquiries/:id/messages`

**Database collections:** `inquiries`

**Internal step-by-step:**
1. On page load, `getMyInquiries()` fetches every inquiry where the
   current user is **either** the buyer or the seller
   (`$or: [{buyer}, {seller}]`), populated with listing/buyer/seller
   summary fields, newest-updated first.
2. The first inquiry in the list is auto-selected so the page never opens
   to an empty pane.
3. The thread list shows "with `<other party's name>`" — computed per
   inquiry by comparing `inquiry.buyer._id` to the current user's id and
   picking whichever party *isn't* them.
4. Sending a reply: `addMessage(inquiryId, text)` → server verifies the
   current user is actually the buyer **or** seller of that specific
   inquiry (`403` otherwise — this is the real access control, not just a
   UI convenience), pushes the message, saves, and **notifies whichever
   party did not just send it** (buyer replies → seller is emailed, and
   vice versa) — this bidirectional notification was added specifically
   because the original inquiry-creation flow only ever notified the
   seller, leaving replies silent otherwise.
5. Client replaces the updated inquiry in local state (no full re-fetch
   needed) and clears the reply input.
6. Messages render left/right-aligned based on whether `msg.sender`
   matches the current user's id.

---

### 12.10 Wishlist (Save/Unsave Listings)

**What it does:** Lets any logged-in user save listings to a personal
list and remove them later, with an instant (optimistic) UI response.

**Why it exists:** Comparison-shopping across many listings needs a way
to bookmark ones worth revisiting.

**Files responsible:** Client: `context/WishlistContext.jsx`,
`components/WishlistButton.jsx`, `pages/Wishlist.jsx`,
`services/wishlist.js`. Server: `controllers/userController.js`,
`routes/userRoutes.js`, `models/User.js`.

**APIs involved:** `GET /api/users/me/wishlist`,
`POST /api/users/me/wishlist/:listingId`,
`DELETE /api/users/me/wishlist/:listingId`

**Database collections:** `users` (the `wishlist` array of ObjectIds),
`listings` (populated for display)

**Internal step-by-step:**
1. `WishlistProvider` (wrapping the whole app) fetches the current
   user's wishlist IDs once, whenever the logged-in user changes — logged
   out means an empty `Set`, no API call made at all.
2. Clicking a heart icon (`WishlistButton`) calls `toggle(listingId)`:
   - The UI updates **immediately** (adds/removes the ID from local
     `Set` state) — "optimistic" because the request rarely fails and
     waiting for it first would make the heart feel laggy.
   - The actual `addToWishlist`/`removeFromWishlist` API call fires in
     the background.
   - If it fails, the local change is **reverted** (added back / removed
     again) so the UI never lies about what's actually saved server-side.
3. Server-side: `$addToSet`/`$pull` on the user's `wishlist` array —
   `$addToSet` specifically guarantees no duplicate entries even if the
   button is somehow clicked twice in quick succession, without any extra
   application-level duplicate-checking.
4. The `Wishlist` page fetches the full listing objects for display, then
   filters them against the **shared** `wishlistIds` from context (not
   just its own fetch) — so unsaving a listing from this page removes its
   card immediately, without waiting for a full page reload.
5. A wishlisted listing that's since been deleted leaves a `null` in the
   populated array (Mongoose's default `populate` behavior for a
   dangling reference) — `getWishlist` filters those out before
   responding, so the client never has to handle a null listing.

---

### 12.11 Seller Dashboard (Manage Own Listings)

**What it does:** Lets a seller see every listing they've posted
(regardless of status), and edit or delete any of them.

**Why it exists:** A seller needs to manage their own inventory —
correcting a price, updating a description, or pulling a sold car —
without needing admin access.

**Files responsible:** Client: `pages/SellerDashboard.jsx`,
`pages/EditListing.jsx`, `components/ListingForm.jsx`. Server:
`controllers/listingController.js` (`getMyListings`, `updateListing`,
`deleteListing`).

**APIs involved:** `GET /api/listings/mine`, `PATCH /api/listings/:id`,
`DELETE /api/listings/:id`

**Database collections:** `listings`

**Internal step-by-step:**
1. `getMyListings` returns every listing where `seller === req.user._id`,
   any status, newest first — this is deliberately unfiltered by status
   (unlike public browse) so a seller can see their own flagged/pending
   listings too.
2. Editing: `EditListing` loads the listing, checks ownership
   client-side (redundant with, not a replacement for, server-side
   ownership checks), pre-fills `ListingForm` with `showImages={false}`
   (photos aren't editable after creation in this flow), and submits a
   `PATCH` with only the changed textual/numeric fields.
3. Server's `updateListing` re-checks ownership (`isOwner` or
   `role === 'admin'`), then applies **only** the fields in a fixed
   whitelist (`SELLER_UPDATE_FIELDS`) — never a raw
   `Object.assign(listing, req.body)`, which would let a malicious PATCH
   body overwrite protected fields like `seller`, `ml`, or `_id`.
4. **Critical, deliberate behavior:** editing a listing does **not**
   re-run the ML pipeline. A seller lowering a flagged listing's price
   does not automatically clear the flag — only an admin approving it
   does. `EditListing.jsx` shows an explicit warning about this so
   sellers aren't confused about why their edit didn't un-flag anything.
5. Deleting asks for confirmation (`window.confirm`), then calls
   `DELETE /api/listings/:id`; server checks ownership/admin the same way
   before removing the document.

---

### 12.12 Admin Dashboard (Listing Moderation)

**What it does:** Lets an admin see every listing regardless of status,
filter by status, approve a flagged/pending listing, or permanently
remove any listing.

**Why it exists:** The fraud-detection layer auto-flags suspicious
listings instead of blocking them outright — a human still has to make
the final call, and needs a dedicated view to do it.

**Files responsible:** Client: `pages/AdminDashboard.jsx`. Server:
`controllers/listingController.js` (`getAdminListings`, reuses
`updateListing`/`deleteListing`).

**APIs involved:** `GET /api/listings/admin?status=...`,
`PATCH /api/listings/:id` (with `{ status: 'active' }`),
`DELETE /api/listings/:id`

**Database collections:** `listings`

**Internal step-by-step:**
1. `getAdminListings` (admin-only, enforced by `authorize('admin')`)
   returns all listings, populated with seller name/email so the admin
   can see who posted what, optionally filtered by exact `status`.
2. The status dropdown re-fetches on every change (`useEffect([status])`).
3. "Approve" button (shown for any non-`active` listing) calls
   `PATCH /api/listings/:id` with `{ status: 'active' }` — this is the
   **only** path by which a flagged listing becomes visible again; note
   from [12.11](#1211-seller-dashboard-manage-own-listings) that editing
   never does this automatically, and only an admin (via `authorize`) is
   even allowed to set `status` in the PATCH body at all.
4. "Remove" permanently deletes the listing after a confirm dialog.
5. Both actions update the local list in place (no full reload) for
   responsiveness.

---

### 12.13 Market Analytics Dashboard

**What it does:** Shows four live charts — average price by brand, by
fuel type, by year (a depreciation trend), and by condition-score bucket
— computed over the **live, current** marketplace, updating as listings
are added.

**Why it exists:** The original spec called for "Plotly/Dash" analytics;
this was deliberately substituted with Node's own MongoDB aggregation
framework + React/Chart.js, avoiding standing up a third server (Dash is
a full separate Python web framework) with its own auth/deployment story,
for a feature that's fundamentally just charts over data Node already
owns.

**Files responsible:** Client: `pages/Analytics.jsx`. Server:
`controllers/analyticsController.js`.

**APIs involved:** `GET /api/listings/analytics`

**Database collections:** `listings` (read-only, aggregation queries)

**Internal step-by-step:**
1. Four **MongoDB aggregation pipelines** run in parallel
   (`Promise.all`), each scoped to `{ status: 'active' }` only:
   - `$group` by brand / fuel type / year → `$avg` price, `$sum` count → `$sort` → `$project` to rename fields.
   - The condition-score chart uses `$bucket` (grouping into ranges
     `[0,50)`, `[50,70)`, `[70,85)`, `[85,100.1)`) after first `$match`ing
     only listings that actually have a numeric `visualConditionScore` —
     listings never assessed (no photos) are excluded rather than
     silently coerced into a bucket.
2. Client renders each result array into a Chart.js `Bar` or `Line`
   component, with a shared tooltip formatter that displays prices in
   Indian Rupee format.
3. If every group comes back empty (no active listings yet), the page
   shows a "not enough data yet" message instead of four blank charts.

---

## 13. User Roles Explained

| Role | Can do | Cannot do |
|---|---|---|
| **Buyer** (default role on signup) | Browse/search listings, view full listing detail, save/unsave wishlist items, contact a seller, reply within their own inquiries | Create/edit/delete listings, see the admin or seller dashboard, approve/flag listings |
| **Seller** | Everything a buyer can, **plus**: create listings, view/edit/delete their own listings (`/my-listings`), view the market analytics dashboard | Edit/delete another seller's listings, change a listing's `status`, access the admin dashboard |
| **Admin** | Everything a seller can, **plus**: view/edit/delete *any* listing (`/listings/admin`), change any listing's `status` (approve/flag), access `/admin` | Nothing is restricted for an admin within this app's scope — admin is the highest privilege level |

**Role assignment:** chosen at registration (`buyer` or `seller` only — a
user cannot self-register as `admin`; the schema defaults to `buyer` if
an invalid value is sent). Admin accounts exist only via direct database
seeding (`server/src/scripts/seed.js` creates one).

**Enforcement is always server-side**, via `authorize(...roles)`
middleware on each route — the client's `ProtectedRoute` component only
improves UX by redirecting before a doomed request is even made; it is
never the actual security boundary.

---

## 14. Complete Application Flow (End-to-End)

A realistic walkthrough tying every feature above together:

```
1. Rohan registers as a SELLER
      → POST /api/auth/register → JWT issued, logged in immediately

2. Rohan lists his Honda City with 3 photos
      → POST /api/listings (multipart)
      → Multer saves 3 images
      → scoreListing() runs: condition → price → fraud → trust-score
      → riskFlag comes back "Low" → status = "active"
      → Listing is now publicly visible

3. Priya (a BUYER, not yet registered) visits the site
      → GET /api/listings (no auth needed) — sees the Honda City

4. Priya registers as a BUYER, logs in
      → JWT issued

5. Priya opens the Honda City's detail page
      → GET /api/listings/:id
      → sees price range, risk flag, condition score, and Trust Score
      → clicks the heart icon to save it
           → POST /api/users/me/wishlist/:id  ($addToSet)
      → sends a message: "Is the price negotiable?"
           → POST /api/inquiries
           → new Inquiry document created; Rohan gets an email

6. Rohan checks /inquiries, sees Priya's message, replies
      → POST /api/inquiries/:id/messages
      → Priya gets an email notification

7. Rohan later lowers the price slightly via /my-listings/:id/edit
      → PATCH /api/listings/:id (whitelisted fields only)
      → ML pipeline does NOT re-run — status/ml fields are untouched

8. An admin logs in, checks /admin
      → GET /api/listings/admin (sees this and every other listing)
      → nothing here needs action (this listing was never flagged)

9. Anyone with a seller or admin role checks /analytics
      → GET /api/listings/analytics
      → sees this listing's price contributing to the "Honda" and
        "Petrol" and "2021" and "condition 85-100" averages
```

---

## 15. Validation and Security

| Concern | How it's handled | Where |
|---|---|---|
| **Password storage** | bcrypt hash (10 salt rounds), never stored/returned in plaintext; schema field has `select: false` | `models/User.js` |
| **NoSQL injection (type confusion)** | Every value that reaches a Mongo query filter (login/register email+password, listing search's brand/model/fuelType/status) is explicitly type-checked as a string before use — blocks payloads like `{"email": {"$ne": null}}`, which are truthy but not strings | `authController.js`, `listingController.js` |
| **Regex injection / crash** | User search input is escaped (`escapeRegex`) before being embedded in a `RegExp` — prevents both a thrown error on special characters and a maliciously crafted catastrophic-backtracking pattern | `utils/escapeRegex.js` |
| **Authorization boundary on updates** | `updateListing` uses a fixed field whitelist, never `Object.assign(listing, req.body)` — a PATCH body can never overwrite `seller`, `ml`, `_id`, or set `status` unless the caller is an admin | `listingController.js` |
| **Ownership checks** | Every mutate/delete endpoint re-verifies `String(resource.owner) === String(req.user._id)` OR admin role, server-side, regardless of what the client believes | `listingController.js`, `inquiryController.js` |
| **Rate limiting** | 20 requests / 15 minutes on `/auth/register` and `/auth/login`, blunting brute-force and registration spam (skipped automatically when `NODE_ENV=test`) | `middleware/rateLimiters.js` |
| **Security headers** | `helmet()` applied globally — sane defaults for clickjacking protection, disabling risky legacy browser features, etc. | `app.js` |
| **CORS** | Explicit allow-list of the configured client origin only (`CLIENT_URL`), not a wildcard | `app.js` |
| **File upload safety** | Multer rejects any file whose MIME type doesn't start with `image/`; caps file size (5 MB) and count (8 files) | `middleware/upload.js` |
| **Service-to-service auth** | Every Django ML endpoint requires a valid, short-lived (60s) JWT signed with the shared secret — an external caller without that secret gets 401 | `mlService.js` (Node), `core/authentication.py` (Django) |
| **Correct 401 vs. 403 semantics** | Django's custom `ServiceJWTAuthentication` implements `authenticate_header()` — without it, DRF silently downgrades every authentication failure to a 403 instead of the correct 401 | `core/authentication.py` |
| **Centralized error responses** | All thrown errors funnel through one `errorHandler`, so an unhandled exception never leaks a raw stack trace to the client — it always becomes a clean `{ message }` JSON response | `middleware/errorHandler.js` |
| **Test database isolation** | `server/.env.test`'s `MONGODB_URI` must point at a `_test`-suffixed database — the test setup throws on purpose if it doesn't, to prevent accidentally wiping real dev/seed data | `tests/setup.js` |

---

## 16. State Management

Valora uses **only React's built-in Context API** — no Redux, Zustand, or
other external state library. This is a deliberate, appropriately-scoped
choice: the app has exactly two pieces of state that genuinely need to be
global.

| Context | Provides | Why it needs to be global |
|---|---|---|
| **`AuthContext`** | `user`, `login(userData, token)`, `logout()` | The navbar, every protected route, and every page that needs to know "who is this" would otherwise need this passed down manually through many component layers |
| **`WishlistContext`** | `wishlistIds` (a `Set`), `toggle(listingId)` | A listing's saved/unsaved heart state needs to stay in sync across `ListingCard` (in Listings), `ListingDetail`, and the `Wishlist` page itself — all showing the *same* underlying data simultaneously |

Everything else (form inputs, loading/error flags, a page's fetched data)
is **local component state** via `useState`, because nothing outside that
one page ever needs to read it. This is a conscious choice, not an
oversight — introducing a global store for state that's only ever read in
one place would be unnecessary complexity.

`AuthContext` also handles **persistence**: on load, it reads
`localStorage.getItem('user')` to restore the session without requiring
re-login on every page refresh (the JWT itself is separately persisted
and reattached to every request by the Axios interceptor).

---

## 17. Routing

**Client-side** (`react-router-dom`, `BrowserRouter`): every route is
declared once, in `routes/AppRoutes.jsx`, nested inside a shared
`<Layout>` that renders the navbar plus an `<Outlet />` for the current
page. Route protection is composable —
`<ProtectedRoute roles={[...]}><Page/></ProtectedRoute>` wraps any page
that needs auth, with an optional role restriction.

| Path | Page | Protection |
|---|---|---|
| `/` | Home | none |
| `/login`, `/register` | Login, Register | none |
| `/listings` | Listings (browse) | none |
| `/listings/:id` | ListingDetail | none |
| `/sell` | CreateListing | seller, admin |
| `/my-listings` | SellerDashboard | seller, admin |
| `/my-listings/:id/edit` | EditListing | seller, admin |
| `/inquiries` | Inquiries | any logged-in user |
| `/wishlist` | Wishlist | any logged-in user |
| `/analytics` | Analytics | seller, admin |
| `/admin` | AdminDashboard | admin only |
| `*` | NotFound | none |

**Server-side** (Express `Router` per resource, mounted in `app.js`):
`/api/auth`, `/api/listings`, `/api/inquiries`, `/api/users`. Within
`listingRoutes.js`, static paths (`/mine`, `/admin`, `/analytics`) are
registered **before** the dynamic `/:id` path — a well-known Express
gotcha where route order matters, since Express matches routes top to
bottom and a dynamic segment would otherwise swallow those literal words.

---

## 18. File Upload Flow

```
Browser: <input type="file" multiple> in ListingForm
    │  (user selects up to 8 images)
    ▼
CreateListing.handleSubmit builds a FormData object:
    formData.append('brand', ...)  ... (every text field)
    formData.append('images', file)  (once per selected image)
    │
    ▼
POST /api/listings, Content-Type: multipart/form-data
    │
    ▼
Express route middleware: uploadListingImages.array('images', 8)
    │  (Multer)
    ├─ fileFilter: rejects any file whose mimetype isn't image/*  → 400
    ├─ limits: 5 MB per file, 8 files max
    ├─ diskStorage:
    │     destination: server/uploads/listings/
    │     filename: `${Date.now()}-${random}${extension}`  (collision-safe)
    ▼
req.files now holds each saved file's metadata (including its disk path)
    │
    ▼
createListing controller:
    images: req.files.map(f => f.path.replace(/\\/g, '/'))
    │   (Windows uses backslashes in file.path; these get served as URL
    │    fragments over HTTP, so they're normalized to forward slashes)
    ▼
Listing.images = ['uploads/listings/1735...-812.jpg', ...]
    │
    ▼
Serving them back out:
    app.use('/uploads', express.static('uploads'))
    → client renders <img src={`${ASSET_BASE_URL}/${img}`} />
```

The same uploaded image paths are also what get streamed (via
`fs.createReadStream`) into the multipart request Node sends to Django's
`/assess-condition/` endpoint during the ML pipeline.

---

## 19. Error Handling

**Server side — one central handler, three input sources:**
```js
export default function errorHandler(err, req, res, next) {
  if (err instanceof ApiError)         return res.status(err.statusCode).json({ message: err.message })
  if (err.name === 'ValidationError')  return res.status(400).json({ message: err.message })   // Mongoose schema validation
  if (err.name === 'CastError')        return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` }) // bad ObjectId, etc.
  if (err.code === 11000)              return res.status(409).json({ message: 'Duplicate value', fields: err.keyValue }) // unique index violation
  console.error(err)
  return res.status(500).json({ message: 'Internal server error' })
}
```
Every controller is wrapped in `asyncHandler`, which catches any rejected
Promise and forwards it to this handler via `next(err)` — a controller
never needs its own `try/catch` for this purpose; it just `throw`s an
`ApiError` (or lets a Mongoose/Mongo error propagate) and the response
shape is guaranteed consistent regardless of what actually went wrong.

**Django side:** each ML view catches its own `ModelNotTrainedError` and
returns a clean `503 { detail: "..." }` — the API never fabricates a fake
prediction just because the underlying model file doesn't exist yet.
DRF's serializers handle field-validation errors automatically, returning
`400` with a field-by-field error message.

**Client side:** every data-fetching page follows the same
`try/catch`-via-`.catch()` pattern, setting a local `error` string state
that's rendered as a plain error message — no global error boundary or
toast system; each page owns and displays its own failure state,
consistent with the "local state where possible" philosophy from
[Section 16](#16-state-management).

---

## 20. Environment Variables

### `client/.env`
| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Base URL the client's Axios instance targets | `http://localhost:5000/api` |

### `server/.env`
| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Port Express listens on | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/valora_v1` |
| `JWT_SECRET` | Signs/verifies **both** user JWTs and the Node→Django service JWT — **must match `ml-service/.env`'s `JWT_SECRET` exactly** | a long random string |
| `JWT_EXPIRES_IN` | User session token lifetime | `7d` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |
| `ML_SERVICE_URL` | Base URL for the internal ML API client | `http://localhost:8000/api/ml` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Nodemailer transport config — use Ethereal for a free dev sandbox that never delivers real mail | see README's Email section |

### `server/.env.test`
Same shape as `.env`, but `MONGODB_URI` **must** point at a
`_test`-suffixed database — `tests/setup.js` refuses to run otherwise, to
avoid accidentally wiping real data.

### `ml-service/.env`
| Variable | Purpose | Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django's own internal cryptographic secret (sessions/CSRF — not used for the ML API auth) | a long random string |
| `DJANGO_DEBUG` | Django debug mode toggle | `True` (dev) |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hostnames | `localhost,127.0.0.1` |
| `JWT_SECRET` | **Must exactly match `server/.env`'s `JWT_SECRET`** | same string as above |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origin(s) — effectively just Node's own origin, since the client never calls this service | `http://localhost:5000` |

---

## 21. Installation

**Prerequisites:** Node.js (LTS), Python **3.13 specifically** (not 3.14 —
TensorFlow has no 3.14 wheels as of this writing), MongoDB running
locally (or an Atlas connection string), `git`.

```bash
git clone https://github.com/arshalankhan04-creator/Valora_V1.git
cd Valora_V1
```

### Client
```bash
cd client
npm install
cp .env.example .env
```

### Server
```bash
cd server
npm install
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, SMTP_* etc.
cp .env.test.example .env.test   # for running the test suite
```

### ml-service
```bash
cd ml-service
py -3.13 -m venv venv          # must be 3.13, not plain `python`
venv\Scripts\activate          # Windows; `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env         # fill in JWT_SECRET (must match server/.env)
python manage.py migrate
```

**Training the ML models** (trained model artifacts are already committed
to the repo, so this is only needed to retrain from scratch):
```bash
# price_prediction — needs cardekho_dataset.csv in price_prediction/data/
python -m price_prediction.prepare_data
python -m price_prediction.train

# fraud_detection — synthetic data, no external dataset needed
python -m fraud_detection.generate_synthetic_data
python -m fraud_detection.train

# condition_assessment — needs both Kaggle datasets in condition_assessment/data/
python -m condition_assessment.prepare_data
python -m condition_assessment.train
```

**Seeding demo data:**
```bash
cd server
npm run seed
```

---

## 22. Running Locally

Three separate processes, each in its own terminal:

```bash
# Terminal 1 — ml-service (Django)
cd ml-service
venv\Scripts\activate
python manage.py runserver 8000

# Terminal 2 — server (Node/Express)
cd server
npm run dev          # nodemon, auto-restarts on file changes

# Terminal 3 — client (React/Vite)
cd client
npm run dev          # opens on http://localhost:5173
```

Visit `http://localhost:5173`. Log in with a seeded account (see
`server/src/scripts/seed.js` — every seeded user's password is
`password123`), or register a new one.

**Running the test suites:**
```bash
cd server && npm test          # 46 tests, Vitest + Supertest
cd client && npm test          # 94 tests, Vitest + React Testing Library
cd ml-service && venv\Scripts\activate && python manage.py test   # 34 tests
```

---

## 23. Future Improvements

These are genuine, not-yet-built extensions — distinct from the
deliberately-declined items in [Section 24](#24-known-limitations).

1. **Larger, real condition-assessment training data** — the single
   biggest lever on CNN quality; 63 images is a proof-of-concept ceiling,
   not a modeling limitation.
2. **Real-time chat (Socket.io)** — inquiries currently work over plain
   REST with client-side polling; live-updating chat would improve the
   buyer-seller messaging experience.
3. **Depreciation forecasting** — a time-series estimate of a specific
   car's resale value 1–2 years out (explicitly scoped as a stretch goal
   in the original spec).
4. **Agentic AI negotiation assistant** — an LLM-backed agent that
   negotiates within the ML-predicted fair-price range on a buyer's
   behalf (explicitly the project's own documented "Phase 2").
5. **Cloud image hosting (e.g. Cloudinary)** — would replace local disk
   storage for uploaded photos, relevant primarily if/when the project is
   ever deployed.
6. **Location-aware search** — a map view or distance-based filtering
   (the original spec mentions Google Maps/OpenStreetMap as an optional
   enhancement).

---

## 24. Known Limitations

Stated plainly, because a viva panel will ask about these directly, and
"we knew and made a deliberate call" is a stronger answer than being
caught by surprise.

1. **`condition_assessment`'s CNN is proof-of-concept quality**, not
   production-grade — 63 training images across 8 classes, one of which
   (`broken_windshield`) has a single positive example in the entire
   dataset. Its measured macro-F1 (~0.19, after the class-weighting and
   fine-tuning improvements described in
   [Section 12.7](#127-condition-assessment-intelligence-layer-3--cnn))
   is a real, doubled improvement over the naive baseline — but still low
   in absolute terms. Its output should not be cited as reliable evidence
   of a car's actual condition.
2. **`price_prediction`'s training `condition_score` is synthetic**, not
   a genuine independent visual signal — it's generated as a function of
   vehicle age and mileage plus noise, because the real Kaggle dataset it
   trains on has no true condition field. An EDA heatmap confirms a 0.81
   correlation with `year`, i.e. it's currently acting mostly as an age
   proxy during training (at inference time, real listings that went
   through the CNN do supply a genuine score).
3. **No real-time chat** — inquiries are plain REST with client-side
   polling/refetching, not WebSocket-based live updates.
4. **No payments or checkout of any kind** — Valora is a listing and
   trust-signal marketplace, not a transaction platform.
5. **No web scraping for live market-comparison data** — this was
   researched, not just left undone. Real marketplaces' Terms of Service
   explicitly prohibit scraping (verified in CarDekho's actual T&C text,
   not just `robots.txt`); official manufacturer price pages are
   JS-rendered SPAs with no price data in the raw HTML a simple `requests`
   call would receive (verified directly); government vehicle-registration
   data measures the wrong thing entirely (counts, not prices). No live
   source exists that is both permitted to scrape and has real,
   accessible price data without a full headless browser.
6. **No Dash for analytics** — the spec's literal suggestion was
   Plotly/Dash; this project uses Node's MongoDB aggregation framework +
   React/Chart.js instead, deliberately, to avoid a third server with its
   own separate auth/deployment story for what's fundamentally a charting
   feature over data Node already owns.
7. **Deployment is intentionally out of scope** — deployment
   configuration exists (`render.yaml`, `client/vercel.json`, production
   Django settings) but the project is meant to stay local + GitHub-only,
   by explicit decision, not because deployment wasn't figured out.
8. **No depreciation forecasting or agentic negotiation layer** — both
   explicitly scoped as future/Phase 2 in the original spec, not part of
   this deliverable.

---

## 25. Faculty Viva Questions With Answers

**Q1: Why did you build two separate backends instead of doing everything in Node or everything in Django?**
> Django/DRF is required by the syllabus for the ML side, and Python's ML
> ecosystem (scikit-learn, TensorFlow) has no real equivalent in
> JavaScript — reimplementing a trained Random Forest or a CNN in Node
> would mean throwing away mature, well-tested libraries for no benefit.
> Splitting them also means a slow or failing ML call can't block basic
> operations like logging in, and each service's dependency footprint
> stays smaller and more focused.

**Q2: How do the two backends trust each other? What stops anyone from calling your ML API directly?**
> They share one secret, `JWT_SECRET`, set identically in both services'
> environment files. Node mints a short-lived (60-second) token signed
> with that secret before every ML call; Django's custom
> `ServiceJWTAuthentication` verifies the signature against the same
> secret. Without that secret, a request gets a `401 Unauthorized` — there
> is no other authentication system on the Django side at all.

**Q3: Why is the price prediction a range, not a single number?**
> A single predicted price implies false precision — real car prices vary
> for reasons the model can't see (a very clean interior, a persuasive
> seller, local demand). Returning a range plus a confidence level
> (derived from how much the model's predictions actually varied during
> testing) is more honest about the model's real uncertainty.

**Q4: Why Random Forest instead of plain Linear Regression for price prediction?**
> Car depreciation isn't additive across brand/model — a luxury brand and
> a budget brand don't lose the same rupee amount per year of age. A
> linear model over one-hot-encoded brand/model columns structurally
> cannot capture that kind of interaction, while a tree ensemble can. In
> this project specifically, switching from Linear Regression to a
> Random Forest took test R² from 0.71 to 0.89 on the same features and
> the same data.

**Q5: How does a listing get its `status` set — can a seller mark their own listing as `active`?**
> No. `status` starts as `pending_review` on creation, and is set to
> either `active` or `flagged` automatically based on the fraud
> classifier's risk flag — a seller never chooses it directly. The
> update endpoint only allows `status` to be changed at all when the
> caller's role is `admin`; a seller's PATCH request is restricted to a
> fixed whitelist of listing fields that doesn't include `status`.

**Q6: If a seller edits a flagged listing (e.g., lowers the price), does it get un-flagged automatically?**
> No, deliberately. Editing a listing never re-runs the ML pipeline —
> only an admin explicitly approving it (via the admin dashboard) clears
> a flag. This prevents a seller from "fixing" a fraud flag just by
> resubmitting the same listing with a cosmetic change.

**Q7: What's the difference between the two JWTs in this system?**
> One authenticates a human user to Node (issued at login, 7-day
> lifetime, carries `{id, role}`, stored in the browser). The other
> authenticates Node itself to Django as a trusted service caller
> (minted fresh for every ML call, 60-second lifetime, carries
> `{service: 'valora-node'}`, never stored anywhere). They use the same
> secret but serve entirely different purposes and are verified by
> completely separate code paths.

**Q8: Why MongoDB instead of a relational database like PostgreSQL/MySQL?**
> A listing's ML data (`ml.*`) is naturally variable-shaped — a nested
> object containing a damage array, a feature-importance map, and a
> trust-score breakdown, populated incrementally as the pipeline runs. A
> relational schema would need multiple normalized, joined tables to
> represent the same thing. MongoDB's document model, plus its
> aggregation framework (used directly for the analytics dashboard),
> fits this shape naturally.

**Q9: How does fraud detection get its training data if there's no real "confirmed scam" dataset?**
> The project's own specification explicitly permits synthetic labels
> here, since no public real-world dataset of confirmed fraudulent used-
> car listings exists to train on. A synthetic dataset is generated with
> a known, plausible generating process — fraudulent examples skew
> toward large price deviations, brand-new seller accounts, missing
> listing details, and no prior listing history, sampled from a
> different distribution than genuine listings, with 5% label noise
> added so the two classes aren't perfectly, trivially separable.

**Q10: Why is the condition-assessment model's quality still low, and what would fix it?**
> It's trained on only 63 real images across 8 classes — a small dataset
> for any CNN, and one class has a single positive example in the entire
> set. This project measured the real baseline (macro-F1 ≈ 0.09, since
> plain accuracy is misleading on this class imbalance) and applied two
> legitimate improvements — class-weighted loss and partial fine-tuning
> instead of a fully frozen backbone — roughly doubling it to ≈0.19. The
> single biggest further improvement would be more labeled training
> images; no amount of further hyperparameter tuning substitutes for
> more data at this scale.

**Q11: What happens if the ML service is down when a listing is created?**
> The Node→Django HTTP client (`mlService.js`) has a 90-second timeout
> (accounting for cold starts on services that spin down when idle). If
> the call fails or times out, the error propagates up through
> `asyncHandler` to the central error handler, and the listing-creation
> request fails with a clean error response rather than hanging
> indefinitely or silently saving an unscored listing.

**Q12: Why does the client never call the ML service directly?**
> Two reasons. First, security — the ML API's only auth mechanism is a
> shared server-side secret; a browser can't safely hold that secret
> without exposing it to anyone who opens dev tools. Second,
> architecture — keeping exactly one caller (Node) means the ML API's
> contract can change without ever touching client code, and Django can
> be scaled, restarted, or replaced independently of anything the user
> directly interacts with.

**Q13: How is search implemented — is it a real full-text search engine?**
> No, it's MongoDB regex-based partial matching on `brand`/`model`
> (case-insensitive, so "swift" matches "Maruti Suzuki Swift"), combined
> with exact-match and numeric-range filters on the other fields. This
> isn't a dedicated search engine like Elasticsearch — for the current
> dataset size, a compound MongoDB index on the most commonly filtered
> fields is sufficient.

**Q14: What was actually tested, and how do you know the tests aren't just decorative?**
> 174 tests across all three services: 46 on the Node server (real HTTP
> requests via Supertest against a live test MongoDB database, ML calls
> mocked so tests don't depend on model quality), 94 on the React client
> (React Testing Library, one file per page, each mocking its own API
> service module and testing actual rendered behavior — loading/empty/
> error states, form submissions, role-based visibility), and 34 on
> Django (covering both the pure scoring/preprocessing math and full
> HTTP-level view behavior — auth required, payload validation, a
> simulated untrained-model 503, and a mocked successful prediction).

**Q15: Why doesn't editing a listing require re-uploading photos?**
> The edit flow (`EditListing.jsx`) intentionally omits the image input
> (`showImages={false}`) — condition assessment is tied to the specific
> photos originally analyzed; editing text fields like price or
> description has no bearing on the car's visual condition, so there's
> no reason to force a reassessment.

---

## 26. Glossary of Technical Terms

| Term | Meaning in this project |
|---|---|
| **JWT (JSON Web Token)** | A signed, tamper-proof token encoding a small payload (e.g. user id and role) — used here for both user login sessions and internal service-to-service authentication. |
| **Mongoose** | An Object Data Modeling (ODM) library for MongoDB in Node.js — defines schemas, validation, and middleware (like the password-hashing hook) on top of the raw MongoDB driver. |
| **DRF (Django REST Framework)** | A toolkit built on top of Django for building REST APIs — provides serializers (request/response validation) and class-based views used for all four ML endpoints. |
| **Serializer (DRF)** | A class that validates and shapes incoming request data (and can shape outgoing responses) — analogous to a schema validator. |
| **Transfer learning** | Reusing a neural network already trained on a large, general dataset (MobileNetV2 on ImageNet) and fine-tuning it on a smaller, specific dataset (car damage photos), instead of training a network from random weights. |
| **Multi-label classification** | A classification task where more than one label can be true at once for the same input (a photo can show both a dent AND a scratch) — uses a `sigmoid` output per class instead of a single `softmax` across mutually-exclusive classes. |
| **Macro F1 / macro precision / macro recall** | Precision/recall/F1 computed per class, then averaged **equally** across classes regardless of how common each class is — chosen here specifically because plain accuracy is misleading when some classes are very rare. |
| **Random Forest** | An ensemble machine learning model that trains many decision trees on random subsets of data/features and averages (regression) or votes (classification) their predictions — used for both price prediction and fraud detection. |
| **R² (coefficient of determination)** | A regression quality metric from 0 to 1 (roughly) measuring how much of the variance in the actual values the model's predictions explain — 0.89 means the model explains 89% of the price variance in the test set. |
| **Confusion matrix** | A table of a classifier's predictions vs. actual labels (true/false positives/negatives) — used to compute sensitivity (recall) and specificity for the fraud classifier. |
| **One-hot encoding** | Converting a categorical value (like "Honda") into a set of binary columns, one per possible category, so a numeric model can use it as input. |
| **Optimistic UI update** | Updating what the user sees immediately, before the server has confirmed the change succeeded, then reverting if it turns out to have failed — used for the wishlist heart toggle. |
| **Middleware (Express)** | A function that runs during request handling before the final route handler — e.g. `protect` (auth check), `helmet()` (security headers), Multer (file parsing). |
| **Aggregation pipeline (MongoDB)** | A sequence of data-processing stages (`$match`, `$group`, `$sort`, `$bucket`, etc.) run directly inside the database — used for the analytics dashboard instead of fetching all data and processing it in JavaScript. |
| **Service-to-service authentication** | A pattern where one backend authenticates to another as a trusted system, not as a human user — here, Node authenticates to Django using a short-lived JWT that identifies it as "the trusted caller," with no separate user/session concept involved on Django's side. |
| **CORS (Cross-Origin Resource Sharing)** | A browser security mechanism restricting which origins (domains) a server allows to make requests to it — configured here to allow only the app's own client origin. |
| **Rate limiting** | Restricting how many requests a single client (by IP) can make in a given time window — used on login/register to blunt brute-force and spam attempts. |
| **Idempotent operation** | An operation that produces the same result no matter how many times it's repeated — `$addToSet` for the wishlist is idempotent (adding the same listing twice has no additional effect), unlike a plain array `push`. |
| **Ethereal Email** | A free fake-SMTP testing service (by Nodemailer's maintainers) that accepts and "sends" real SMTP email but never delivers it to a real inbox — instead providing a preview URL, ideal for development without needing a real mail provider. |
