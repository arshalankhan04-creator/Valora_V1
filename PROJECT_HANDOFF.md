# Valora — Project Handoff Document

**Prepared:** 2026-08-04
**Purpose:** This is the onboarding document for a new developer or AI
assistant picking up this project cold. It captures implementation state,
architectural decisions, and the reasoning behind them — not just what the
code does, but why it's built this way and what must not change without
deliberate reconsideration.

Read this document before making changes. Then read [`CLAUDE.md`](CLAUDE.md)
(a terser, load-bearing reference kept in sync with the implemented state —
if the two ever disagree, trust the code, then fix whichever doc is stale).
[`PROJECT_DOCUMENTATION.md`](PROJECT_DOCUMENTATION.md) is a separate,
much longer academic/viva-oriented write-up (problem statement, objectives,
step-by-step feature walkthroughs); it predates the landing page and seed
data work in this document and has not been refreshed — prefer this file
and `CLAUDE.md` for current state. [`DESIGN_SYSTEM_DECISIONS.md`](DESIGN_SYSTEM_DECISIONS.md)
covers the Tailwind/shadcn visual redesign in detail.

---

## 1. Project Purpose and Current State

Valora is a solo-built, final-year academic project: a full-stack **used
car marketplace** with an **AI trust layer**. The pitch is that every
listing gets algorithmically scored on price fairness, fraud risk, and
condition *before* a buyer ever messages the seller — a single 0–100
"Trust Score" that combines all three plus seller history.

**Stack:** MERN (React 19 + Vite + Tailwind v4 / Node + Express / MongoDB +
Mongoose) for the marketplace, plus a separate **Django/DRF microservice**
for the four ML layers (price prediction, fraud detection, CNN condition
assessment, combined trust scoring). Only Node ever talks to Django — the
React client never calls the ML service directly.

**Current state:** Feature-complete for the originally scoped MVP. Core
marketplace CRUD, auth, search/filter, inquiries/chat, wishlist, seller
dashboard, admin moderation, live analytics dashboard, and all four ML
layers are implemented and wired end-to-end. A buyer-first guest landing
page and comprehensive seed data were added most recently (this handoff's
proximate trigger — see §16). **210 automated tests pass** across all
three services (54 server + 122 client + 34 ml-service). The project is
deliberately **not deployed** — it runs locally + GitHub only, permanently
(see §17).

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Client | React 19, Vite, React Router v7 | SPA, `BrowserRouter` |
| Styling | Tailwind CSS v4 (`@theme inline` tokens) | see `DESIGN_SYSTEM_DECISIONS.md` |
| UI kit | shadcn/ui (Radix primitives) | components copied into `client/src/components/ui/`, not an npm dependency |
| Animation | Framer Motion | landing page section reveals, animated trust score counter |
| Charts | Chart.js + react-chartjs-2 | Analytics dashboard only |
| Icons | lucide-react | |
| HTTP | Axios | single instance in `services/api.js`, JWT attached via interceptor |
| Server | Node.js, Express | ESM (`"type": "module"` in package.json) |
| Auth | JWT (jsonwebtoken), bcryptjs | |
| DB | MongoDB + Mongoose | local instance, db name `valora_v1` |
| Security | helmet, express-rate-limit, cors | see §17 for the one helmet gotcha hit this session |
| Server tests | Vitest + Supertest | hits a **real** MongoDB test DB (`valora_v1_test`), not mocked |
| Client tests | Vitest + React Testing Library | jsdom, each page/component has its own service mock |
| ML service | Django + Django REST Framework | separate process, port 8000 |
| ML models | scikit-learn (price/fraud), TensorFlow/Keras MobileNetV2 (condition CNN) | trained artifacts committed to git (see §17) |
| ML tests | Django `manage.py test` | model inference mocked via `unittest.mock.patch.object` |

---

## 3. Repository Structure

```
Valora_V1/
├── client/                   React SPA (Vite)
│   ├── src/
│   │   ├── pages/            route-level components (one per URL)
│   │   ├── components/       shared/reusable components
│   │   │   ├── landing/      guest landing page sections (new — see §10)
│   │   │   └── ui/           shadcn/ui primitives
│   │   ├── context/          AuthContext, WishlistContext (React Context, not Redux)
│   │   ├── services/         axios wrappers per resource (listings, inquiries, wishlist)
│   │   ├── routes/           AppRoutes.jsx — the single route table
│   │   ├── assets/           images (webp), imported as JS modules (hashed at build)
│   │   └── test/setup.js     global test setup (jsdom polyfills, cleanup)
│   └── package.json          scripts: dev, build, test, lint
├── server/                   Node/Express API
│   ├── src/
│   │   ├── models/           User.js, Listing.js, Inquiry.js (Mongoose)
│   │   ├── controllers/      one per resource
│   │   ├── routes/           one per resource, mounted in app.js
│   │   ├── services/         mlService.js (Django HTTP client), listingIntelligence.js (orchestrator), emailService.js
│   │   ├── middleware/       auth.js, upload.js (multer), rateLimiters.js, errorHandler.js
│   │   ├── scripts/seed.js   dev-time seed script (rewritten — see §13)
│   │   └── scripts/seed-assets/  git-tracked placeholder images seed.js copies from
│   └── package.json          scripts: dev, start, seed, test
├── ml-service/                Django project
│   ├── core/                 shared auth (ServiceJWTAuthentication), base settings
│   ├── price_prediction/     Layer 1 — regression
│   ├── fraud_detection/      Layer 2 — classification
│   ├── condition_assessment/ Layer 3 — CNN (proof-of-concept, see §17)
│   ├── trust_score/          Layer 4 — rule-based combination (scoring.py)
│   └── valora_ml/            Django settings/urls root
├── ref-images/                Design reference material (not part of the app; untracked in git)
├── docs/                      original spec documents
├── CLAUDE.md                  terse, load-bearing project reference (kept current)
├── PROJECT_DOCUMENTATION.md   long-form academic writeup (stale re: landing page/seed — see header note)
├── DESIGN_SYSTEM_DECISIONS.md visual redesign rationale
├── README.md                  setup/run instructions
└── render.yaml                deployment prep, unused (see §17)
```

