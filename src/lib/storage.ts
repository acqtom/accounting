import { useCallback, useEffect, useState } from 'react';
import type { AppData, Client, ClientType, LineItem, MonthData, OwnOffer, TeamCost } from './types';
import { DEFAULT_GO_REV_SHARE_PERCENT } from './calculations';

const STORAGE_KEY = 'accounting-hub-data-v1';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Finds the most recent saved month chronologically before `key`, so a new
// month's recurring expenses (software subscriptions etc.) can carry forward.
function findPreviousMonthWithData(months: Record<string, MonthData>, key: string): MonthData | null {
  let best: MonthData | null = null;
  for (const k of Object.keys(months)) {
    if (k < key && (!best || k > best.key)) best = months[k];
  }
  return best;
}

export function createDefaultMonth(key: string, previousMonth?: MonthData | null): MonthData {
  // fixed (not random) ids: this factory runs independently in both
  // getMonth and updateMonth's fallback for a month that isn't saved yet,
  // so random ids would desync between the two and silently drop edits.
  // Carried-forward items keep their ids for the same reason.
  if (previousMonth) {
    return {
      key,
      // client setup (names, rev share %, software) recurs; this month's
      // revenue figures start fresh
      clients: previousMonth.clients.map((c) => ({
        ...c,
        revenue: 0,
        fees: 0,
        adSpend: 0,
        software: c.software.map((s) => ({ ...s })),
      })),
      ownOffer: { ...EMPTY_OWN_OFFER },
      teamCosts: previousMonth.teamCosts.map((tc) => ({ ...tc })),
      software: previousMonth.software.map((s) => ({ ...s })),
      fxRateUsdToNzd: previousMonth.fxRateUsdToNzd,
    };
  }
  return {
    key,
    clients: [
      newClient('go', 'Adriel Hsu', 'default-adriel-hsu'),
      newClient('publishing', 'Alex', 'default-alex'),
    ],
    ownOffer: { ...EMPTY_OWN_OFFER },
    teamCosts: [
      { id: 'default-setter', name: 'Setter Payroll', mode: 'percent', amount: 0, percent: 5 },
      { id: 'default-closer', name: 'Closer Payroll', mode: 'percent', amount: 0, percent: 10 },
      { id: 'default-cmo-base', name: 'CMO Base Pay', mode: 'amount', amount: 3000, percent: 0 },
    ],
    software: [],
    fxRateUsdToNzd: 1.7,
  };
}

const EMPTY_OWN_OFFER: OwnOffer = { cashCollected: 0, fees: 0, refunds: 0, adSpend: 0 };

export function newClient(type: ClientType, name: string, id = uid()): Client {
  return { id, type, name, revenue: 0, fees: 0, adSpend: 0, revSharePercent: DEFAULT_GO_REV_SHARE_PERCENT, software: [] };
}

const normalizeItems = (items: unknown): LineItem[] =>
  Array.isArray(items)
    ? items.map((i: Partial<LineItem>) => ({ id: i.id ?? uid(), name: i.name ?? '', amount: i.amount ?? 0 }))
    : [];

// Pre-restructure months stored clients as { revenue, revenueShare } with a
// flat expenses block. Alex's fixed 50% client share maps to a publishing
// split and Adriel's 65% to a GO client keeping 35%; old payroll/equity/bonus
// expenses become team costs so historical net income is preserved.
interface LegacyClient {
  id?: string;
  name?: string;
  revenue?: number;
  revenueShare?: number;
}
interface LegacyExpenses {
  setterPayrollPercent?: number;
  closerPayrollPercent?: number;
  cmoEquityAlexPercent?: number;
  cmoEquityAdrielPercent?: number;
  software?: LineItem[];
}

