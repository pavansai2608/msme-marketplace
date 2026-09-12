# MSME Marketplace — Code Audit

Read-only audit. No code changed.

---

## 1. Data model

Five Mongoose schemas, all in `msme-backend/models/`.

### User (`models/User.js`) — collection `users`
| Field | Type | Notes |
|---|---|---|
| name | String | required, trim |
| email | String | required, unique, lowercase, indexed |
| password | String | `select: false`; bcrypt hash cost 12 in pre-save |
| googleId | String | indexed |
| avatar | String | stores full base64 data URI when uploaded from Profile |
| role | String | enum `seller` / `buyer` / `admin`, default `buyer` |
| businessName | String | seller |
| panCardName | String | seller |
| district | String | seller |
| state | String | seller |
| coordinates | { lat: Number, lng: Number } | never written by any controller |
| isProfileComplete | Boolean | default false |
| isVerified | Boolean | default false; set true only by Google login |
| wishlist | [ObjectId → Product] | buyer |
| savedAddresses | [subdoc] | name, phone, pincode, locality, street, city, state, landmark, altPhone, type (default 'Home'), isDefault (default false) |
| lastLogin | Date | set on password login only |
| resetPasswordToken | String | sha256 of emailed token |
| resetPasswordExpire | Date | |
| timestamps | | createdAt / updatedAt |

Methods: `matchPassword(entered)` → bcrypt.compare.

### Product (`models/Product.js`) — collection `products` (explicit)
| Field | Type | Notes |
|---|---|---|
| seller | ObjectId → User | required |
| name, description, category | String | required |
| price | Number | required |
| images | [String] | URL or base64 |
| sizes | [{ size: String, stock: Number }] | both required |
| totalStock | Number | recomputed in pre-save from `sizes` |
| district, state | String | indexed; copied from seller's User on create |
| sku | String | unique + sparse; auto-generated `MSME-XXXXXX` in pre-save |
| isActive | Boolean | default true |
| lowStockThreshold | Number | default 5 — never read anywhere |
| autoDelist | Boolean | default true; pre-save sets `isActive=false` when totalStock is 0 |
| rawMaterials | [{ name, quantityPerUnit, stock }] | never read or written |
| rating | Number | default 0, never updated |
| numReviews | Number | default 0, never updated |

Indexes: text index on name/category/description (unused — search uses `$regex`), plus category, seller, createdAt.

### Cart (`models/Cart.js`)
- `user` ObjectId → User, required, **unique** (one cart per user)
- `items[]`: `product` ObjectId → Product (required), `quantity` Number (default 1), `size` String (required)
- timestamps

### Order (`models/Order.js`)
- `buyer` ObjectId → User, required
- `products[]`: `product` ObjectId → Product, `quantity`, `size`, `price` (snapshot), `seller` ObjectId → User — all required
- `shippingAddress`: { name, street, city, state, pincode, phone } — embedded, not a ref. Checkout sends `locality`/`landmark`/`altPhone` too; those are dropped by the schema.
- `totalAmount` Number required (includes shippingFee)
- `shippingFee` Number default 0
- `status` enum: Ordered / Packed / Dispatched / Shipped / Delivered / Cancelled, default Ordered
- `paymentStatus` enum: Pending / Completed / Failed, default Pending
- `trackingId`, `awbNumber` String; `logisticsProvider` String default 'Shiprocket'
- timestamps

### Scheme (`models/Scheme.js`) — collection `schemes` (explicit)
- `title`, `benefit`, `eligible` String required
- `district` String default 'All India' (actually holds state names in the seed data)
- `category` String default 'All Categories'
- `isActive` Boolean default true
- timestamps. Indexes: (district, category, isActive); text on title/benefit.

### Relations
- User 1—N Product (`Product.seller`)
- User 1—1 Cart (`Cart.user` unique)
- Cart N—1 Product (`items.product`)
- User 1—N Order as buyer; User 1—N order-line as seller (`products.seller`)
- User N—N Product via `wishlist`
- Scheme is standalone — no relations.

---

## 2. API routes

Mounted in `server.js`. "Auth" = `verifyToken` middleware. **No route anywhere checks `role`.**