---

## 4. Frontend Architecture

### Routing (`client/src/routes/AppRoutes.jsx`)

Single route table, wrapped in a shared `Layout` (header nav + `<Outlet/>`).
`ProtectedRoute` gates authenticated/role-restricted routes and redirects
to `/login` otherwise.

| Path | Component | Access |
|---|---|---|
| `/` | `Home` | public — role-aware (see below) |
| `/login`, `/register` | `Login`, `Register` | public |
| `/listings` | `Listings` | public — reads filter state from URL query params (see §10) |
| `/listings/:id` | `ListingDetail` | public |
| `/sell` | `CreateListing` | seller, admin |
| `/my-listings` | `SellerDashboard` | seller, admin |
| `/my-listings/:id/edit` | `EditListing` | seller, admin |
| `/inquiries`, `/inquiries/:id` | `Inquiries` | any authenticated user |
| `/wishlist` | `Wishlist` | any authenticated user |
| `/analytics` | `Analytics` | seller, admin |
| `/admin` | `AdminDashboard` | admin only |
| `*` | `NotFound` | public |

`Home.jsx` branches on auth state: logged-out renders the full guest
`LandingPage` (§10); logged-in renders role-framed hero copy + ML feature
cards (buyer-framed vs seller-framed text, decided by `user.role`).

### State management

No Redux/Zustand — plain React Context:
- `AuthContext` — current user (persisted to `localStorage` under `user`
  and `token`), `login`/`register`/`logout`.
- `WishlistContext` — wishlist listing IDs, optimistic add/remove.

### API layer (`client/src/services/`)

One `axios` instance (`services/api.js`) with a request interceptor that
attaches `Authorization: Bearer <token>` from `localStorage` when present.
`ASSET_BASE_URL` is derived from `VITE_API_URL` by stripping `/api` — used
to build `<img src>` URLs for uploaded listing images (which are served
statically, not through the JSON API). One thin service module per
resource (`listings.js`, `inquiries.js`, `wishlist.js`) — each just wraps
`api.get/post/patch/delete` calls; no data transformation layer.

### Shared / reusable components (`client/src/components/`)

| Component | Used by | Notes |
|---|---|---|
| `Layout.jsx` | every route | header nav, role-aware links, user dropdown |
| `ProtectedRoute.jsx` | route table | auth/role gate |
| `ListingCard.jsx` | Listings, Wishlist, `landing/FeaturedListings` | the canonical listing summary card |
| `ListingForm.jsx` | CreateListing, EditListing | shared create/edit form |
| `TrustScoreBadge.jsx`, `RiskFlagBadge.jsx`, `StatusBadge.jsx` | listing cards/detail | small colored badges |
| `WishlistButton.jsx` | listing cards/detail | optimistic add/remove via `WishlistContext` |
| `BackButton.jsx` | detail/edit pages | context-aware back navigation |
| `AnimatedTrustScore.jsx` | **new** — `ListingDetail`, `landing/TrustScoreShowcase` | Framer Motion count-up number (`animate(0, value, …)`); see §17's rAF caveat |
| `TrustBreakdownRow.jsx` | **new** — `ListingDetail`, `landing/TrustScoreShowcase` | one labeled progress bar for a trust sub-score |

`AnimatedTrustScore` and `TrustBreakdownRow` were **extracted out of
`ListingDetail.jsx`** during the landing page build specifically so the
Trust Score Showcase section could render a real scored listing with the
exact same visual treatment as the detail page — not a re-implementation.
Any future trust-score UI should reuse these two, not duplicate them.

### UI kit

shadcn/ui components live in `client/src/components/ui/` as plain source
files (button, card, badge, input, textarea, label, select, dialog,
skeleton, dropdown-menu, tabs, avatar, alert-dialog, sonner, **accordion**
— accordion added for the landing page FAQ section). They are copied-in
source, not an npm package — edit them directly like any other component.

---

## 5. Backend Architecture (Node/Express)

`server/src/app.js` wires the middleware stack in this order: `helmet()` →
`cors({ origin: CLIENT_URL })` → `express.json()` → `morgan('dev')` (skipped
in test) → `express.static('uploads')` for `/uploads` (with a
route-scoped CORP override — see §17) → route mounts → `errorHandler`.