function migrateLegacyMonth(key: string, raw: Record<string, unknown>): MonthData {
  const legacyClients = (Array.isArray(raw.clients) ? raw.clients : []) as LegacyClient[];
  const expenses = (raw.expenses ?? {}) as LegacyExpenses;
  const isAlex = (c: LegacyClient) => c.id === 'default-alex' || c.name?.trim().toLowerCase() === 'alex';
  const isAdriel = (c: LegacyClient) =>
    c.id === 'default-adriel-hsu' || !!c.name?.trim().toLowerCase().includes('adriel');

  const clients: Client[] = legacyClients.map((c) => {
    const revenue = c.revenue ?? 0;
    const base = newClient(isAlex(c) ? 'publishing' : 'go', c.name ?? '', c.id ?? uid());
    let revSharePercent = DEFAULT_GO_REV_SHARE_PERCENT;
    if (!isAlex(c) && !isAdriel(c) && revenue > 0) revSharePercent = (1 - (c.revenueShare ?? 0) / revenue) * 100;
    return { ...base, revenue, revSharePercent };
  });

  const alexRevenue = legacyClients.find(isAlex)?.revenue ?? 0;
  const adrielRevenue = legacyClients.find(isAdriel)?.revenue ?? 0;
  const portfolio = legacyClients.reduce((sum, c) => sum + (c.revenue ?? 0), 0);
  const otherRevenue = normalizeItems(raw.otherRevenue).reduce((sum, r) => sum + r.amount, 0);

  const teamCosts: TeamCost[] = [
    { id: uid(), name: 'Setter Payroll', mode: 'percent', amount: 0, percent: expenses.setterPayrollPercent ?? 5 },
    { id: uid(), name: 'Closer Payroll', mode: 'percent', amount: 0, percent: expenses.closerPayrollPercent ?? 10 },
    { id: uid(), name: 'CMO Base Pay', mode: 'amount', amount: 3000, percent: 0 },
  ];
  const fixed: [string, number][] = [
    ['CMO Equity (Alex)', alexRevenue * ((expenses.cmoEquityAlexPercent ?? 10) / 100)],
    ['CMO Equity (Adriel)', adrielRevenue * ((expenses.cmoEquityAdrielPercent ?? 3) / 100)],
    ['Bonuses', Math.floor(Math.max(0, portfolio) / 40000) * 1000],
  ];
  for (const [name, amount] of fixed) {
    if (amount > 0) teamCosts.push({ id: uid(), name, mode: 'amount', amount, percent: 0 });
  }

  return {
    key,
    clients: clients.length > 0 ? clients : createDefaultMonth(key).clients,
    ownOffer: { ...EMPTY_OWN_OFFER, cashCollected: otherRevenue },
    teamCosts,
    software: normalizeItems(expenses.software),
    fxRateUsdToNzd: (raw.fxRateUsdToNzd as number | undefined) ?? 1.7,
  };
}

// Reconciles a month loaded from localStorage against the current MonthData
// shape. Older saved months can be missing fields added since they were
// written (or carry fields since removed) — reading a missing numeric field
// produces NaN, which silently poisons every downstream calculation and
// breaks the chart. Filling gaps with current defaults here, once, keeps
// every other call site free to assume a complete, valid MonthData.
function normalizeMonth(key: string, raw: Record<string, unknown> | undefined): MonthData {
  const base = createDefaultMonth(key);
  if (!raw) return base;
  if (!raw.ownOffer) return migrateLegacyMonth(key, raw);
  const ownOffer = raw.ownOffer as Partial<OwnOffer>;
  return {
    key,
    clients: Array.isArray(raw.clients)
      ? (raw.clients as Partial<Client>[]).map((c) => ({
          ...newClient(c.type === 'publishing' ? 'publishing' : 'go', c.name ?? '', c.id ?? uid()),
          revenue: c.revenue ?? 0,
          fees: c.fees ?? 0,
          adSpend: c.adSpend ?? 0,
          revSharePercent: c.revSharePercent ?? DEFAULT_GO_REV_SHARE_PERCENT,
          software: normalizeItems(c.software),
        }))
      : base.clients,
    ownOffer: {
      cashCollected: ownOffer.cashCollected ?? 0,
      fees: ownOffer.fees ?? 0,
      refunds: ownOffer.refunds ?? 0,
      adSpend: ownOffer.adSpend ?? 0,
    },
    teamCosts: Array.isArray(raw.teamCosts)
      ? (raw.teamCosts as Partial<TeamCost>[]).map((tc) => ({
          id: tc.id ?? uid(),
          name: tc.name ?? '',
          mode: tc.mode === 'percent' ? 'percent' : 'amount',
          amount: tc.amount ?? 0,
          percent: tc.percent ?? 0,
        }))
      : base.teamCosts,
    software: normalizeItems(raw.software),
    fxRateUsdToNzd: (raw.fxRateUsdToNzd as number | undefined) ?? base.fxRateUsdToNzd,
  };
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = { months: {}, invoices: [], nextInvoiceNumber: 1, savedClients: [], ...JSON.parse(raw) };
      const months: Record<string, MonthData> = {};
      for (const [key, month] of Object.entries(parsed.months as Record<string, Record<string, unknown>>)) {
        months[key] = normalizeMonth(key, month);
      }
      return { ...parsed, months };
    }
  } catch {
    // ignore corrupt storage
  }
  return { months: {}, invoices: [], nextInvoiceNumber: 1, savedClients: [] };
}

export function useAppData() {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const updateMonth = useCallback((key: string, updater: (m: MonthData) => MonthData) => {
    setData((prev) => {
      const existing = prev.months[key] ?? createDefaultMonth(key, findPreviousMonthWithData(prev.months, key));
      return { ...prev, months: { ...prev.months, [key]: updater(existing) } };
    });
  }, []);

  const getMonth = useCallback(
    (key: string): MonthData => data.months[key] ?? createDefaultMonth(key, findPreviousMonthWithData(data.months, key)),
    [data.months],
  );

  return { data, setData, updateMonth, getMonth };
}

export { uid };
