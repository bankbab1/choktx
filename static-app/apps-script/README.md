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

## 4. Make sure the sheets have the right headers
See the schema in the previous setup notes. Important: every monthly sheet (and `template`) must have an **`active`** column.

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
