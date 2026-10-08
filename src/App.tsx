import { useState } from 'react';
import TopBar from './components/TopBar';
import PnLStatement from './components/PnLStatement';
import IncomeTrendChart from './components/IncomeTrendChart';
import CapitalAllocationChart from './components/CapitalAllocationChart';
import CreateInvoiceModal from './components/CreateInvoiceModal';
import { useAppData } from './lib/storage';
import { calcTotals, currentMonthKey, shiftMonthKey } from './lib/calculations';
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
    <div className="min-h-screen bg-gray-100">
      <TopBar
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        monthsWithData={monthsWithData}
        onCreateInvoice={() => setShowInvoiceModal(true)}
        onAddMonth={handleAddMonth}
      />

      <main className="px-8 py-8 space-y-6">
        <PnLStatement month={month} onChange={(updater) => updateMonth(selectedMonth, updater)} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <IncomeTrendChart
            getMonth={getMonth}
            monthsWithData={monthsWithData}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />
          <CapitalAllocationChart netIncomeNzd={netPersonalIncomeNzd} />
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
