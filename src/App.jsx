import React, { useState } from 'react';
import Header from './components/Header.jsx';
import Tabs from './components/Tabs.jsx';
import Dashboard from './components/Dashboard.jsx';
import BudgetTab from './components/BudgetTab.jsx';
import ContractsTab from './components/ContractsTab.jsx';
import VariationsTab from './components/VariationsTab.jsx';
import PaymentsTab from './components/PaymentsTab.jsx';
import { page } from './styles.js';
import {
  budgetLines as seedBudgetLines,
  contracts as seedContracts,
  variations as seedVariations,
  payments as seedPayments,
} from './data/sampleData.js';

const PROJECT_NAME = 'Harbour View Apartments';

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`;

export default function App() {
  const [tab, setTab] = useState('Dashboard');
  const [budgetLines, setBudgetLines] = useState(seedBudgetLines);
  const [contracts, setContracts] = useState(seedContracts);
  const [variations, setVariations] = useState(seedVariations);
  const [payments, setPayments] = useState(seedPayments);

  // --- Budget line CRUD -------------------------------------------------
  const saveBudgetLine = (line) => {
    if (line.id) {
      setBudgetLines((ls) => ls.map((l) => (l.id === line.id ? line : l)));
    } else {
      setBudgetLines((ls) => [...ls, { ...line, id: newId() }]);
    }
  };
  const deleteBudgetLine = (id) => {
    // Cascade: remove contracts linked to this line, and their variations/payments.
    const orphanContractIds = contracts
      .filter((c) => c.budgetLineId === id)
      .map((c) => c.id);
    setBudgetLines((ls) => ls.filter((l) => l.id !== id));
    setContracts((cs) => cs.filter((c) => c.budgetLineId !== id));
    setVariations((vs) => vs.filter((v) => !orphanContractIds.includes(v.contractId)));
    setPayments((ps) => ps.filter((p) => !orphanContractIds.includes(p.contractId)));
  };

  // --- Contract CRUD ----------------------------------------------------
  const saveContract = (contract) => {
    if (contract.id) {
      setContracts((cs) => cs.map((c) => (c.id === contract.id ? contract : c)));
    } else {
      setContracts((cs) => [...cs, { ...contract, id: newId() }]);
    }
  };
  const deleteContract = (id) => {
    setContracts((cs) => cs.filter((c) => c.id !== id));
    setVariations((vs) => vs.filter((v) => v.contractId !== id));
    setPayments((ps) => ps.filter((p) => p.contractId !== id));
  };

  // --- Variation CRUD ---------------------------------------------------
  const saveVariation = (variation) => {
    if (variation.id) {
      setVariations((vs) => vs.map((v) => (v.id === variation.id ? variation : v)));
    } else {
      setVariations((vs) => [...vs, { ...variation, id: newId() }]);
    }
  };
  const deleteVariation = (id) =>
    setVariations((vs) => vs.filter((v) => v.id !== id));

  // --- Payment CRUD -----------------------------------------------------
  const savePayment = (payment) => {
    if (payment.id) {
      setPayments((ps) => ps.map((p) => (p.id === payment.id ? payment : p)));
    } else {
      setPayments((ps) => [...ps, { ...payment, id: newId() }]);
    }
  };
  const deletePayment = (id) => setPayments((ps) => ps.filter((p) => p.id !== id));

  return (
    <div>
      <Header projectName={PROJECT_NAME} />
      <Tabs active={tab} onChange={setTab} />
      <main style={page}>
        {tab === 'Dashboard' && (
          <Dashboard
            budgetLines={budgetLines}
            contracts={contracts}
            variations={variations}
            payments={payments}
          />
        )}
        {tab === 'Budget' && (
          <BudgetTab
            budgetLines={budgetLines}
            contracts={contracts}
            variations={variations}
            onSave={saveBudgetLine}
            onDelete={deleteBudgetLine}
          />
        )}
        {tab === 'Contracts' && (
          <ContractsTab
            budgetLines={budgetLines}
            contracts={contracts}
            variations={variations}
            payments={payments}
            onSave={saveContract}
            onDelete={deleteContract}
          />
        )}
        {tab === 'Variations' && (
          <VariationsTab
            contracts={contracts}
            variations={variations}
            onSave={saveVariation}
            onDelete={deleteVariation}
          />
        )}
        {tab === 'Payments' && (
          <PaymentsTab
            contracts={contracts}
            payments={payments}
            onSave={savePayment}
            onDelete={deletePayment}
          />
        )}
      </main>
    </div>
  );
}
