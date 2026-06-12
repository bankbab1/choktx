# Personal Expense Tracker (Static)

A mobile-first static web app for tracking personal expenses. No backend — all data is stored in your browser's `localStorage`. Deploys directly to GitHub Pages.

## Features

- **Dashboard** — Switch between Day / Week / Month / Year. Donut chart + category breakdown bars.
- **Add Expense** — Date picker, category + subcategory cascade, amount, description.
- **History** — All records grouped by date, filterable by period and category, swipe-to-delete.
- **Settings** — Dark/light theme toggle, JSON export/import, clear all data, view category list.
- **Categories** (two-layer):
  - Fixed Cost → Phone Bill, AI Subscription
  - Daily Paid → Food, Drink, Dessert, Bakery, Snack
  - One-Time Paid
  - Parking Fee
  - Express Way Fee
  - Invest → Crypto, Stock
  - Savings
- Mobile-app feel with fixed bottom navigation, responsive on desktop (centered phone-frame layout).

## Folder Structure

```
.
├── index.html          # Dashboard
├── add.html            # Add new expense
├── history.html        # All records
├── settings.html       # Theme, data, categories
├── css/
│   └── styles.css      # Design tokens + layout
└── js/
    ├── categories.js   # Category definitions
    ├── storage.js      # localStorage CRUD
    ├── theme.js        # Dark/light mode
    ├── nav.js          # Bottom-nav active state
    ├── dashboard.js    # Dashboard page logic
    ├── add.js          # Add-form logic
    └── history.js      # History page logic
```

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `expense-tracker`).
2. Copy the **contents of this folder** (not the folder itself) to the repo root.
3. Commit and push to `main`.
4. In the repo: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `/ (root)`**.
5. Visit `https://<username>.github.io/<repo>/`.

## Customizing Categories

Edit `js/categories.js`. Each entry supports `color`, `icon`, and a `sub` array.

## Notes

- Uses [Chart.js](https://www.chartjs.org/) via CDN (no build step).
- Data lives only in your browser. Use **Settings → Export** to back up.