### `/api/auth` (`routes/auth.js`)
| Method | Path | Auth | Does |
|---|---|---|---|
| GET | /ping | no | returns `{msg:'auth api online'}` |
| POST | /register | no (rate-limited) | create user, set cookie + return JWT |
| POST | /login | no (rate-limited) | password login, updates lastLogin |
| GET | /me | yes | `User.findById(req.user.id)`, full doc |
| PUT | /update-profile | yes | updates businessName, name, panCardName, role, avatar, state, district, isProfileComplete; returns a fresh token |
| POST | /logout | yes | clears `token` cookie |
| POST | /forgot-password | no | emails reset link via nodemailer |
| POST | /reset-password/:token | no | sets new password, logs user in |
| GET | /google | no | passport redirect |
| GET | /google/callback | no | sets cookies, redirects to `${CLIENT_URL}/buyer` |

### `/api/user` (`routes/userRoutes.js`) — all authed (`router.use(verifyToken)`)
| Method | Path | Does |
|---|---|---|
| GET | /wishlist | populated wishlist |
| POST | /wishlist/toggle | body `{productId}`; add/remove |
| DELETE | /wishlist/:id | remove one |
| GET | /addresses | list savedAddresses |
| POST | /addresses | append address |
| PUT | /addresses/:id | Object.assign onto subdoc |
| DELETE | /addresses/:id | filter out subdoc |

### `/api/products` (`routes/productRoutes.js`)
| Method | Path | Auth | Does |
|---|---|---|---|
| GET | /categories | no | `Product.distinct('category')` |
| GET | / | no | filter by search / category / district / state; populates seller name+businessName |
| GET | /:id | no | one product |
| POST | / | yes | create; forces `seller = req.user.id`, copies district/state from user |
| GET | /seller/me | yes | products of caller |
| PUT | /:id | yes | ownership checked against `product.seller` |
| DELETE | /:id | yes | ownership checked |

Route-order note: `/categories` and `/seller/me` sit before `/:id`, so they resolve correctly.

### `/api/orders` (`routes/orderRoutes.js`) — all authed
| Method | Path | Does | Ownership check |
|---|---|---|---|
| GET | /my-orders | buyer's own orders | scoped by `buyer: req.user.id` |
| GET | /seller | orders containing caller's products | scoped by `products.seller` |
| GET | /seller/stats | Delivered-only revenue, active order count, daily revenue for current month | scoped |
| GET | /seller/forecast | see §4 | scoped |
| GET | /track/:trackingId | full order incl. buyer name/email | **none — any logged-in user can read any order by tracking ID** |
| PUT | /:id/status | set status | yes, caller must be a seller on the order |
| PUT | /:id/assign-carrier | set logisticsProvider / trackingId / status | yes |
| POST | /:id/generate-waybill | fake AWB `SR<random>`, status → Dispatched | **none — any logged-in user can dispatch any order** |
| POST | /checkout | place order from cart | own cart |

### `/api/cart` (`routes/cartRoutes.js`) — all authed
GET `/`, POST `/add`, PUT `/update`, DELETE `/remove` (body), DELETE `/:productId/:size`. Stock is validated on add and update.

### `/api/schemes` (`routes/schemeRoutes.js`)
GET `/` — authed. Seeds 23 hardcoded schemes into the DB on first call if the collection is empty, then filters by district/category.

### Other
GET `/health` — no auth.

---

## 3. Auth

**Login flow** (`controllers/authController.js`):
1. `POST /api/auth/login` → `User.findOne({email}).select('+password')` → `bcrypt.compare`.
2. `signToken(user._id)` signs `{ id }` with `JWT_SECRET`, expiry `JWT_EXPIRE` or `7d`.
3. `sendToken` sets cookie `token` (`httpOnly: true, secure: false, sameSite: 'lax'`, 7 days) **and** returns the token in the JSON body.

**Token storage** — two places at once:
- httpOnly cookie `token`, sent automatically via `withCredentials: true`.
- `localStorage.token`, written by `saveToken()` in `src/api/authApi.js` on login, register, `getMe`, and `updateProfile`; sent as `Authorization: Bearer` by the request interceptor.

`middleware/authMiddleware.js` accepts either, cookie first. Google login also sets a non-httpOnly `display_name` cookie.