**Controllers** (`server/src/controllers/`): `authController`,
`listingController`, `inquiryController`, `userController`,
`analyticsController` — one per resource, thin (`asyncHandler`-wrapped,
delegate business logic to `services/`).

**Services** (`server/src/services/`):
- `mlService.js` — HTTP client for the four Django endpoints; mints the
  short-lived service JWT (`serviceToken()`, `{ service: 'valora-node' }`,
  60s expiry, signed with the shared `JWT_SECRET`).
- `listingIntelligence.js` — `scoreListing(listing, seller)`, the
  orchestrator that calls Django in sequence (condition → price → fraud →
  trust) and decides `status` from `riskFlag`. See §12 for the full flow.
- `emailService.js` — sends inquiry notification emails (buyer→seller
  contact, new message).

**Middleware** (`server/src/middleware/`): `auth.js` (`protect`,
`authorize(...roles)` — JWT verification + role gate), `upload.js`
(multer disk storage to `uploads/listings/`, image-only file filter, 5MB/8
files limit), `rateLimiters.js` (`authLimiter` on register/login),
`errorHandler.js` (central `ApiError` → JSON response).

---

## 6. ML Microservice Architecture (Django)

Five Django apps under `ml-service/`:

- **`core`** — `ServiceJWTAuthentication` (DRF `BaseAuthentication`
  subclass; **must** implement `authenticate_header()` or 401s silently
  become 403s — see §17), shared settings.
- **`price_prediction`** — regression model (scikit-learn), trained on a
  Kaggle used-car dataset. `predict_price/` endpoint.
- **`fraud_detection`** — classification model, `_risk_flag()` thresholds
  (`fraud_detection/inference.py`): `>=0.66` → `High`, `>=0.33` → `Medium`,
  else `Low`. `detect_fraud/` endpoint.
- **`condition_assessment`** — MobileNetV2 CNN fine-tuned on a small,
  imbalanced dataset (proof-of-concept quality — see §17).
  `assess_condition/` endpoint, multipart image upload.
- **`trust_score`** — pure rule-based combination, no model
  (`trust_score/scoring.py`, `compute()`). See §12 for the exact formula.

All four endpoints require the service JWT (see §5). Request/response
shapes are documented in `CLAUDE.md` §4 and mirrored 1:1 by
`Listing.ml.*` field names (snake_case Django response → camelCase
Mongoose field). Django never has its own user/session system — the
shared `JWT_SECRET` between `server/.env` and `ml-service/.env` is the
*only* trust boundary (see §17 — do not let these drift).

---

## 7. Database Models (MongoDB / Mongoose)

### `User` (`server/src/models/User.js`)

| Field | Type | Notes |
|---|---|---|
| `name`, `email` | String | `email` unique, lowercase, trimmed |
| `password` | String | `select: false`, bcrypt-hashed in a pre-save hook |
| `role` | enum | `buyer` \| `seller` \| `admin`, default `buyer` |
| `responseRate` | Number | 0–100, seller-history input to Trust Score, default 0 |
| `pastDeals` | Number | seller-history input to Trust Score, default 0 |
| `wishlist` | `[ObjectId → Listing]` | mutated via `$addToSet`/`$pull` |
| `accountAgeDays` | virtual | `floor((now - createdAt) / 1 day)` — fed to fraud detection and trust score seller-bonus |

`comparePassword(candidate)` instance method wraps `bcrypt.compare`.
Mongoose 9 hooks are promise-based — the pre-save hook takes **zero**
params and just returns; do not add a `next` callback param (throws).

### `Listing` (`server/src/models/Listing.js`)

| Field | Type | Notes |
|---|---|---|
| `seller` | `ObjectId → User` | required |
| `brand`, `model` | String | free text, case-insensitive partial-match search |
| `year`, `kmDriven`, `price` | Number | |
| `fuelType` | enum | `Petrol\|Diesel\|Electric\|CNG\|LPG\|Hybrid` |
| `transmission` | enum | `Manual\|Automatic` |
| `description` | String | optional, trimmed |
| `images` | `[String]` | forward-slash paths (`uploads/listings/x.jpg`), served via `express.static` |
| `status` | enum | `pending_review\|active\|sold\|flagged` — **decided by the ML pipeline**, not the seller (see §12) |
| `ml.visualConditionScore` | Number | only present if `images.length > 0` |
| `ml.detectedDamages` | `[{part, damageType, confidence}]` | `part` is `"unknown"` unless the rare real dataset-trained classes match |
| `ml.predictedPriceMin/Max` | Number | |
| `ml.confidenceLevel` | String | |
| `ml.featureImportance` | `Map<String, Number>` | |
| `ml.riskFlag` | enum | `Low\|Medium\|High` |
| `ml.fraudProbability` | Number | 0–1 |
| `ml.fraudReasons` | `[String]` | empty when `riskFlag === 'Low'` |
| `ml.trustScore` | Number | 0–100 |
| `ml.trustBreakdown` | `{priceFairness, fraudRisk, conditionMatch, sellerFactor}` | see §12 |

