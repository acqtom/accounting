import { useState } from 'react';
import TopBar from './components/TopBar';
import PnLStatement from './components/PnLStatement';
import IncomeTrendChart from './components/IncomeTrendChart';
import CapitalAllocationChart from './components/CapitalAllocationChart';
import CreateInvoiceModal from './components/CreateInvoiceModal';
import { useAppData } from './lib/storage';
import { calcTotals, currentMonthKey, formatCurrency, shiftMonthKey } from './lib/calculations';
import type { Invoice, SavedClient } from './lib/types';

export default function App() {
  const { data, setData, updateMonth, getMonth } = useAppData();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const month = getMonth(selectedMonth);
  const monthsWithData = Object.keys(data.months);
  const netPersonalIncomeNzd = calcTotals(month).netPersonalIncomeNzd;

  const handleSaveInvoice = (invoice: Invoice) => {
    setData((prev) => ({
      ...prev,
      invoices: [invoice, ...prev.invoices],
      nextInvoiceNumber: prev.nextInvoiceNumber + 1,
    }));
    setShowInvoiceModal(false);
  };

  const handleSaveClientDetails = (client: SavedClient) => {
    setData((prev) => {
      const existingIndex = prev.savedClients.findIndex(
        (c) => c.name.toLowerCase() === client.name.toLowerCase(),
      );
      const savedClients = [...prev.savedClients];
      if (existingIndex >= 0) savedClients[existingIndex] = client;
      else savedClients.push(client);
      return { ...prev, savedClients };
    });
  };

  const handleDeleteSavedClient = (id: string) => {
    setData((prev) => ({ ...prev, savedClients: prev.savedClients.filter((c) => c.id !== id) }));
  };

  const handleAddMonth = () => {
    const latestKnown = [shiftMonthKey(currentMonthKey(), 1), ...monthsWithData].reduce((max, k) => (k > max ? k : max));
    const newKey = shiftMonthKey(latestKnown, 1);
    updateMonth(newKey, (m) => m);
    setSelectedMonth(newKey);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        monthsWithData={monthsWithData}
        onCreateInvoice={() => setShowInvoiceModal(true)}
        onAddMonth={handleAddMonth}
      />

      <main className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <PnLStatement month={month} onChange={(updater) => updateMonth(selectedMonth, updater)} />

          <div className="space-y-6">
            <IncomeTrendChart
              getMonth={getMonth}
              monthsWithData={monthsWithData}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
            />
            <CapitalAllocationChart netIncomeNzd={netPersonalIncomeNzd} />

            {data.invoices.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Invoices</h2>
                <div className="divide-y divide-gray-100">
                  {data.invoices.map((inv) => {
                    const total = inv.items.reduce((sum, i) => sum + i.qty * i.rate, 0);
                    return (
                      <div key={inv.id} className="flex items-center justify-between py-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-900">#{inv.number}</span>
                          <span className="text-gray-500 ml-2">{inv.toName || 'Untitled client'}</span>
                        </div>
                        <div className="flex items-center gap-6 text-gray-500">
                          <span>{inv.date}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showInvoiceModal && (
        <CreateInvoiceModal
          invoiceNumber={data.nextInvoiceNumber}
          savedClients={data.savedClients}
          onClose={() => setShowInvoiceModal(false)}
          onSave={handleSaveInvoice}
          onSaveDetails={handleSaveClientDetails}
          onDeleteSavedClient={handleDeleteSavedClient}
        />
      )}
    </div>
  );
}
