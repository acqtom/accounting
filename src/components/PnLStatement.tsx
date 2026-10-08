import type { Client, ClientType, LineItem, MonthData, OwnOffer, TeamCost } from '../lib/types';
import { calcClient, calcTotals, formatCurrency, monthLabel } from '../lib/calculations';
import { newClient, uid } from '../lib/storage';
import { CARD_CLASS } from '../lib/ui';
import { CurrencyInput, ComputedCurrency, PercentInline, TextInput } from './inputs';
import { DocumentIcon, IconBadge, LiveDot } from './icons';

interface Props {
  month: MonthData;
  onChange: (updater: (m: MonthData) => MonthData) => void;
}

const ADD_BUTTON_CLASS = 'text-xs text-indigo-600 hover:text-indigo-700 font-medium';
const REMOVE_BUTTON_CLASS =
  'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity text-xs';
// Row-level remove buttons hang in the card's right padding so list values
// stay flush with the totals below them.
const ROW_REMOVE_BUTTON_CLASS = `absolute -right-3.5 top-1/2 -translate-y-1/2 ${REMOVE_BUTTON_CLASS}`;
const COLUMN_HEADER_CLASS = 'flex items-center justify-between h-5 text-xs font-semibold tracking-wider text-gray-500 uppercase';

const BOX_CLASS = 'rounded-xl border border-gray-200 bg-white/70 p-4';