Compound index: `{ brand: 1, model: 1, year: 1, price: 1 }`.

### `Inquiry` (`server/src/models/Inquiry.js`)

| Field | Type | Notes |
|---|---|---|
| `listing`, `buyer`, `seller` | `ObjectId` refs | |
| `messages` | `[{sender, text, timestamps}]` | subdocument, own `createdAt`/`updatedAt` |
| `buyerArchived`, `sellerArchived` | Boolean | **per-party**, default `false` |
| `buyerLastReadAt`, `sellerLastReadAt` | Date | **per-party**, default `null` |

Full architecture and the exact unread/archived resolution logic is in
§11 — do not re-derive it from first principles, read that section first.

---

## 8. API Routes

### Client-facing REST (`server/src/routes/`, base path `/api`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | rate-limited | |
| POST | `/auth/login` | rate-limited | |
| GET | `/auth/me` | required | |
| GET | `/listings` | public | query filters: brand/model partial match, fuelType, price/year/km range, trust score |
| GET | `/listings/mine` | seller/admin | **registered before `/:id`** |
| GET | `/listings/admin` | admin | **registered before `/:id`** |
| GET | `/listings/analytics` | seller/admin | **registered before `/:id`** — reordering breaks all three (Express matches `:id` otherwise) |
| GET | `/listings/:id` | public | |
| POST | `/listings` | seller/admin | multipart, up to 8 images; triggers ML pipeline (§12) |
| PATCH | `/listings/:id` | seller/admin | seller updates via `SELLER_UPDATE_FIELDS` whitelist only; only admin may set `status` |
| DELETE | `/listings/:id` | seller/admin | |
| GET | `/inquiries` | required | resolves per-caller `archived`/`unread` (§11) |
| POST | `/inquiries` | required | reuses existing thread via `findOne({listing, buyer})` |
| POST | `/inquiries/:id/messages` | required | |
| PATCH | `/inquiries/:id/read` | required | 204, no body, marks caller's own `*LastReadAt` |
| PATCH | `/inquiries/:id/archive` | required | `{archived: boolean}`, 204, caller's own flag only |
| GET | `/users/me/wishlist` | required | |
| POST | `/users/me/wishlist/:listingId` | required | |
| DELETE | `/users/me/wishlist/:listingId` | required | |

### Internal ML API (Node ↔ Django, base path `/api/ml/`)

All four require `Authorization: Bearer <service JWT>` (see §6). Full
request/response shapes: `CLAUDE.md` §4.

```
POST /predict-price/     POST /detect-fraud/
POST /assess-condition/  POST /trust-score/
```

---

## 9. Completed Features

- JWT auth (buyer/seller/admin roles), registration, login, protected routes
- Listing CRUD with image upload (multer, up to 8 images)
- Search/filter: brand/model partial match, fuel type, price/year/km range, trust score
- Full 4-layer ML pipeline wired synchronously into listing creation
- Buyer↔seller inquiry/chat system with email notifications, per-party read/archive state
- Wishlist (optimistic add/remove)
- Seller dashboard (view/edit/delete own listings)
- Admin dashboard (moderate flagged listings)
- Live market analytics dashboard (MongoDB aggregation + Chart.js)
- Role-aware home page (buyer-framed vs seller-framed copy/CTAs when logged in)
- **Buyer-first guest landing page** (hero, real featured listings, AI trust
  scoring showcase, browse-by-category, how-it-works, seller CTA, FAQ,
  minimal footer with real nav links) — see §10
- **Inquiry chat wallpaper** (light/dark aware, dormant dark-mode-ready CSS)
- **Comprehensive, formula-consistent seed data** — see §13
- Security hardening: helmet, auth rate limiting, NoSQL injection type-guards
- 210 passing automated tests across all three services

---

## 10. Landing Page Architecture

**Audience decision:** buyer-first. The guest landing page (shown only
when logged out — `Home.jsx` does `if (!user) return <LandingPage />`)
leads with buyer value ("find a car you can trust"), with a secondary
seller CTA band lower on the page. This was a deliberate, discussed
decision (not the original "Find a used car" copy accident it replaced)
— see the session history in git log around `feat(home): role-aware
landing page` for the reasoning if it's ever questioned.

**Component tree** (`client/src/components/landing/`), rendered in order
by `LandingPage.jsx`:

1. `LandingHero.jsx` — headline, brand search box (submits to
   `/listings?brand=...`), primary CTAs
2. `FeaturedListings.jsx` — first 3 real listings from `getListings()`;
   section renders nothing at all if there are zero listings (no
   fabricated placeholder cards)
3. `WhyValora.jsx` — four static AI-feature cards (fair-price check,
   fraud risk flag, condition score, trust score) — marketing copy, not
   data-driven
4. `TrustScoreShowcase.jsx` — picks the **real** listing with the highest
   `ml.trustScore` from the same `getListings()` payload and renders it
   with `AnimatedTrustScore`/`TrustBreakdownRow` (the same components
   `ListingDetail` uses). If no listing has been scored yet, falls back
   to a hardcoded example **explicitly labeled "Example"** — never
   presented as if it were real
