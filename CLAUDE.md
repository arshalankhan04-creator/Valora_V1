# Valora — Project Reference

Generated from the actual implemented state as of 2026-08-02, last updated
2026-08-04. This is a factual reference for THIS codebase — not general
working preferences (those live in the standing instructions already
governing this project). For a fuller onboarding narrative (why things are
built this way, pending tasks, known issues), see
[`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md) — this file stays terse and
load-bearing; that one has the full story.

## 1. Project Scope

### Building
- MERN marketplace (React/Vite/Tailwind + Node/Express/MongoDB) + a Django/DRF
  ML microservice, built solo end-to-end.
- Core marketplace: JWT auth (buyer/seller/admin), listing CRUD with image
  upload, search/filter (brand/model partial match, fuel type, price/year/km
  range, trust score), buyer↔seller inquiry/chat with email notifications,
  wishlist, seller dashboard (view/edit/delete own listings), admin
  dashboard (moderate flagged listings), live market-analytics dashboard
  (MongoDB aggregation + Chart.js — see §6).
- 4 ML layers, all live and wired: price prediction (regression), fraud
  detection (classification), CNN condition assessment, combined Trust Score.
- Buyer-first guest landing page (shown only when logged out — see §8) plus
  a role-aware logged-in home page. Comprehensive, formula-consistent seed
  data for exercising every UI state (see §9).
- Automated tests: server (Vitest+Supertest, 54 tests), client (Vitest+RTL,
  122 tests — all pages covered, each with its own service mock), ml-service
  (Django test runner, 34 tests — includes
  view-level auth/validation/success/model-not-trained coverage for all
  four ML endpoints, model inference mocked via `unittest.mock.patch.object`).
  210 tests total, all passing as of 2026-08-04. Server tests must run with
  `--no-file-parallelism` (see §7) since they share one real MongoDB test DB.
- Light security hardening: helmet, rate-limiting on auth routes, NoSQL
  injection type-guards on every value that reaches a Mongoose query filter.
- Deployment prep exists (render.yaml, vercel.json, production Django config)
  but the project stays local + GitHub only, permanently — not "on hold"
  pending a go-ahead. Don't suggest deployment as a next step; if it ever
  comes up again, treat it as a brand-new explicit request, not a resumed one.

### Not building (deliberately out of scope, don't add without discussion)
- No real-time chat (Socket.io) — inquiries are plain REST, client polls.
- No payments/checkout of any kind.
- No web scraping (BeautifulSoup) for market data — researched and
  deliberately declined (2026-08-03), not just unstarted. Checked real
  marketplaces (CarDekho/Cars24/OLX: ToS explicitly prohibits scraping,
  confirmed in CarDekho's actual T&C text, not just robots.txt), official
  manufacturer price pages (Maruti Suzuki/Hyundai/Tata: all three are
  JS-rendered SPAs, price genuinely absent from the raw HTML `requests`
  receives — verified directly, not assumed), and government data (Vahan:
  wrong data — registration counts, not prices). Wikipedia is a real,
  legitimately scrapable exception (verified working) but only has specs/
  production years, not current prices. No live source exists that's both
  permitted and has real price data scrapable without a headless browser —
  don't re-research this from scratch, re-read this note first.
- No Dash for analytics — deliberately substituted with Node aggregation +
  React/Chart.js (see §6); Dash would mean a third server with its own
  auth/deployment story for no real benefit. Seaborn's syllabus mention is
  covered separately by `price_prediction/eda.py`, a data-science artifact
  over the training set, not a live-serving path.
- No depreciation forecasting, no agentic AI negotiation layer (spec's
  explicit Phase 2, not this project).
- `condition_assessment` CNN is proof-of-concept (63 training images, 8
  classes, one with a single positive example) — not production quality.
  Don't cite its accuracy as reliable. Fine-tunes MobileNetV2's last 50
  layers with class-weighted loss (macro-F1 ~0.09 -> ~0.19 over a frozen/
  unweighted baseline, per 5-fold CV) — a real improvement, still low in
  absolute terms; judge it on macro-F1, not `binary_accuracy` (misleading
  on this class imbalance).

## 2. Architecture — exact request flow

```
Browser → React (Vite, :5173)
             │  Axios, JWT in Authorization header
             ▼
        Node/Express (:5000)
             │  Mongoose ↔ MongoDB (valora_v1)
             │
             │  Only Node ever calls Django. The client NEVER calls
             │  ml-service directly.
             ▼
        Django/DRF ml-service (:8000)
```

On `POST /api/listings` (create), Node's `listingIntelligence.scoreListing()`
calls Django in sequence, synchronously, before responding to the client:

`condition (if images) → price → fraud → trust-score`

Each Django call carries a service JWT Node mints on the fly
(`mlService.js`'s `serviceToken()`): `{ service: 'valora-node' }` signed with
`JWT_SECRET`, 60s expiry. Django's `ServiceJWTAuthentication` verifies it
with the **same** `JWT_SECRET` — this is the only trust boundary between the
two backends, there is no separate Django user/session system.

Listing status is decided by this pipeline, not chosen by the seller:
`status = 'flagged' if ml.riskFlag == 'High' else 'active'`.

## 3. Database Schema (MongoDB / Mongoose)

**User**
| field | type | notes |
|---|---|---|
| name, email, password | String | password `select: false`, bcrypt-hashed on save |
| role | enum | `buyer` \| `seller` \| `admin`, default `buyer` |
| responseRate, pastDeals | Number | seller-history inputs for Trust Score |
| wishlist | [ObjectId → Listing] | `$addToSet`/`$pull`, not `push`/manual filter |
| accountAgeDays | virtual | `(Date.now() - createdAt) / 1 day`, used by fraud/trust calls |

**Listing**
| field | type | notes |
|---|---|---|
| seller | ObjectId → User | |
| brand, model | String | free-text; search does case-insensitive partial match |
| year, kmDriven, price | Number | |
| fuelType | enum | `Petrol\|Diesel\|Electric\|CNG\|LPG\|Hybrid` |
| transmission | enum | `Manual\|Automatic` |
| images | [String] | forward-slash paths, e.g. `uploads/listings/x.jpg`, served via `express.static('uploads')` |
| status | enum | `pending_review\|active\|sold\|flagged` |
| ml.* | embedded | see API contract below — field names mirror Django's response 1:1 (snake_case → camelCase) |

Compound index: `{ brand: 1, model: 1, year: 1, price: 1 }`.

**Inquiry**: `listing`, `buyer`, `seller` (all ObjectId refs) + `messages: [{ sender, text, timestamps }]`. `findOne({listing, buyer})` reuses an existing thread instead of creating duplicates per message. Archive/read state is per-party, not a single shared flag (`buyerArchived`/`sellerArchived`, `buyerLastReadAt`/`sellerLastReadAt`) — an inquiry always has exactly two participants, so one field per side is simpler than a generic participants array. `inquiryController.js`'s `toClientInquiry()` resolves these down to `archived`/`unread` from "whoever is asking"'s perspective and strips the raw per-party fields entirely before the response leaves the server — the other party's read/archive state is never sent to the client. Sending a message (`createInquiry` or `addMessage`) stamps the *sender's own* `*LastReadAt`, not the recipient's. `unread` only depends on the **last** message in the thread (not full history): true iff the last message wasn't from the caller and (no `*LastReadAt` yet, or that timestamp predates the last message). `Inquiries.jsx` shows a light/dark-aware chat wallpaper behind the message list (`.chat-wallpaper` rules in `client/src/index.css`, images in `client/src/assets/chat-bg-{light,dark}.webp`) — the dark variant is wired but dormant until the app gets a dark-mode toggle.

## 4. API Contract (Node ↔ Django, under `/api/ml/`)

All four require `Authorization: Bearer <service JWT>`.

```
POST /predict-price/
→ { brand, model, year, km_driven, fuel_type, transmission, condition_score }
← { predicted_price_min, predicted_price_max, confidence_level, feature_importance }

POST /detect-fraud/
→ { price, predicted_price_min, predicted_price_max, seller_account_age_days,
    has_missing_details, num_previous_listings }
← { risk_flag, fraud_probability, reasons: [] }

POST /assess-condition/  (multipart, images[])
← { visual_condition_score, detected_damages: [{ part, damage_type, confidence }] }
    part is "unknown" unless the (rare) real dataset-trained classes match

POST /trust-score/
→ { price_fairness_score, fraud_risk_score, condition_score,
    seller_history: { response_rate, past_deals, account_age_days } }
← { trust_score, breakdown: { price_fairness, fraud_risk, condition_match, seller_factor } }
```

Client-facing REST (Node, `/api/`): `auth/{register,login,me}`,
`listings/{,mine,admin,analytics,:id}` (GET/POST/PATCH/DELETE),
`inquiries/{,:id/messages,:id/read,:id/archive}`, `users/me/wishlist{,/:listingId}`.
`GET /inquiries` returns each thread with resolved `archived`/`unread`
booleans (see §3's Inquiry note) instead of raw per-party fields.
`PATCH /inquiries/:id/read` marks a thread read for the caller only (204,
no body — client updates optimistically, same pattern as wishlist add/
remove). `PATCH /inquiries/:id/archive` takes `{ archived: boolean }` and
sets the caller's own archive flag (204) — archiving is reversible by
sending `archived: false`, unlike listing delete, so it doesn't need a
confirmation dialog.
`listings/mine`, `listings/admin`, and `listings/analytics` are registered
**before** `listings/:id` in the router — reordering breaks them (Express
reads them as the `:id` param otherwise). `GET /listings/analytics`
(seller/admin only) returns `{ byBrand, byFuelType, byYear, byCondition }`,
each an array of `{ <dimension>, avgPrice, count }` aggregated over
`status: 'active'` listings only — flagged/sold/pending listings never
skew the averages.

`Listings.jsx` (client) seeds its filter state from `useSearchParams()` on
mount — `?brand=`, `?fuelType=`, `?minPrice=`, `?maxPrice=` — so the landing
page's hero search box and category tiles can deep-link straight into a
pre-filtered listings view (§8) without any server-side change; these are
just the existing `GET /listings` query filters read from the URL instead
of only from in-page filter controls.

## 5. Trust Score Formula (`trust_score/scoring.py`)

```
trust_score = min(100, round(
    0.4 * price_fairness_score +
    0.3 * fraud_risk_score +
    0.3 * condition_score +
    seller_bonus
, 2))

seller_bonus = min(5.0,                                    # MAX_SELLER_BONUS
    (response_rate / 100) * 1.0 +
    min(past_deals, 10) / 10 * 0.5 +
    min(account_age_days, 365) / 365 * 1.0
)
```

Worked example (matches the spec doc exactly): `95, 90, 85` +
`{92, 5, 180}` → `trust_score = 92.16`,
`breakdown = {38.0, 27.0, 25.5, 1.66}`.

Note: the three seller-bonus components max out at `1.0 + 0.5 + 1.0 = 2.5` —
`MAX_SELLER_BONUS = 5.0` can never actually bind given current weights. Not
a bug, just don't assume the cap is reachable if you change the weights.

## 6. Analytics Dashboard

Spec says "Plotly/Dash" — built as Node aggregation + React/Chart.js
instead, deliberately: Dash is a standalone Python web framework, and
embedding it would mean a third server with its own auth/deployment story
next to React/Node/Django, for a feature that's just charts over data Node
already owns. `GET /api/listings/analytics` (seller/admin only) runs four
real MongoDB aggregation pipelines (`$group`, `$bucket` for the condition-
score ranges) over `status: 'active'` listings, rendered by `Analytics.jsx`.
Grows/changes with the live marketplace — not a snapshot of training data.

Seaborn's syllabus mention is `ml-service/price_prediction/eda.py`
(`python -m price_prediction.eda`) instead — a data-science artifact over
the training dataset (price-by-fuel-type, depreciation trend, price-vs-
mileage, correlation heatmap), not a live-serving path. Its heatmap is
worth rereading before touching `condition_score`'s role in price
prediction: it shows a 0.81 correlation between `condition_score` and
`year`, direct visual confirmation of the synthetic-proxy caveat already
noted in `price_prediction/prepare_data.py`.

## 7. Critical DO NOTs

- **Don't let `server/.env` and `ml-service/.env`'s `JWT_SECRET` drift apart** — every Django ML call fails auth (401) the instant they differ.
- **Don't recreate `ml-service/venv` with plain `python`** — must be `py -3.13`. TensorFlow has no Python 3.14 wheels; this is a real, tested constraint, not caution.
- **Don't add a `next` parameter to a Mongoose pre/post hook** — Mongoose 9 hooks are promise-based; calling `next()` throws. Async hooks take zero params and just `return`.
- **Don't add a DRF `BaseAuthentication` subclass without `authenticate_header()`** — without it, DRF silently turns every 401 into 403 (bit us once already, see `core/authentication.py`).
- **Don't replace the `SELLER_UPDATE_FIELDS` whitelist in `updateListing` with `Object.assign(listing, req.body)`** — that reopens the hole where any PATCH could overwrite `seller`, `ml`, or `_id`. Only admins may set `status`; sellers may not self-approve or self-unflag.
- **Don't re-score a listing's ML fields on edit** — deliberate. A seller lowering a flagged listing's price does NOT auto-clear the flag; only an admin approving it does. If you change this, update `EditListing.jsx`'s warning text too.
- **Don't commit raw Kaggle datasets or `.env`/`.env.test` files** — gitignored on purpose (license/secrets). Trained model artifacts (`*.joblib`, `*.keras`) are the one exception — those ARE committed deliberately (deployment needs working models on first boot); see README's "Training data" section.
- **Don't build a Dash app for analytics** — the live seller dashboard is Node aggregation + React/Chart.js on purpose (§6's own reasoning); Seaborn's syllabus mention is `price_prediction/eda.py` instead, a separate report artifact.
- **Don't run server tests with `fileParallelism: true`** — they share one real MongoDB test database (`valora_v1_test`); parallel files race on the `afterEach` cleanup (reproduced this exact failure once).
- **Don't point `server/.env.test`'s `MONGODB_URI` at a non-`_test` database** — `tests/setup.js` throws on purpose rather than risk wiping dev/seed data.
- **Don't relax `Cross-Origin-Resource-Policy` app-wide to fix image loading** — helmet's default `same-origin` policy blocks the Vite client (different origin) from loading `/uploads` images; the fix is a route-scoped `cross-origin` override on just that static route (`app.js`), not disabling/loosening helmet globally.
- **Don't hand-pick `ml.trustScore`/`riskFlag`/`trustBreakdown` values in `seed.js`** — it re-implements the real scoring/fraud-threshold formulas locally (`priceFairnessFromRange`, `riskFlagFor`, `computeTrust`, etc.) so seeded data matches what the production pipeline would actually compute. If `trust_score/scoring.py` or `fraud_detection/inference.py`'s thresholds ever change, update the mirrored copies in `seed.js` too.

## 8. Landing Page Architecture

Guest-only (`Home.jsx`: `if (!user) return <LandingPage />`), buyer-first
by deliberate decision. Section components live in
`client/src/components/landing/`, rendered in order by `LandingPage.jsx`:
`LandingHero` (search → `/listings?brand=`) → `FeaturedListings` (real
first-3 listings, renders nothing if zero) → `WhyValora` (static AI-feature
cards) → `TrustScoreShowcase` (real highest-`trustScore` listing via
`AnimatedTrustScore`/`TrustBreakdownRow` — same components
`ListingDetail.jsx` uses; falls back to a hardcoded example explicitly
labeled "Example" only if nothing is scored yet) → `BrowseByCategory`
(static tiles → `/listings?fuelType=`/`?maxPrice=`) → `HowItWorks` →
`SellerCta` (→ `/register`, not `/sell`) → `Faq` (shadcn `ui/accordion.jsx`)
→ `FinalCta` → `LandingFooter` (oversized wordmark as the dominant visual
element, plus a real nav row: Browse listings, Sell a car, Log in, Sign up
— no GitHub/fake support/social links, since this footer only ever renders
logged-out).

`AnimatedTrustScore.jsx` and `TrustBreakdownRow.jsx` were extracted out of
`ListingDetail.jsx` specifically so the showcase renders real trust-score
data with the exact same visual treatment as the detail page — reuse them
for any future trust-score UI rather than duplicating.

Known test-environment caveat: `AnimatedTrustScore` counts up via
`requestAnimationFrame`; in a non-frame-compositing headless browser
context it can render stuck at `0` even though the underlying
`ml.trustScore` is correct — verify via the API response body if this
comes up, not just the rendered number.

## 9. Seed Data

`server/src/scripts/seed.js`, run via `npm run seed` from `server/`
(`MONGODB_URI` must point at a real, non-test DB — it deletes and replaces
all Users/Listings/Inquiries every run). Creates 10 users (1 admin, 5
sellers with varied history/age — one with zero listings, one brand-new/
no-history feeding a deliberately flagged listing — 4 buyers, all password
`password123`), 20 listings (9 brands, all 6 fuel types, both
transmissions, all 4 price tiers, all 3 trust tiers, 0/1/multi images,
empty/complete descriptions, ages 12h–90d — every dimension has ≥2-3
records; 4 land `status: 'flagged'`), and 10 inquiries (every unread/read/
archived combination, tracked independently per buyer and seller per §3's
model note, single- and multi-message, varied timestamps).

`ml.*` fields are computed by helper functions in the script that mirror
the real `trust_score/scoring.py` and `fraud_detection/inference.py`
formulas exactly (see §7's DO NOT) — never arbitrary numbers. Images come
from a git-tracked placeholder folder, `server/src/scripts/seed-assets/`
(5 small synthetic JPGs, clearly labeled as placeholders), copied into the
gitignored `uploads/listings/` at seed time so the script is
self-contained from a fresh clone. Seeding bypasses `POST /api/listings`
(direct `Listing.create()`), so these images never go through the real
condition-assessment CNN.