function Box({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className={BOX_CLASS}>
      {title && <div className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">{title}</div>}
      {children}
    </div>
  );
}

// Editable name + amount list, used for client and agency software costs.
function LineItemList({
  items,
  onChange,
  addLabel,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  addLabel: string;
}) {
  return (
    <div>
      {items.map((s) => (
        <div key={s.id} className="group relative flex items-center gap-2 py-1.5">
          <TextInput
            value={s.name}
            onChange={(v) => onChange(items.map((i) => (i.id === s.id ? { ...i, name: v } : i)))}
            className="flex-1 min-w-0 -ml-1 text-sm text-gray-700"
          />
          <div className="w-32 shrink-0">
            <CurrencyInput
              value={s.amount}
              onChange={(v) => onChange(items.map((i) => (i.id === s.id ? { ...i, amount: v } : i)))}
            />
          </div>
          <button
            onClick={() => onChange(items.filter((i) => i.id !== s.id))}
            className={ROW_REMOVE_BUTTON_CLASS}
            aria-label="Remove software"
          >
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { id: uid(), name: 'New software', amount: 0 }])} className={`${ADD_BUTTON_CLASS} py-1`}>
        {addLabel}
      </button>
    </div>
  );
}

function BoxRow({ label, children, bold }: { label: React.ReactNode; children: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 py-1.5 ${bold ? 'border-t border-gray-200' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{label}</span>
      <div className="w-32 shrink-0">{children}</div>
    </div>
  );
}

function ClientBox({
  client,
  onUpdate,
  onRemove,
}: {
  client: Client;
  onUpdate: (patch: Partial<Client>) => void;
  onRemove: () => void;
}) {
  const r = calcClient(client);
  const isGo = client.type === 'go';
  return (
    <div className={`group ${BOX_CLASS}`}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
            isGo ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isGo ? 'GO' : 'Publishing'}
        </span>
        <TextInput value={client.name} onChange={(v) => onUpdate({ name: v })} className="flex-1 min-w-0 font-semibold text-gray-900" />
        <button onClick={onRemove} className={REMOVE_BUTTON_CLASS} aria-label="Remove client">
          ✕
        </button>
      </div>

      {isGo ? (
        <>
          <BoxRow label="Revenue">
            <CurrencyInput value={client.revenue} onChange={(v) => onUpdate({ revenue: v })} />
          </BoxRow>
          <BoxRow label="Less: Fees">
            <CurrencyInput value={client.fees} onChange={(v) => onUpdate({ fees: v })} />
          </BoxRow>
          <BoxRow label="Total Revenue" bold>
            <ComputedCurrency value={formatCurrency(r.totalRevenue)} bold />
          </BoxRow>
          <BoxRow
            label={
              <>
                Rev Share{' '}
                <PercentInline value={client.revSharePercent} onChange={(v) => onUpdate({ revSharePercent: v })} />
              </>
            }
          >
            <ComputedCurrency value={formatCurrency(r.revShare)} />
          </BoxRow>
          <div className="pt-1.5">
            <div className="text-sm text-gray-700">Add: Software costs</div>
            <LineItemList items={client.software} onChange={(software) => onUpdate({ software })} addLabel="+ Add software" />
          </div>
        </>
      ) : (
        <>
          <BoxRow label="Total Revenue">
            <CurrencyInput value={client.revenue} onChange={(v) => onUpdate({ revenue: v })} />
          </BoxRow>
          <BoxRow label="Less: Ad Spend">
            <CurrencyInput value={client.adSpend} onChange={(v) => onUpdate({ adSpend: v })} />
          </BoxRow>
          <div className="pt-1.5">
            <div className="text-sm text-gray-700">Less: Software costs</div>
            <LineItemList items={client.software} onChange={(software) => onUpdate({ software })} addLabel="+ Add software" />
          </div>
          <BoxRow label="Net Revenue" bold>
            <ComputedCurrency value={formatCurrency(r.net)} bold />
          </BoxRow>
          <BoxRow label="50% Split">
            <ComputedCurrency value={formatCurrency(r.revShare)} />
          </BoxRow>
        </>
      )}

      <BoxRow label="Our Revenue" bold>
        <ComputedCurrency value={formatCurrency(r.earned)} bold />
      </BoxRow>
    </div>
  );
}

export default function PnLStatement({ month, onChange }: Props) {
  const t = calcTotals(month);
  const pctOfAgency = (v: number) => (t.agencyRevenue !== 0 ? `${((v / t.agencyRevenue) * 100).toFixed(1)}%` : '—');

  const addClient = (type: ClientType) =>
    onChange((m) => ({ ...m, clients: [...m.clients, newClient(type, type === 'go' ? 'New GO client' : 'New publishing client')] }));

  const removeClient = (id: string) => onChange((m) => ({ ...m, clients: m.clients.filter((c) => c.id !== id) }));

  const updateClient = (id: string, patch: Partial<Client>) =>
    onChange((m) => ({ ...m, clients: m.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  const updateOwnOffer = (patch: Partial<OwnOffer>) => onChange((m) => ({ ...m, ownOffer: { ...m.ownOffer, ...patch } }));

  const addTeamCost = () =>
    onChange((m) => ({
      ...m,
      teamCosts: [...m.teamCosts, { id: uid(), name: 'New team member', mode: 'amount', amount: 0, percent: 0 }],
    }));

  const removeTeamCost = (id: string) => onChange((m) => ({ ...m, teamCosts: m.teamCosts.filter((tc) => tc.id !== id) }));

  const updateTeamCost = (id: string, patch: Partial<TeamCost>) =>
    onChange((m) => ({ ...m, teamCosts: m.teamCosts.map((tc) => (tc.id === id ? { ...tc, ...patch } : tc)) }));

  return (
    <div className={`${CARD_CLASS} p-8`}>
      <div className="flex items-start justify-between mb-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Monthly PnL Statement (Business) — {monthLabel(month.key)}
        </h2>
        <IconBadge>
          <DocumentIcon className="w-5 h-5" />
        </IconBadge>
      </div>
      <LiveDot className="mb-6" />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
      <div className="space-y-3">
      <div className={COLUMN_HEADER_CLASS}>
        <span>Clients</span>
        <div className="flex gap-4 normal-case tracking-normal">
          <button onClick={() => addClient('go')} className={ADD_BUTTON_CLASS}>
            + GO client
          </button>
          <button onClick={() => addClient('publishing')} className={ADD_BUTTON_CLASS}>
            + Publishing client
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {month.clients.map((c) => (
          <ClientBox key={c.id} client={c} onUpdate={(patch) => updateClient(c.id, patch)} onRemove={() => removeClient(c.id)} />
        ))}
      </div>
      </div>

      <div className="space-y-3">
        <div className={COLUMN_HEADER_CLASS}>Revenue</div>
        <Box title="Other Revenue: Own Offer">
          <BoxRow label="Cash Collected">
            <CurrencyInput value={month.ownOffer.cashCollected} onChange={(v) => updateOwnOffer({ cashCollected: v })} />
          </BoxRow>
          <BoxRow label="Less: Fees">
            <CurrencyInput value={month.ownOffer.fees} onChange={(v) => updateOwnOffer({ fees: v })} />
          </BoxRow>
          <BoxRow label="Less: Refunds">
            <CurrencyInput value={month.ownOffer.refunds} onChange={(v) => updateOwnOffer({ refunds: v })} />
          </BoxRow>
          <BoxRow label="Less: Ad Spend">
            <CurrencyInput value={month.ownOffer.adSpend} onChange={(v) => updateOwnOffer({ adSpend: v })} />
          </BoxRow>
          <BoxRow label="Offer Gross Revenue" bold>
            <ComputedCurrency value={formatCurrency(t.offerGrossRevenue)} bold />
          </BoxRow>
        </Box>

        <Box title="Agency Revenue">
          {month.clients.map((c) => (
            <BoxRow
              key={c.id}
              label={
                <>
                  {c.name || 'Untitled client'}
                  <span className="ml-1 text-xs text-gray-400">({pctOfAgency(t.clientEarnings[c.id])})</span>
                </>
              }
            >
              <ComputedCurrency value={formatCurrency(t.clientEarnings[c.id])} />
            </BoxRow>
          ))}
          <BoxRow
            label={
              <>
                Own Offer
                <span className="ml-1 text-xs text-gray-400">({pctOfAgency(t.offerGrossRevenue)})</span>
              </>
            }
          >
            <ComputedCurrency value={formatCurrency(t.offerGrossRevenue)} />
          </BoxRow>
          <BoxRow label="Total Agency Revenue" bold>
            <ComputedCurrency value={formatCurrency(t.agencyRevenue)} bold />
          </BoxRow>
        </Box>
      </div>

      <div className="space-y-3">
        <div className={COLUMN_HEADER_CLASS}>Costs &amp; Profit</div>
        <Box title="Less: Team Costs">
          <div className="pb-1 text-xs text-gray-400">
            % costs are of total cash collected ({formatCurrency(t.totalCashCollected)})
          </div>
          {month.teamCosts.map((tc) => (
            <div key={tc.id} className="group relative flex items-center gap-2 py-1.5">
              <TextInput value={tc.name} onChange={(v) => updateTeamCost(tc.id, { name: v })} className="flex-1 min-w-0 -ml-1 text-sm text-gray-700" />
              <div className="flex shrink-0 rounded-md border border-gray-200 text-[11px] overflow-hidden">
                {(['amount', 'percent'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateTeamCost(tc.id, { mode })}
                    className={`px-1.5 py-0.5 ${tc.mode === mode ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {mode === 'amount' ? '$' : '%'}
                  </button>
                ))}
              </div>
              <div className="w-16 shrink-0 text-right text-sm">
                {tc.mode === 'percent' && (
                  <PercentInline value={tc.percent} onChange={(v) => updateTeamCost(tc.id, { percent: v })} />
                )}
              </div>
              <div className="w-32 shrink-0">
                {tc.mode === 'percent' ? (
                  <ComputedCurrency value={formatCurrency(t.teamCostValues[tc.id])} />
                ) : (
                  <CurrencyInput value={tc.amount} onChange={(v) => updateTeamCost(tc.id, { amount: v })} />
                )}
              </div>
              <button onClick={() => removeTeamCost(tc.id)} className={ROW_REMOVE_BUTTON_CLASS} aria-label="Remove team cost">
                ✕
              </button>
            </div>
          ))}
          <button onClick={addTeamCost} className={`${ADD_BUTTON_CLASS} py-1`}>
            + Add team cost
          </button>
          <BoxRow label="Total Team Costs" bold>
            <ComputedCurrency value={formatCurrency(t.totalTeamCosts)} bold />
          </BoxRow>
        </Box>

        <Box title="Less: Additional Software Costs">
          <div>
            <LineItemList
              items={month.software}
              onChange={(software) => onChange((m) => ({ ...m, software }))}
              addLabel="+ Add software"
            />
          </div>
          <BoxRow label="Total Software Costs" bold>
            <ComputedCurrency value={formatCurrency(t.softwareTotal)} bold />
          </BoxRow>
        </Box>

        <Box>
          <div className="flex items-center justify-between py-1.5">
            <span className="font-bold text-base text-gray-900">Net Profit (USD)</span>
            <ComputedCurrency value={formatCurrency(t.netPersonalIncomeUsd)} bold />
          </div>
          <div className="flex items-center justify-between py-1.5 border-t border-gray-200">
            <div className="font-bold text-base text-gray-900">
              Net Profit (NZD)
              <span className="block mt-1 font-normal text-xs text-gray-400">
                FX rate:
                <input
                  type="number"
                  step="0.001"
                  value={month.fxRateUsdToNzd}
                  onChange={(e) =>
                    onChange((m) => ({ ...m, fxRateUsdToNzd: e.target.value === '' ? 0 : parseFloat(e.target.value) }))
                  }
                  onFocus={(e) => e.target.select()}
                  className="w-16 ml-1 bg-transparent border-b border-gray-300 outline-none focus:bg-indigo-50 rounded px-1 text-gray-600"
                />
              </span>
            </div>
            <ComputedCurrency value={formatCurrency(t.netPersonalIncomeNzd)} bold />
          </div>
        </Box>
      </div>
      </div>
    </div>
  );
}