**Weaknesses:**
1. **No role enforcement anywhere.** `role` exists on the User model and is never checked in any route or controller. Any logged-in buyer can call `POST /api/products`, `/api/orders/seller/*`, and reach `/seller` and `/admin` in the UI.
2. **`PUT /api/auth/update-profile` accepts `role` from the request body.** Any user can promote themselves to `admin`.
3. **JWT in localStorage** defeats the httpOnly cookie — readable by any XSS. The app stores the full user object there too.
4. **`verifyToken` never hits the DB** (deliberate, commented as an optimization). A deleted or demoted user keeps full access until the 7-day token expires. The comment claims the payload carries name/role/businessName; it carries only `{ id }`.
5. **`secure: false` is hardcoded** on every auth cookie — tokens travel in cleartext over HTTP in production.
6. **`process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'`** at the top of `server.js`, plus `tlsAllowInvalidCertificates` / `tlsAllowInvalidHostnames` in `config/db.js`. All TLS verification is disabled process-wide, including the Mongo and Shiprocket connections.
7. **Two ownership gaps**: `POST /api/orders/:id/generate-waybill` and `GET /api/orders/track/:trackingId` do no seller check.
8. **Rate limiter applies only to `/register` and `/login`** — not to `/forgot-password` or `/reset-password/:token`. It is in-memory and per-process, keyed on `req.ip`; behind the nginx proxy every request shares one key.
9. **`/forgot-password` returns 404 for unknown emails** — user enumeration.
10. **Password policy is client-side only** (min 6 chars in the React forms). The model enforces no minimum, so API-direct registration accepts any password.
11. No CSRF protection, and the cookie is `sameSite: 'lax'` with `credentials: true` CORS.

---

## 4. Recommendation system

**There is no product recommendation system.** No collaborative filtering, no content-based similarity, no popularity ranking, no ML model, no Python service, no ML dependency in either `package.json`. Buyers see products sorted by `createdAt: -1`, nothing else.

What exists is a **seller-facing demand forecast**, one function:

- Backend: `msme-backend/controllers/orderController.js` → `getSellerForecast` (lines 119–210), route `GET /api/orders/seller/forecast`.
- Frontend: `msme-frontend/src/pages/seller/SellerDashboard.jsx` → `AnalyticsTab` (line 767), fetched at line 1632.

Method: **arithmetic on historical order quantities.** Core of it:

```js
const avgDailyDemand = totalSold / Math.max(30, (dateNow - (product.createdAt || last30Days)) / (1000 * 60 * 60 * 24));
const trendMultiplier = recentSales > (totalSold / 2) ? 1.4 : 1.0; // Simulated XGBoost trend boost

const forecast = [
  { period: '7 Days',  quantity: Math.ceil(avgDailyDemand * 7  * trendMultiplier) },
  { period: '15 Days', quantity: Math.ceil(avgDailyDemand * 15 * trendMultiplier) },
  { period: '30 Days', quantity: Math.ceil(avgDailyDemand * 30 * trendMultiplier) }
];
```

Stock advice, same function:

```js
if (product.totalStock < predictedDemand30) {
  inventoryStatus = "understock";
  recommendedStock = Math.ceil(predictedDemand30 * 1.5); // 50% Safety Stock
  ...
} else if (product.totalStock > predictedDemand30 * 3) {
  inventoryStatus = "overstock";
```

**Verdict: real arithmetic, not a stub — it reads actual orders and returns numbers that change with data. But it is not machine learning.** The comment `// Simulated XGBoost trend boost` is a hardcoded `1.4` constant. The UI labels it "XGBoost-driven forecasting & Linear Programming for stock optimization" (`SellerDashboard.jsx:781`) and "AI Recommended Stock"; there is no XGBoost and no linear programming in the codebase. The "Smart Insights" strings are three fixed if-statements, and one entry in `global_recommendations` is the constant string `"Consider seasonal stocking for upcoming regional festivals."`.

---

## 5. Frontend pages

Routes in `src/App.jsx`. **No route is role-gated or auth-gated**; any URL is reachable by anyone, and unauthenticated API calls simply 401 and bounce to `/login` via the axios interceptor.

