import type { Client, Invoice, LineItem, MonthData, TeamCost } from './types';

export const DEFAULT_GO_REV_SHARE_PERCENT = 35;
export const PUBLISHING_SPLIT_RATE = 0.5;

const sumItems = (items: LineItem[]) => items.reduce((sum, i) => sum + (i.amount || 0), 0);

export function calcClient(c: Client) {
  const software = sumItems(c.software);
  if (c.type === 'go') {
    // GO: revenue less fees, we take the rev share % and bill software on top
    const totalRevenue = (c.revenue || 0) - (c.fees || 0);
    const revShare = totalRevenue * ((c.revSharePercent || 0) / 100);
    return { totalRevenue, revShare, software, net: totalRevenue, earned: revShare + software };
  }
  // Publishing: revenue less ad spend and software, then always a 50/50 split
  const net = (c.revenue || 0) - (c.adSpend || 0) - software;
  return { totalRevenue: c.revenue || 0, revShare: net * PUBLISHING_SPLIT_RATE, software, net, earned: net * PUBLISHING_SPLIT_RATE };
}

export function teamCostValue(tc: TeamCost, totalCashCollected: number): number {
  return tc.mode === 'percent' ? totalCashCollected * ((tc.percent || 0) / 100) : tc.amount || 0;
}

export function calcTotals(month: MonthData) {
  const clientEarnings: Record<string, number> = {};
  let clientsEarned = 0;
  let clientsCashCollected = 0;
  for (const c of month.clients) {
    const earned = calcClient(c).earned;
    clientEarnings[c.id] = earned;
    clientsEarned += earned;
    clientsCashCollected += c.revenue || 0;
  }

  const o = month.ownOffer;
  const offerGrossRevenue = (o.cashCollected || 0) - (o.fees || 0) - (o.refunds || 0) - (o.adSpend || 0);

  const agencyRevenue = clientsEarned + offerGrossRevenue;
  const totalCashCollected = clientsCashCollected + (o.cashCollected || 0);

  const teamCostValues: Record<string, number> = {};
  const totalTeamCosts = month.teamCosts.reduce((sum, tc) => {
    const v = teamCostValue(tc, totalCashCollected);
    teamCostValues[tc.id] = v;
    return sum + v;
  }, 0);
  const softwareTotal = sumItems(month.software);
  const totalExpenses = totalTeamCosts + softwareTotal;

  const netPersonalIncomeUsd = agencyRevenue - totalExpenses;
  const netPersonalIncomeNzd = netPersonalIncomeUsd * month.fxRateUsdToNzd;

  return {
    clientEarnings,
    offerGrossRevenue,
    agencyRevenue,
    totalCashCollected,
    teamCostValues,
    totalTeamCosts,
    softwareTotal,
    totalExpenses,
    netPersonalIncomeUsd,
    netPersonalIncomeNzd,
  };
}

const SOFTWARE_CAP_NZD = 500;
const RENT_NZD = 3000;
const FOOD_NZD = 1500;
const BUSINESS_BANK_SPLIT = 0.7;

export interface CapitalAllocation {
  total: number;
  software: number;
  rent: number;
  food: number;
  businessBank: number;
  checking: number;
}

export function calcCapitalAllocation(netIncomeNzd: number): CapitalAllocation {
  const total = Math.max(0, netIncomeNzd);
  let remaining = total;

  const software = Math.min(SOFTWARE_CAP_NZD, remaining);
  remaining -= software;
  const rent = Math.min(RENT_NZD, remaining);
  remaining -= rent;
  const food = Math.min(FOOD_NZD, remaining);
  remaining -= food;

  const businessBank = remaining * BUSINESS_BANK_SPLIT;
  const checking = remaining - businessBank;

  return { total, software, rent, food, businessBank, checking };
}

// Older saved invoices predate grossRevenueShareAmount, so it's optional on
// read — treat missing as zero rather than poisoning the sum with NaN.
export function invoiceTotal(invoice: Pick<Invoice, 'items' | 'grossRevenueShareAmount'>): number {
  const itemsTotal = invoice.items.reduce((sum, i) => sum + i.qty * i.rate, 0);
  return itemsTotal + (invoice.grossRevenueShareAmount ?? 0);
}

export function formatCurrency(value: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const prefix = value < 0 ? '-$' : opts.sign ? '+$' : '$';
  return `${prefix}${formatted}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonthKey(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
