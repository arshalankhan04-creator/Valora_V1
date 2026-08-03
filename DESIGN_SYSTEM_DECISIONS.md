# Valora — Visual Redesign: Architecture & Design Decisions

This document captures the decisions made before implementation began on
the visual redesign — what stack was chosen and why, what was deliberately
rejected, the exact theme tokens being wired in (with the adjustments
agreed on), and the scope boundaries for this pass. Written so a future
session (or anyone else) can pick this up without re-deriving any of it.

**Context:** the marketplace is fully functional. This redesign changes
**only** the visual layer — components, styling, layout chrome, and
UI-level polish (loading states, confirmations, feedback). No route,
API contract, database schema, or business logic changes as part of this
work.

---

## 1. Stack Decision

| Layer | Choice |
|---|---|
| Styling engine | Tailwind CSS v4 (already in place) — theme tokens wired in via `@theme inline`, no parallel CSS system |
| Custom CSS | One `theme.css`-equivalent block in `index.css`: token definitions (`:root`/`.dark`) + one `.shadow-brand` utility for the tinted shadow recipe Tailwind can't express natively |
| Component library | **shadcn/ui** — copied-in source (Radix UI + Tailwind), not an opaque dependency |
| Animation (component-tied) | **Framer Motion** |
| Animation (micro-interaction) | Plain Tailwind `transition-*` utilities |
| Icons | **Lucide Icons** (matches shadcn/ui's default icon convention) |
| Variant plumbing | `class-variance-authority`, `clsx`, `tailwind-merge` — installed automatically as part of shadcn/ui setup, not evaluated separately |

**Explicitly rejected:**
- **GSAP / GSAP + ScrollTrigger** — built for timeline-based, scroll-driven choreography (hero sections, SVG morphing, long-scroll marketing narratives). Nothing in Valora's actual page inventory (Listings, Detail, Dashboards, Inquiries, Analytics) is a long-scroll narrative page. Framer Motion covers every realistic animation need here with one less library.
- **A full UI kit (MUI / Ant Design / Chakra)** — would impose its own design language and fight the custom, already-finalized token system. The entire point of this pass is a *custom* theme, not someone else's.
- **CSS-in-JS (styled-components / Emotion)** — redundant runtime cost next to a utility-first system already in place across the whole codebase.
- **"UI/UX Pro Max" skill** (github.com/nextlevelbuilder/ui-ux-pro-max-skill) — evaluated and rejected. It's fundamentally a *design-system-generator-from-scratch* tool (84 UI styles, 192 industry-aligned palettes, reasoning engine that picks colors/fonts/patterns by product category) aimed at projects that don't have a theme yet. Valora already has a fully-specified, deliberately-chosen theme — installing it risked the tool proposing a *different*, genre-generic palette that would contradict the theme already finalized, for no capability this project doesn't already have covered.

---

## 2. Layout Decisions

- **Keep the existing top navigation (`Layout.jsx`) for all pages.** No sidebar introduced in this redesign, despite the theme including a full `--sidebar-*` token family (that family stays defined and unused for now — see §4).
- **Light theme only, implemented now.** The `.dark` token block stays defined in `index.css` for future use, but no `dark:` Tailwind variants get wired into any component in this phase. Dark mode is a deliberately separate, later decision.

---

## 3. Theme Tokens — As Wired In

The provided theme (light + dark HSL custom properties, `@theme inline`
mapping) is used as given, with five specific adjustments made during
review before implementation:

1. **Radius scale, not one flat value.** `--radius: 1.25rem` applied
   uniformly to every element (badges, small buttons, cards) felt bubbly
   rather than polished. Derived a scale instead:
   ```css
   --radius-sm: calc(var(--radius) - 8px);   /* badges, small buttons */
   --radius-md: calc(var(--radius) - 4px);   /* inputs, standard buttons */
   --radius-lg: var(--radius);                /* cards, dialogs, modals */
   ```
2. **Letter-spacing scoped to headings only.** `-0.03em` (light) /
   `-0.02em` (dark) applied globally made body text at 13–14px feel
   cramped. Applied only to heading/display-scale text; body text uses a
   lighter `-0.01em`.
3. **`--destructive` lightness nudged for contrast safety.** The original
   `hsl(0, 84%, 60%)` with white foreground text sat close enough to the
   WCAG AA threshold (4.5:1) to be worth a safety margin — nudged to
   `hsl(0, 84%, 54%)` in light mode.
4. **`--chart-3` (light mode) lightened for categorical distinguishability.**
   The original `hsl(150, 60%, 15%)` was notably darker than the other
   four chart colors (L 36–60%), risking that series visually
   disappearing in a 5-series chart. Changed to a teal `hsl(190, 70%, 42%)`
   in light mode (dark mode's `hsl(190, 80%, 60%)` was already fine and
   is unchanged).
5. **`--font-serif: Georgia` kept but currently unused.** No component
   uses it yet; left in place in case a future large-price or
   editorial-style treatment wants it, rather than dropped.

The `--sidebar-*` family is preserved in the token file as-is (unused,
per the layout decision in §2) so it costs nothing to adopt later if a
dashboard-style sidebar is ever introduced for the Seller/Admin/Analytics
pages.

---

## 4. Component Library — shadcn/ui Adoption Plan

shadcn/ui was chosen specifically because its default token convention
(`--card`, `--popover`, `--muted`, `--accent`, `--destructive`, `--ring`,
`--sidebar-*`, `--chart-1..5`) already matches the theme provided —
near-zero translation work between "the theme" and "the component
library's expectations."

**Components being adopted, mapped to what they replace:**

| shadcn component | Replaces | File(s) affected |
|---|---|---|
| `Dialog` / `AlertDialog` | `window.confirm(...)` before delete | `SellerDashboard.jsx`, `AdminDashboard.jsx` |
| `Sonner` (toast) | Inline `<p className="text-red-600">{error}</p>` pattern | Nearly every page |
| `Skeleton` | `{loading && <p>Loading...</p>}` | Every data-fetching page |
| `Badge` | Hand-rolled color-tier `<span>` logic | `TrustScoreBadge`, `RiskFlagBadge`, `StatusBadge` |
| `Button` | Hand-rolled `<button className="bg-gray-900 ...">` | Everywhere |
| `Input` / `Textarea` / `Label` | Hand-rolled form fields | `ListingForm`, `Login`, `Register`, `Inquiries` reply box |
| ~~`Select`~~ | Kept native `<select>`, restyled | See correction below |
| `Dropdown Menu` | Plain nav links | `Layout.jsx` (logged-in user menu) |
| `Tabs` | — (optional, nice-to-have) | `Inquiries.jsx` thread/conversation split, if it improves the layout |
| `Avatar` | Plain text initials | `Inquiries.jsx` |

**Deliberately not touched:** `Analytics.jsx`'s Chart.js integration.
It already works and is tested; migrating it to a shadcn chart wrapper is
a real refactor with real risk for a purely cosmetic benefit, and is out
of scope for this pass. Only the page's wrapper/card chrome around the
charts gets restyled (including swapping the hardcoded `#111827` bar/line
color for the theme's primary green).

**Implementation-time correction: `Select` was dropped from the adoption
list.** Discovered while implementing `Register.jsx`'s role picker: the
existing test drives it with `userEvent.selectOptions(...)` and asserts
`toHaveValue('buyer')` — both are native-`<select>`-only APIs. Radix's
`Select` renders a button + portal-based listbox, not a real `<select>`,
so it doesn't support `selectOptions()` and has no meaningful `.value` to
assert on. Swapping every simple option-picker (role select, fuel-type
filter, status filter) to Radix Select would have meant rewriting their
test interaction patterns for a component that isn't meaningfully better
here — native `<select>` is fully accessible and arguably preferable for
short, single-choice lists, especially on mobile. Kept native `<select>`
everywhere, restyled with Tailwind classes matching the input/button
theme (border, radius, focus ring) instead of swapping to Radix.

---

## 5. Animation Strategy

Filter applied to every animation decision: **does it reduce perceived
latency or add clarity, or is it decoration?** Only the former is used.

**Where animation is used:**
- Skeleton → content fade-in on every data-fetching page (the single
  highest-value change in the whole redesign).
- Wishlist heart toggle: a small scale/pop on click, reinforcing the
  optimistic update already in `WishlistContext`.
- Dialog/toast enter-exit (scale+fade for `AlertDialog`, slide-in for
  `Sonner` toasts).
- Status/risk-flag badge transition when a value changes in place (e.g.
  admin approving a listing without a full reload).
- Light staggered fade-up for listing grid entrance (`Listings.jsx`,
  `Wishlist.jsx`) on first load.
- Trust Score count-up animation on `ListingDetail.jsx` — reinforces the
  "AI is evaluating this" narrative the whole product is built around.

**Explicitly avoided:** parallax scrolling, autoplaying carousels/marquees,
animating every hover across a listing grid, anything that delays
perceived responsiveness on form submission or filter changes, extra
animation layered on top of Chart.js's own built-in animations.

---

## 6.5 Other Implementation Notes

- **Loading states use `Skeleton` + visually-hidden text, not `Skeleton`
  alone.** A skeleton with no accompanying text is a known accessibility
  anti-pattern — screen-reader users get no indication content is
  loading. Every loading state pairs a `Skeleton` (visual) with an
  `sr-only` "Loading..." span inside an `aria-live="polite"` container
  (screen-reader announcement). This is the more correct accessible
  implementation, and it also happens to mean none of the existing tests
  asserting literal "Loading..." text needed to change.
- **`window.confirm` → `AlertDialog` is a real interaction-flow change,
  not just cosmetic.** `window.confirm()` blocks synchronously; `AlertDialog`
  opens/closes asynchronously with its own Cancel/Confirm buttons. Tests
  for `SellerDashboard`/`AdminDashboard`'s delete flows were rewritten
  accordingly (click trigger → find the dialog via its `alertdialog` role
  → click Cancel or the in-dialog confirm button), not just left broken.
- **Inline errors → `Sonner` toasts, scoped to transient action failures
  only.** Applied to delete/approve/remove failures (the underlying list
  is still visible and interactive — a toast is sufficient feedback).
  *Not* applied to initial data-load failures (`getMyListings`,
  `getAdminListings`, etc.) — those describe the actual page state, not a
  one-off event, and stay as inline text so the message doesn't disappear
  while the page is still genuinely empty/broken.
- **`ListingDetail.jsx` gained a Trust Score breakdown card.** The API
  already returns `ml.trustBreakdown` (price fairness / fraud risk /
  condition match / seller factor), but no UI ever displayed it before
  this pass — only the small badge's final number. Added one card
  surfacing the full breakdown with a Framer Motion count-up on the
  headline number. Zero backend risk (uses data the API already returns),
  and gives the count-up animation planned in §5 a natural home without
  animating the same badge everywhere it's reused (list cards, dashboards).

## 6. Scope Boundaries (Restated)

- No architecture, routing, API contract, or business-logic changes.
- No sidebar layout in this pass (§2).
- No dark mode wiring in this pass (§2) — tokens only.
- No changes to `Analytics.jsx`'s chart internals (§4).
- Existing automated test *behavior* (what a user can do, what they see)
  must still pass — where a test asserts UI text/structure that
  legitimately changes as part of the redesign (e.g. a literal
  `"Loading..."` string being replaced by a `Skeleton`), the test gets
  updated to match the new UI, not skipped or deleted.
