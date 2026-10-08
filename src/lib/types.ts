export interface LineItem {
  id: string;
  name: string;
  amount: number;
}

export type ClientType = 'go' | 'publishing';

// One shape for both client kinds keeps storage normalization simple:
// GO clients use revenue/fees/revSharePercent, publishing clients use
// revenue/adSpend. Software costs apply to both.
export interface Client {
  id: string;
  type: ClientType;
  name: string;
  revenue: number;
  fees: number;
  adSpend: number;
  revSharePercent: number;
  software: LineItem[];
}

export interface OwnOffer {
  cashCollected: number;
  fees: number;
  refunds: number;
  adSpend: number;
}

export interface TeamCost {
  id: string;
  name: string;
  mode: 'amount' | 'percent';
  amount: number;
  percent: number; // of total cash collected
}

export interface MonthData {
  key: string; // "2026-07"
  clients: Client[];
  ownOffer: OwnOffer;
  teamCosts: TeamCost[];
  software: LineItem[];
  fxRateUsdToNzd: number;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  toName: string;
  toAddress: string;
  toEmail: string;
  items: InvoiceLineItem[];
  grossRevenueShareLabel: string;
  grossRevenueShareAmount: number;
  createdAt: string;
}

export interface SavedClient {
  id: string;
  name: string;
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  toName: string;
  toAddress: string;
  toEmail: string;
  items: InvoiceLineItem[];
}

export interface AppData {
  months: Record<string, MonthData>;
  invoices: Invoice[];
  nextInvoiceNumber: number;
  savedClients: SavedClient[];
}
