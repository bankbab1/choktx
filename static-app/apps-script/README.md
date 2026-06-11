# Google Apps Script Setup (5 min)

## 1. Open the script editor
Open **personal_expense_app_record** in Google Sheets → **Extensions → Apps Script**.

## 2. Paste the code
- Delete the default `Code.gs` contents
- Paste everything from [`Code.gs`](./Code.gs)
- At the top of the file, set:
  - `MASTER_ID` → already set to your master spreadsheet ID
  - `SHARED_TOKEN` → **change to a long random string** (e.g. run `crypto.randomUUID()` in browser console). Keep this private — it's your API key.

## 3. Make sure your sheets have these header rows

### `personal_expense_app_master`

**_categories** (row 1):
```
id | name | color | icon | sort_order | active | created_at | updated_at
```

**_subcategories** (row 1):
```
id | category_id | name | sort_order | active | created_at | updated_at
```

**_paid_methods** (row 1):
```
id | name | icon | sort_order | active | created_at | updated_at
```

**_settings** (row 1):
```
currency | theme | schema_version | updated_at
```

### `personal_expense_app_record`

**template** and every monthly sheet (e.g. `202606`) row 1:
```
id | date | time | amount | currency | category_id | category_name | subcategory_id | subcategory_name | channel | paid_method_id | paid_method_name | note | tags | source | created_at | updated_at | active
```

> ⚠️ Add the `active` column (column R) to your `template` and `202606` sheets if you haven't yet — it's required for soft-delete.

## 4. Deploy as Web App
1. Click **Deploy → New deployment**
2. Gear icon → **Web app**
3. Description: `Expense Tracker API v1`
4. Execute as: **Me (your account)**
5. Who has access: **Anyone**  *(don't worry — the SHARED_TOKEN protects it)*
6. **Deploy** → grant permissions when prompted
7. Copy the **Web app URL** (ends in `/exec`)

## 5. Wire it into the app
Open the app → **Settings → Google Sheets Sync**:
- Paste the **Web app URL**
- Paste the same **SHARED_TOKEN**
- Tap **Test connection** → should say *Connected*
- Tap **Pull from Sheets** to import existing data, or **Push to Sheets** to upload local data

## Updating the script later
Edit the code → **Deploy → Manage deployments** → pencil icon on the existing deployment → **Version: New version** → Deploy. The URL stays the same.
