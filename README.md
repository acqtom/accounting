# Accounting Hub

A personal accounting dashboard for tracking monthly business PnL, income trends, and capital allocation.

## What's in here

- **Monthly PnL Statement** — revenue by client, client revenue share, payroll, CMO base pay/equity, bonuses, and recurring software expenses, all auto-calculated with results in both USD and NZD.
- **Income Trend** — a month-over-month line chart of net personal income (NZD).
- **Capital Allocation** — a breakdown of where each month's net income should go: software, rent, food, and a 70/30 split between a business bank account and checking.
- **Invoicing** — a "Create Invoice" flow styled after a clean paper invoice, with saved client templates and PDF export.

Everything is calculated live and persisted to the browser's `localStorage` — there's no backend or database.

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Tech stack

React + TypeScript + Vite, styled with Tailwind CSS. PDF export uses `html2canvas-pro` + `jsPDF`.