5. `BrowseByCategory.jsx` — static tiles linking to
   `/listings?fuelType=X` or `/listings?maxPrice=Y` (fuel type + price
   band only — no body-type category, since the schema has no body-type
   field)
6. `HowItWorks.jsx` — static 4-step explainer
7. `SellerCta.jsx` — secondary "selling instead?" band, links to
   `/register` (not `/sell`) since a logged-out visitor doesn't have an
   account yet
8. `Faq.jsx` — accordion (shadcn `ui/accordion.jsx`, added for this)
9. `FinalCta.jsx` — closing CTA band
10. `LandingFooter.jsx` — oversized `Valora` wordmark (the dominant
    visual element, `clamp(3.5rem, 18vw, 11rem)`) **plus** a real nav row
    above it: Browse listings (`/listings`), Sell a car (`/register`),
    Log in (`/login`), Sign up (`/register`). Deliberately excludes:
    GitHub link, fake support/contact links, social links — this footer
    only ever renders on the guest landing page, so there's no
    "logged-in" variant to branch on.

**Listings deep-linking:** `Listings.jsx` seeds its filter state from
`useSearchParams()` on mount, so the hero search box and category tiles
can link straight into a pre-filtered listings view.

**One implementation caveat worth knowing:** `AnimatedTrustScore` counts
up via `requestAnimationFrame` (Framer Motion's `animate()`). In headless
or non-composited browser contexts (e.g. an automated preview pane that
isn't actually rendering frames), the counter can appear stuck at `0`
even though the underlying `ml.trustScore` value is correct — verify via
the network response body, not just the rendered number, if this comes
up again. This is not a production bug; it only surfaces in that specific
testing condition.

---

## 11. Inquiry System Architecture

Plain REST, **not** real-time (no Socket.io — deliberately out of scope,
see §17). The client polls/refetches; there is no websocket or SSE layer.

**Schema shape** (`Inquiry` model, §7): each inquiry has exactly two
participants (`buyer`, `seller`), so read/archive state is stored as one
field per side rather than a generic participants array —
`buyerArchived`/`sellerArchived`, `buyerLastReadAt`/`sellerLastReadAt`.
`createInquiry` reuses an existing thread via
`findOne({listing, buyer})` instead of creating duplicate threads per
message — one thread per (listing, buyer) pair, even across multiple
messages.

**Server-side resolution** (`inquiryController.js`'s `toClientInquiry()`):
strips the raw per-party fields from every response and resolves them
down to what the *calling* user sees — `archived` and `unread` booleans
from their own perspective only. The other party's read/archive state is
never sent to the client. The exact `unread` rule (only depends on the
**last** message in the thread, not full history):

```js
unread = Boolean(
  lastMessage &&
  lastMessage.sender !== callingUser &&
  (!callerLastReadAt || lastMessage.createdAt > callerLastReadAt)
)
```

Sending a message (`createInquiry` or `addMessage`) stamps the **sender's
own** `*LastReadAt` to now — not the recipient's. `PATCH /:id/read` marks
a thread read for the caller only (204, no body; client updates
optimistically). `PATCH /:id/archive` takes `{archived: boolean}` and
flips only the caller's own flag (204) — archiving is reversible
(`archived: false` un-archives), so the UI doesn't need a confirmation
dialog for it, unlike listing delete.

**Client UI** (`Inquiries.jsx`): three tabs — Active / Unread / Archived
— computed client-side from the resolved `archived`/`unread` booleans.
Search box filters by counterpart name / listing brand+model. Selecting
a thread shows the listing context (price, km, trust signals) pinned
alongside the message list.

**Chat wallpaper:** a light/dark-aware background image applied to the
messages pane via CSS custom properties (`.chat-wallpaper` /
`.dark .chat-wallpaper` rules in `client/src/index.css`, images imported
from `client/src/assets/chat-bg-{light,dark}.webp`). The dark variant is
wired but currently dormant — the app has no dark-mode toggle yet, so it
only activates if/when one is added. Applied via inline CSS custom
properties on the messages container in `Inquiries.jsx`.

---

## 12. Trust Score Implementation Details

**Formula** (`ml-service/trust_score/scoring.py`, pure rule-based, no
trained model):

```
trust_score = min(100, round(
    0.4 * price_fairness_score +
    0.3 * fraud_risk_score +
    0.3 * condition_score +
    seller_bonus
, 2))

seller_bonus = min(5.0,
    (response_rate / 100) * 1.0 +
    min(past_deals, 10) / 10 * 0.5 +
    min(account_age_days, 365) / 365 * 1.0
)
```

Worked example (matches the original spec doc): inputs `95, 90, 85` +
`{response_rate: 92, past_deals: 5, account_age_days: 180}` →
`trust_score = 92.16`, `breakdown = {38.0, 27.0, 25.5, 1.66}`.

**Note:** the three seller-bonus components max out at `1.0 + 0.5 + 1.0 =
2.5` — `MAX_SELLER_BONUS = 5.0` can never actually bind at current
weights. Not a bug; don't assume the cap is reachable if the weights ever
change.

**End-to-end orchestration** (`server/src/services/listingIntelligence.js`,
`scoreListing()`), called synchronously inside `POST /api/listings`
*before* the response is sent:

1. If `images.length > 0` → call `/assess-condition/` → sets
   `visualConditionScore`, `detectedDamages`
2. Call `/predict-price/` → sets `predictedPriceMin/Max`,
   `confidenceLevel`, `featureImportance`
3. Call `/detect-fraud/` → sets `riskFlag`, `fraudProbability`,
   `fraudReasons`
4. Derive `priceFairnessScore` from where `listing.price` falls inside
   `[predictedPriceMin, predictedPriceMax]` (100 if inside the range;
   otherwise `max(0, round(100 - distance/span * 100))`,
   `priceFairnessFromRange()`)
5. Derive `fraudRiskScore = round((1 - fraudProbability) * 100)`
6. Call `/trust-score/` with `{priceFairnessScore, fraudRiskScore,
   conditionScore: visualConditionScore ?? 100, seller}` → sets
   `trustScore`, `trustBreakdown`
7. `status = riskFlag === 'High' ? 'flagged' : 'active'`

**Deliberately not re-run on edit** — a seller lowering a flagged
listing's price does **not** auto-clear the flag; only an admin approving
it (via the admin dashboard) does. If this is ever changed, update
`EditListing.jsx`'s warning copy to match.

**Display components:** `AnimatedTrustScore.jsx` (count-up number) +
`TrustBreakdownRow.jsx` (one progress bar per sub-score) — shared between
`ListingDetail.jsx` and `landing/TrustScoreShowcase.jsx` (§4, §10).

---

## 13. Seed Data Setup

**File:** `server/src/scripts/seed.js`. **Run:** `npm run seed` from
`server/` (requires `MONGODB_URI` in `server/.env` pointing at a real,
non-test database — the script deletes and replaces all Users, Listings,
and Inquiries, so never point it at production data).

**What it creates, every run (idempotent — clears first):**
- **10 users**: 1 admin, 5 sellers (varied `responseRate`/`pastDeals`/
  account age — including one seller with **zero listings**, to exercise
  the seller-dashboard empty state, and one brand-new/no-history seller
  who feeds the deliberately flagged listing), 4 buyers. All share the
  password `password123`.
- **20 listings**: spans 9 brands, all 6 fuel types, both transmissions,
  all 4 price tiers (<₹5L / ₹5–10L / ₹10–20L / >₹20L), all 3 trust tiers
  (Low/Medium/High), 0/1/multiple images, empty/complete descriptions,
  ages from 12 hours to 90 days — every dimension has **at least 2–3
  records** so UI states (filters, empty states, badge colors) are
  actually testable, not just spot-checked with one example. 4 of the 20
  land as `status: 'flagged'` (fraud probability ≥ 0.66), giving the
  admin dashboard real moderation queue data.
- **10 inquiries**: covers every combination of unread/read/archived,
  tracked **independently per buyer and seller** (see §11) — including
  cases where the same thread is archived for one party but still
  active+unread for the other. Mix of single- and multi-message threads,
  and timestamps from 30 minutes to ~3 weeks old for relative-time
  display testing.

**Formula consistency (important):** the script does **not** hand-pick
`ml.trustScore`/`riskFlag`/`trustBreakdown` values. It re-implements the
real formulas locally — `priceFairnessFromRange()`, `riskFlagFor()`
(mirrors the 0.66/0.33 fraud thresholds), `fraudRiskScoreFor()`, and
`sellerBonusFor()`/`computeTrust()` (mirrors `trust_score/scoring.py`
exactly, including its rounding) — so every seeded listing's trust score
is what the production pipeline *would* have computed from that
listing's inputs. If the real formulas in `trust_score/scoring.py` or
`fraud_detection/inference.py` ever change, update the mirrored copies in
`seed.js` too, or seed data will silently drift from production behavior.

**Images:** `server/uploads/` is gitignored (runtime-generated), so the
script copies from a **git-tracked** source folder,
`server/src/scripts/seed-assets/` (5 small synthetic placeholder JPGs —
clearly labeled "SEED PLACEHOLDER — NOT A REAL PHOTO", never real car
photos), into `uploads/listings/` at seed time. This makes the script
fully self-contained and repeatable from a fresh clone. Seeding writes
directly via `Listing.create()`, bypassing `POST /api/listings` — so
these images never actually go through the real condition-assessment
CNN; they exist purely to exercise image-count UI states (single vs
multi-image cards, zero-image fallback).

**Backdating technique used throughout:** Mongoose's `timestamps: true`
stamps `createdAt`/`updatedAt` to "now" on `.create()`. To get varied
account ages / listing ages / message timestamps, the script creates
first, then does a raw `updateOne({_id}, {$set: {...}}, {timestamps:
false})` to overwrite the timestamp fields directly (including individual
message subdocument timestamps by array index) — `{timestamps: false}`
is required or Mongoose's own update-time timestamp middleware
overwrites the backdated value right back to "now".

---

## 14. Testing

### Commands

```bash
# server (from server/) — hits a REAL MongoDB test DB, not mocked
npm test                          # single run
npx vitest run --no-file-parallelism   # explicit — see gotcha below

# client (from client/)
npm test                          # single run
npm run test:watch                # watch mode

# ml-service (from ml-service/, venv activated)
python manage.py test
```

### Current status (last verified 2026-08-04)

| Suite | Files | Tests | Status |
|---|---|---|---|
| server (Vitest+Supertest) | 5 | 54 | all passing |
| client (Vitest+RTL) | 21 | 122 | all passing |
| ml-service (Django) | — | 34 | all passing |
| **Total** | | **210** | |

Client also builds cleanly (`npm run build`, ~500ms, one pre-existing
"chunk larger than 500kB" warning — not a regression, not addressed).

### Gotchas that will waste your time if you don't know them

- **Server tests share one real MongoDB test database**
  (`valora_v1_test`). Never run them with `fileParallelism: true` —
  parallel test files race on the `afterEach` cleanup (this has been
  reproduced once already). `server/.env.test`'s `MONGODB_URI` must point
  at a `_test`-suffixed database — `tests/setup.js` throws on purpose
  rather than risk wiping dev/seed data if it doesn't.
- **jsdom has no `IntersectionObserver`** — needed by Framer Motion's
  `whileInView` (used throughout the landing page). A
  `MockIntersectionObserver` is registered globally in
  `client/src/test/setup.js`; if you add new `whileInView` usage and see
  `IntersectionObserver is not defined`, that file is where the mock
  lives, not something to re-solve per test.
- **Programmatic form fill + `.click()` on a submit button does not
  reliably trigger a real submit** in this environment's E2E-style
  browser tool (React controlled inputs / event timing issue). Use
  `formElement.requestSubmit()` (or a native input-value setter dispatch)
  instead when driving login/register-style forms from an automated
  browser session — plain `click()` on the button has silently no-opped
  in practice.
- Vitest config: dev server processes for manual browser verification
  should be started with the project's preview/dev-server tooling, not
  ad hoc `npm run dev` in a way that leaves orphaned background
  processes — check for an already-running instance before starting a
  new one.

---

## 15. Recent Changes (this handoff's context)

Chronological, most recent first, as landed on branch `dev`:

1. **`fix(server)`** — Helmet's default `Cross-Origin-Resource-Policy:
   same-origin` header was applied to the `/uploads` static route too,
   silently blocking the Vite client (a different origin) from loading
   listing images. Invisible until real seed images existed to expose
   it. Fixed by scoping a `cross-origin` policy to just that route in
   `server/src/app.js`, not relaxing it app-wide.
2. **`feat(seed)`** — Full rewrite of `seed.js` per §13: 10 users, 20
   listings, 10 inquiries, formula-consistent `ml.*` fields, git-tracked
   placeholder images, fully repeatable.
3. **`feat(landing)`** — Buyer-first guest landing page (§10), footer nav
   links, inquiry chat wallpaper (§11), `AnimatedTrustScore`/
   `TrustBreakdownRow` extraction (§4), `Listings.jsx` URL query-param
   deep-linking.

All three are pushed to `origin/dev`. Everything in §9 was live-verified
in a real browser session against seeded data before being called done
(featured listings render real data, trust showcase picks the actual
highest-scored listing, filters return correct seeded subsets, inquiry
tab counts and per-party archive/unread independence all confirmed
against the actual API responses — not just visually).

---

## 16. Design Decisions and Things That Should Not Be Changed

Carried forward from `CLAUDE.md` §7, plus new ones from this round of
work. Treat this list as load-bearing — changing any of these without
deliberate reconsideration will likely reintroduce a bug or reopen a
security hole that was already fixed once.

- **Don't let `server/.env` and `ml-service/.env`'s `JWT_SECRET` drift
  apart** — every Django ML call fails auth (401) instantly if they
  differ.
- **Don't recreate `ml-service/venv` with plain `python`** — must be
  `py -3.13`. TensorFlow has no Python 3.14 wheels.
- **Don't add a `next` parameter to a Mongoose pre/post hook** — Mongoose
  9 hooks are promise-based; calling `next()` throws.
- **Don't add a DRF `BaseAuthentication` subclass without
  `authenticate_header()`** — silently turns every 401 into 403.
- **Don't replace the `SELLER_UPDATE_FIELDS` whitelist in
  `updateListing` with `Object.assign(listing, req.body)`** — reopens
  the hole where any PATCH could overwrite `seller`, `ml`, or `_id`.
  Only admins may set `status`.
- **Don't re-score a listing's ML fields on edit** — deliberate (§12).
  If changed, update `EditListing.jsx`'s warning text too.
- **Don't commit raw Kaggle datasets or `.env`/`.env.test` files** —
  gitignored on purpose. Trained model artifacts (`*.joblib`, `*.keras`)
  are the one exception — committed deliberately so a fresh deploy has
  working models on first boot.
- **Don't build a Dash app for analytics** — the live seller dashboard
  is Node aggregation + React/Chart.js on purpose; Seaborn's syllabus
  mention is `price_prediction/eda.py` instead, a separate report
  artifact.
- **Don't run server tests with `fileParallelism: true`** (§14).
- **Don't point `server/.env.test`'s `MONGODB_URI` at a non-`_test`
  database** (§14).
- **Don't relax the `Cross-Origin-Resource-Policy` header app-wide** —
  the fix in §15 scopes it to just `/uploads`; helmet's default
  `same-origin` policy is the right posture for every other route.
- **Don't hand-pick `ml.*` values in seed data** — reuse/extend the
  formula-mirroring helpers in `seed.js` (§13) so seeded trust scores
  stay consistent with the real scoring logic.
- **Don't add real-time chat (Socket.io)** — inquiries are deliberately
  plain REST; out of scope (§11, §17).
- **Don't scrape car marketplaces or manufacturer sites for market
  data** — researched and declined (see `CLAUDE.md`, "Not building");
  don't re-research this from scratch.
- **Don't suggest deployment as a next step unprompted** — the project
  stays local + GitHub only, permanently (§17). If deployment is ever
  raised again, treat it as a brand-new explicit request.

---

## 17. Pending Improvements / Next Tasks

As directed by the project owner, in priority order:

1. **Improve listings page UI** — `Listings.jsx` currently has working
   filters (including the new URL query-param deep-linking from the
   landing page, §10) but the visual design hasn't had the same design
   pass the landing page and Inquiries redesign got. Candidate scope:
   card layout, filter UX, empty/loading states, sort options.
2. **Image upload improvements** — current upload is a plain multer
   multipart form (`upload.js`, up to 8 images, 5MB each, image-mimetype
   filter only). No client-side preview/reorder/crop, no drag-and-drop,
   no progress indication beyond the base form submit state.
3. **ML integration** — the four layers are wired and functional, but
   see §18's caveats on model quality (especially the condition CNN).
   "ML integration" as a next task likely means either improving model
   quality/training data, or surfacing more of the ML output in the UI
   (e.g. `featureImportance`, `detectedDamages` detail) beyond what's
   shown today.
4. **Production deployment** — deployment prep exists (`render.yaml`,
   `vercel.json`, production Django config) but is explicitly **not**
   being pursued; the project stays local + GitHub only, permanently
   (§16). Only act on this if the project owner gives an explicit,
   fresh instruction to deploy — don't treat old deployment prep files
   as a signal that this is wanted now.

---

## 18. Known Issues and Future Considerations

- **`condition_assessment` CNN is proof-of-concept quality** — trained
  on only 63 images across 8 classes (one class with a single positive
  example). Fine-tuning MobileNetV2's last 50 layers with class-weighted
  loss took macro-F1 from ~0.09 to ~0.19 over a frozen/unweighted
  baseline (5-fold CV) — a real improvement, but low in absolute terms.
  Judge it on macro-F1, not `binary_accuracy` (misleading given the
  class imbalance). Don't cite its accuracy as production-reliable in
  any write-up.
- **No real-time chat** — Inquiries is plain REST with client-side
  refetch, not websockets. Fine for the current scope; would need
  revisiting if message latency ever becomes a stated requirement.
- **No payments/checkout** — entirely out of scope; buyers and sellers
  finalize deals off-platform.
- **No live-scraped market data** — thoroughly researched and declined
  (ToS restrictions, JS-rendered manufacturer pages, wrong government
  data — see `CLAUDE.md`'s "Not building" section for the full
  investigation). Training data is a static Kaggle dataset instead.
- **`condition_score`/`year` correlation (0.81)** — visible in
  `price_prediction/eda.py`'s correlation heatmap; a synthetic-proxy
  caveat already flagged in `price_prediction/prepare_data.py`. Worth
  rereading before any changes to how `condition_score` feeds price
  prediction.
- **Client bundle size warning** — `dist/assets/index-*.js` is ~826kB
  (264kB gzip) at build time, over Vite's 500kB chunk warning threshold.
  Not yet addressed; candidate for code-splitting if it's ever raised as
  a concern.
- **`MAX_SELLER_BONUS` cap is unreachable** at current weights (§12) —
  harmless today, but worth knowing before touching the seller-bonus
  weights.
- **Landing page trust-score counter can appear frozen at 0 in
  non-compositing headless browser contexts** (§10) — verify via API
  response data, not just the rendered animation, if this resurfaces
  during automated verification.
- **`ref-images/` and `.claude/` are intentionally untracked** — the
  former is local design reference material, the latter is
  machine/tool-local configuration; neither has been added to git and
  that's deliberate, not an oversight.

---

## 19. Local Setup Quick Reference

See `README.md` for the full walkthrough (env vars, training data,
per-service install steps). Short version:

```bash
# server (needs MongoDB running locally, server/.env configured)
cd server && npm install && npm run dev        # :5000

# client
cd client && npm install && npm run dev         # :5173

# ml-service (needs Python 3.13 specifically — py -3.13, not `python`)
cd ml-service && py -3.13 -m venv venv
venv\Scripts\activate                            # Windows
pip install -r requirements.txt
python manage.py runserver                       # :8000

# seed data (server/.env must point at a real, non-test MongoDB)
cd server && npm run seed
```

All three services must be running for the full ML pipeline to work end
to end (listing creation calls Django synchronously). The client and
server alone are sufficient for browsing/testing already-seeded data —
seeding bypasses the live ML pipeline entirely (§13).