| Route | File | Shows | Intended role |
|---|---|---|---|
| `/login` | `pages/Login.jsx` | email/password form, Google button, split marketing panel | all |
| `/register` | `pages/Register.jsx` | name/email/password, Google button; no role picker | all |
| `/forgot-password` | `pages/ForgotPassword.jsx` | email → reset link | all |
| `/reset-password/:token` | `pages/ResetPassword.jsx` | new password form | all |
| `/` and `/dashboard` | — | both redirect to `/buyer` | — |
| `/buyer` | `pages/buyer/BuyerDashboard.jsx` | product grid, search, category + district filters, wishlist toggle, add-to-cart; localStorage-cached | buyer |
| `/product/:id` | `pages/buyer/ProductDetail.jsx` | images, price, size picker, qty, add-to-cart, buy-now, wishlist | buyer |
| `/cart` | `pages/buyer/CartPage.jsx` | cart lines, qty update, remove, total | buyer |
| `/checkout` | `pages/buyer/Checkout.jsx` | address form (with geolocation via Nominatim), order summary, place order | buyer |
| `/order-success` | `pages/buyer/OrderSuccess.jsx` | confirmation ID, amount. "ESTIMATED DELIVERY: TOMORROW BY 11 PM" is hardcoded | buyer |
| `/my-orders` | `pages/buyer/MyOrders.jsx` | order list with a 4-step status tracker | buyer |
| `/addresses` | `pages/buyer/Addresses.jsx` | CRUD on saved addresses, geolocation autofill | buyer |
| `/wishlist` | `pages/buyer/Wishlist.jsx` | wishlist grid, move-to-cart, remove | buyer |
| `/profile` | `pages/buyer/Profile.jsx` | name, email, role, join date; avatar upload as base64 | buyer |
| `/seller` | `pages/seller/SellerDashboard.jsx` | 1855 lines, 8 tabs — see below | seller |
| `/admin` | `pages/admin/AdminDashboard.jsx` | 4 stat cards and a table, **all values hardcoded**; no API call | admin |
| `*` | — | redirect to `/login` | — |

Seller dashboard tabs (`SellerSidebar`, line 887): Market Overview, Boutique Inventory, AI Analytics, Customer Orders, Logistics Panel, Finance & Loans, Govt Schemes, Hub Settings. It renders `SellerOnboarding` inline (not a route) when `!user.businessName && !user.isProfileComplete`.

Shared components: `BuyerNavbar.jsx` (560 lines — search, district picker, category menu, cart/wishlist counts), `GoogleAuthBtn.jsx`, `PWAInstallPrompt.jsx`, `ErrorBoundary.jsx`.

---

## 6. Finished / half done / dead

### Finished and wired end to end
- Email+password register, login, logout, forgot/reset password.
- Google OAuth login.
- Product CRUD by the owning seller; public listing, search, category/district filter, detail page.
- Cart: add / update / remove, with server-side stock validation.
- Checkout: creates an Order, decrements per-size stock, clears the cart.
- Buyer wishlist and saved addresses.
- Buyer order list with status tracking.
- Seller order list, status updates, carrier/AWB assignment.
- Seller revenue stats and the forecast described in §4.
- Government schemes list (self-seeding).
- Docker compose for both services; nginx proxies `/api` to the backend.

### Half done
- **Admin.** `/admin` is static HTML with fabricated numbers (1,284 users, 452 verified, one hardcoded table row). No admin API exists. `User.isVerified` is only ever set by Google login — there is no verification workflow.
- **Roles.** Stored, never enforced, anywhere, front or back. Register has no role picker; `role` is only set by the seller onboarding form, which can also set it to anything via the API.
- **Payments.** `paymentStatus` is hardcoded to `'Completed'` at `checkoutController.js:55`. No gateway.
- **Shiprocket.** `utils/shiprocket.js` is a real client (auth, serviceability, createOrder) but only `checkServiceability` is called, from checkout, to get a shipping rate — with the pickup pincode hardcoded to `'500001'` (`checkoutController.js:38`) and a ₹50 fallback. `createOrder` is never called. `generateWaybill` produces a fake `SR<random>` AWB and self-describes as "Shiprocket Mock".
- **Ratings.** `rating` and `numReviews` on Product are never written. The buyer card falls back to a literal `'4.8'` when rating is 0.
- **Checkout address fields.** Form collects locality/landmark/altPhone; the Order schema has no such fields, so they are silently discarded.
- **PWA.** `sw.js` pre-caches `/logo192.png`, and `manifest.json` references `logo192.png`, `logo512.png`, `favicon.ico`. **None of those files exist** — `public/` contains only `manifest.json` and `sw.js`, so `cache.addAll` rejects and service-worker install fails.
- **Product fields `rawMaterials` and `lowStockThreshold`** — defined, never read or written.
- **User `coordinates`** — defined, never written.
- **`GET /api/orders/track/:trackingId`** works but has no ownership check.
- **README** claims Tailwind CSS; it is not a dependency. All styling is inline styles plus `index.css`.

