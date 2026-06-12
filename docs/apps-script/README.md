# Google Apps Script Setup (TOTP auth)

## 1. Open the script editor
Open **personal_expense_app_record** → **Extensions → Apps Script** → paste the contents of [`Code.gs`](./Code.gs).

## 2. Generate two secrets

**a) `TOTP_SECRET`** — base32 only (A–Z and 2–7). Run in browser DevTools:
```js
Array.from(crypto.getRandomValues(new Uint8Array(20)))
  .map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[b%32]).join('')
```
Copy the result into `TOTP_SECRET` in `Code.gs`.

**b) `SESSION_SECRET`** — any long random string. Run:
```js
crypto.randomUUID() + crypto.randomUUID()
```
Paste into `SESSION_SECRET`.

Save the script (💾).

## 3. Add the TOTP secret to Google Authenticator
- Open **Google Authenticator** (or Authy, 1Password, etc.)
- Add account → **Enter setup key**
- Account: `Expense Tracker`
- Key: paste your `TOTP_SECRET`
- Type: **Time based**
- Done. You'll now see a fresh 6-digit code every 30 seconds.

## 4. Sheet schemas (REQUIRED — no defaults are bundled in the app)

The app ships with **zero** mockup data. Every category, subcategory, and paid
method must exist as a row in your master spreadsheet. Create these sheets in
`personal_expense_app_record` with the exact header row shown (row 1):

### `_categories`
| id | name | color | icon | created_at | updated_at |
|----|------|-------|------|------------|------------|
| cat_fixed | Fixed Cost | #6366f1 | pin | | |
| cat_daily | Daily Paid | #22c55e | utensils | | |
| cat_onetime | One-Time Paid | #f59e0b | shopping-bag | | |
| cat_parking | Parking Fee | #06b6d4 | square-parking | | |
| cat_expressway | Express Way Fee | #0ea5e9 | milestone | | |
| cat_invest | Invest | #a855f7 | trending-up | | |
| cat_savings | Savings | #10b981 | piggy-bank | | |

### `_subcategories`
| id | category_id | category_name | name | created_at | updated_at |
|----|-------------|---------------|------|------------|------------|
| sub_phone | cat_fixed | Fixed Cost | Phone Bill | | |
| sub_ai | cat_fixed | Fixed Cost | AI Subscription | | |
| sub_food | cat_daily | Daily Paid | Food | | |
| sub_drink | cat_daily | Daily Paid | Drink | | |
| sub_dessert | cat_daily | Daily Paid | Dessert | | |
| sub_bakery | cat_daily | Daily Paid | Bakery | | |
| sub_snack | cat_daily | Daily Paid | Snack | | |
| sub_fuel | cat_daily | Daily Paid | Fuel | | |
| sub_lpg | cat_daily | Daily Paid | Lpg | | |
| sub_crypto | cat_invest | Invest | Crypto | | |
| sub_stock | cat_invest | Invest | Stock | | |

`category_name` must match the `name` column in `_categories` exactly (case-sensitive).

### `_paid_methods`
| id | name | icon | created_at | updated_at |
|----|------|------|------------|------------|
| pm_cash | Cash | banknote | | |
| pm_mobile | Mobile Banking | smartphone | | |
| pm_credit | Credit | credit-card | | |
| pm_spaylater | Spaylater | clock | | |

### `_settings`
Up to you — any `key` / `value` rows you like.

### Monthly record sheets (e.g. `202506`) and `template`
Must contain at minimum these headers (row 1):

`id | date | time | amount | currency | category_id | category_name | subcategory_id | subcategory_name | channel | paid_method_id | paid_method_name | note | tags | source | created_at | updated_at | active`

Every monthly sheet (and `template`) must have an **`active`** column — soft deletes set it to `false`.

Leave `created_at` / `updated_at` blank on rows you paste manually; the server fills them on first write.



## 5. Deploy as Web App
- **Deploy → New deployment → Web app**
- Execute as: **Me**
- Who has access: **Anyone**
- Deploy → grant permissions → copy the **/exec** URL.

(The URL is already hardcoded in `static-app/js/sync.js`. If you redeploy to a new URL, paste it into Settings → Web App URL.)

## 6. Log in from the app
- Open the app → **Settings → Google Sheets Sync**
- Open Google Authenticator → copy the 6-digit code for "Expense Tracker"
- Paste into the app → **Login**
- You're logged in for 8 hours. After that, repeat steps 1 line of this section.

## Updating the script later
Edit → **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. URL stays the same.
