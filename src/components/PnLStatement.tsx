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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={3} className="pt-2 pb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
        {children}
      </td>
    </tr>
  );
}

function SpacerRow() {
  return (
    <tr>
      <td colSpan={3} className="h-2" />
    </tr>
  );
}

function TotalRow({ label, value, underline }: { label: string; value: number; underline?: boolean }) {
  return (
    <tr className="border-t border-gray-200">
      <td className="py-2 font-semibold text-sm text-gray-900">{label}</td>
      <td className="py-2 w-28" />
      <td className="py-2 w-28">
        <ComputedCurrency value={formatCurrency(value)} bold underline={underline} />
      </td>
    </tr>
  );
}

function InputRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 text-sm text-gray-800">{label}</td>
      <td className="py-2 w-28">
        <CurrencyInput value={value} onChange={onChange} />
      </td>
      <td className="py-2 w-28" />
    </tr>
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
    <div className="space-y-1">
      {items.map((s) => (
        <div key={s.id} className="group flex items-center gap-2">
          <TextInput
            value={s.name}
            onChange={(v) => onChange(items.map((i) => (i.id === s.id ? { ...i, name: v } : i)))}
            className="flex-1 min-w-0 text-sm text-gray-700"
          />
          <div className="w-28">
            <CurrencyInput
              value={s.amount}
              onChange={(v) => onChange(items.map((i) => (i.id === s.id ? { ...i, amount: v } : i)))}
            />
          </div>
          <button
            onClick={() => onChange(items.filter((i) => i.id !== s.id))}
            className={REMOVE_BUTTON_CLASS}
            aria-label="Remove software"
          >
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { id: uid(), name: 'New software', amount: 0 }])} className={ADD_BUTTON_CLASS}>
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
    <div className="group rounded-xl border border-gray-200 bg-white/70 p-4">
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
          <div className="py-1.5">
            <div className="text-sm text-gray-700 mb-1">Add: Software costs</div>
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
          <div className="py-1.5">
            <div className="text-sm text-gray-700 mb-1">Less: Software costs</div>
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-8 items-start">
      <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Clients</span>
        <div className="flex gap-4">
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

      <table className="w-full border-collapse">
        <tbody>
          <SectionHeader>Other Revenue: Own Offer</SectionHeader>
          <InputRow label="Cash Collected" value={month.ownOffer.cashCollected} onChange={(v) => updateOwnOffer({ cashCollected: v })} />
          <InputRow label="Less: Fees" value={month.ownOffer.fees} onChange={(v) => updateOwnOffer({ fees: v })} />
          <InputRow label="Less: Refunds" value={month.ownOffer.refunds} onChange={(v) => updateOwnOffer({ refunds: v })} />
          <InputRow label="Less: Ad Spend" value={month.ownOffer.adSpend} onChange={(v) => updateOwnOffer({ adSpend: v })} />
          <TotalRow label="Offer Gross Revenue" value={t.offerGrossRevenue} />

          <SpacerRow />
          <SectionHeader>Agency Revenue</SectionHeader>
          {month.clients.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="py-2 pr-2 text-sm text-gray-800">
                {c.name || 'Untitled client'}
                <span className="ml-1 text-xs text-gray-400">({pctOfAgency(t.clientEarnings[c.id])})</span>
              </td>
              <td className="py-2 w-28">
                <ComputedCurrency value={formatCurrency(t.clientEarnings[c.id])} />
              </td>
              <td className="py-2 w-28" />
            </tr>
          ))}
          <tr className="border-b border-gray-100">
            <td className="py-2 pr-2 text-sm text-gray-800">
              Own Offer
              <span className="ml-1 text-xs text-gray-400">({pctOfAgency(t.offerGrossRevenue)})</span>
            </td>
            <td className="py-2 w-28">
              <ComputedCurrency value={formatCurrency(t.offerGrossRevenue)} />
            </td>
            <td className="py-2 w-28" />
          </tr>
          <TotalRow label="Total Agency Revenue" value={t.agencyRevenue} />
        </tbody>
      </table>

      <table className="w-full border-collapse">
        <tbody>
          <SectionHeader>Less: Team Costs</SectionHeader>
          <tr>
            <td colSpan={3} className="pb-1 text-xs text-gray-400">
              % costs are of total cash collected ({formatCurrency(t.totalCashCollected)})
            </td>
          </tr>
          {month.teamCosts.map((tc) => (
            <tr key={tc.id} className="group border-b border-gray-100">
              <td className="py-2 pr-2 text-sm text-gray-800">
                <div className="flex items-center gap-2">
                  <TextInput value={tc.name} onChange={(v) => updateTeamCost(tc.id, { name: v })} className="flex-1 min-w-0" />
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
                  <button onClick={() => removeTeamCost(tc.id)} className={REMOVE_BUTTON_CLASS} aria-label="Remove team cost">
                    ✕
                  </button>
                </div>
              </td>
              <td className="py-2 w-28">
                {tc.mode === 'percent' ? (
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <PercentInline value={tc.percent} onChange={(v) => updateTeamCost(tc.id, { percent: v })} />
                    <ComputedCurrency value={formatCurrency(t.teamCostValues[tc.id])} />
                  </div>
                ) : (
                  <CurrencyInput value={tc.amount} onChange={(v) => updateTeamCost(tc.id, { amount: v })} />
                )}
              </td>
              <td className="py-2 w-28" />
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="pt-1 pb-2">
              <button onClick={addTeamCost} className={ADD_BUTTON_CLASS}>
                + Add team cost
              </button>
            </td>
          </tr>
          <TotalRow label="Total Team Costs" value={t.totalTeamCosts} underline />

          <SpacerRow />
          <SectionHeader>Less: Additional Software Costs</SectionHeader>
          <tr>
            <td colSpan={2} className="py-2">
              <LineItemList
                items={month.software}
                onChange={(software) => onChange((m) => ({ ...m, software }))}
                addLabel="+ Add software"
              />
            </td>
            <td className="py-2 w-28" />
          </tr>
          <TotalRow label="Total Software Costs" value={t.softwareTotal} underline />

          <SpacerRow />
          <tr>
            <td className="py-2 font-bold text-base text-gray-900">Net Profit (USD)</td>
            <td className="py-2 w-28" />
            <td className="py-2 w-28">
              <ComputedCurrency value={formatCurrency(t.netPersonalIncomeUsd)} bold />
            </td>
          </tr>
          <tr>
            <td className="py-2 font-bold text-base text-gray-900">
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
            </td>
            <td className="py-2 w-28" />
            <td className="py-2 w-28">
              <ComputedCurrency value={formatCurrency(t.netPersonalIncomeNzd)} bold />
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}