### Dead code
| Item | Why dead |
|---|---|
| `src/pages/dashboard.jsx` (114 lines) | imported in `App.jsx:5` but never rendered — `/dashboard` redirects to `/buyer`. `Register.jsx:40` still navigates to `/dashboard`. |
| `src/api/orderApi.js` | imported by nothing. Its two endpoints (`GET /api/orders`, `PUT /api/orders/:id`) do not exist on the backend. |
| `productController.js:193` `updateUserProfile` | exported, not in any route. Duplicates `authController.updateProfile`. |
| `main.jsx:7–34` inline `ErrorBoundary` | duplicates `components/ErrorBoundary.jsx`; both are mounted, nested. |
| `SellerDashboard.jsx:229` `isEligible` | computed, never referenced. The loan eligibility rule it encodes has no effect. |
| `shiprocket.createOrder` | never called. |
| `msme-backend/test_logic.js` | a date-arithmetic scratch script with no DB and no assertions. |
| One-off scripts: `check_db.js`, `check_products.js`, `check_users.js`, `check-sizes.js`, `debug_data.js`, `debug_db.js`, `debug_users.js`, `fix_orphans.js`, `migrate_data.js`, `seed_analytics.js` | ad-hoc DB scripts, not referenced by the app or by any npm script. `seed_analytics.js` writes fake orders. |
| Product text index | declared; search uses `$regex`, so it is never used. |
| `express-validator` | in `package.json`, imported nowhere. |
| `TODO.md` | all 7 items ticked. |

---

## 7. Environment variables

Backend, read via `process.env` (loaded from `msme-backend/.env`):

| Var | Used in | Required |
|---|---|---|
| `MONGO_URL` | `config/db.js` | yes — process exits without it |
| `PORT` | `server.js` | no, defaults to 5000 |
| `JWT_SECRET` | `authController.js`, `authMiddleware.js` | yes |
| `JWT_EXPIRE` | `authController.js` | no, defaults `7d` |
| `CLIENT_URL` | `server.js` (CORS), `authController.js`, `routes/auth.js` | yes for Google + password reset |
| `GOOGLE_CLIENT_ID` | `config/passport.js` | for Google login |
| `GOOGLE_CLIENT_SECRET` | `config/passport.js` | for Google login |
| `GOOGLE_CALLBACK_URL` | `config/passport.js` | for Google login |
| `EMAIL_SERVICE` | `authController.js` | for password reset |
| `EMAIL_USER` | `authController.js` | for password reset |
| `EMAIL_PASS` | `authController.js` | for password reset |
| `FROM_NAME` | `authController.js` | for password reset |
| `FROM_EMAIL` | `authController.js` | for password reset |
| `SHIPROCKET_EMAIL` | `utils/shiprocket.js` | for live shipping rates |
| `SHIPROCKET_PASSWORD` | `utils/shiprocket.js` | for live shipping rates |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `server.js` | **set to `'0'` in code**, overriding any env value |

Frontend:

| Var | Used in | Notes |
|---|---|---|
| `VITE_API_URL` | `ForgotPassword.jsx:17`, `ResetPassword.jsx:18` | falls back to `http://localhost:5000/api`. Passed as a Docker build arg in `docker-compose.yml` but the frontend `Dockerfile` never declares `ARG VITE_API_URL`, so it does not reach the build. Every other frontend call uses relative `/api` paths. |

Hardcoded, should be env vars: `authApi.js:45` → `http://localhost:5000/api/auth/google`; `checkoutController.js:38` → pickup pincode `'500001'`; `vite.config.js` proxy target `http://127.0.0.1:5000`.

`jenkinsfile` writes `msme-backend/.env` from Jenkins credentials with only `MONGO_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PORT` — missing `CLIENT_URL`, `GOOGLE_CALLBACK_URL`, all `EMAIL_*` and both `SHIPROCKET_*`.

---

## 8. Secret files

**None found.** A search of the working tree (excluding `node_modules`) for `.env*`, `*.pem`, `*.key`, `*.crt`, `*.p12`, `id_rsa*` returned nothing.

This directory is also **not a git repository** — there is no `.git`, so nothing here is committed at all.

`.gitignore` does cover `node_modules/`, `.env`, `.env.*`, `*.log`, `dist/`, `build/`.

Two related notes, neither a committed secret file:
- `docker-compose.yml` requires `./msme-backend/.env` via `env_file`. That file is absent, so `docker compose up` fails until it is created.
- `jenkinsfile` hardcodes a repo URL, `https://github.com/chakriparella666-dev/MSMEplatform.git`. No credentials are inline; all four values come from Jenkins credential bindings.
