import React, { useState } from 'react';
import Header from './components/Header.jsx';
import Tabs from './components/Tabs.jsx';
import Dashboard from './components/Dashboard.jsx';
import BudgetTab from './components/BudgetTab.jsx';
import ContractsTab from './components/ContractsTab.jsx';
import VariationsTab from './components/VariationsTab.jsx';
import PaymentsTab from './components/PaymentsTab.jsx';
import ForecastsTab from './components/ForecastsTab.jsx';
import { colors, page } from './styles.js';
import { useActiveProject } from './hooks/useProjects.js';
import {
  useBudgetCategories,
  useBudgetGroups,
  useBudgetLines,
  useSaveBudgetLine,
  useDeleteBudgetLine,
} from './hooks/useBudget.js';
import {
  useContracts,
  useSaveContract,
  useDeleteContract,
} from './hooks/useContracts.js';
import {
  useVariations,
  useSaveVariation,
  useDeleteVariation,
} from './hooks/useVariations.js';
import {
  usePayments,
  useSavePayment,
  useDeletePayment,
} from './hooks/usePayments.js';
import {
  useForecasts,
  useSaveForecast,
  useDeleteForecast,
} from './hooks/useForecasts.js';
import { useAuth } from './auth/useAuth.js';

export default function App() {
  const [tab, setTab] = useState('Dashboard');

  const { data: project, isLoading: loadingProject, error: projectError } =
    useActiveProject();
  const projectId = project?.id;

  const categoriesQ = useBudgetCategories(projectId);
  const groupsQ = useBudgetGroups(projectId);
  const linesQ = useBudgetLines(projectId);
  const contractsQ = useContracts(projectId);
  const variationsQ = useVariations(projectId);
  const paymentsQ = usePayments(projectId);
  const forecastsQ = useForecasts(projectId);

  const saveBudgetLine = useSaveBudgetLine(projectId);
  const deleteBudgetLine = useDeleteBudgetLine(projectId);
  const saveContract = useSaveContract(projectId);
  const deleteContract = useDeleteContract(projectId);
  const saveVariation = useSaveVariation(projectId);
  const deleteVariation = useDeleteVariation(projectId);
  const savePayment = useSavePayment(projectId);
  const deletePayment = useDeletePayment(projectId);
  const saveForecast = useSaveForecast(projectId);
  const deleteForecast = useDeleteForecast(projectId);

  if (loadingProject) {
    return <FullScreenMessage>Loading project…</FullScreenMessage>;
  }

  if (projectError) {
    return (
      <FullScreenMessage tone="error">
        Failed to load project: {projectError.message}
      </FullScreenMessage>
    );
  }

  if (!project) {
    return (
      <FullScreenMessage>
        No project yet. Run the seed SQL (see
        {' '}
        <code>docs/supabase-setup.md</code> step 4) to create one.
      </FullScreenMessage>
    );
  }

  const budgetLines = linesQ.data || [];
  const budgetGroups = groupsQ.data || [];
  const budgetCategories = categoriesQ.data || [];
  const contracts = contractsQ.data || [];
  const variations = variationsQ.data || [];
  const payments = paymentsQ.data || [];
  const forecasts = forecastsQ.data || [];

  const allLoaded =
    !linesQ.isLoading &&
    !contractsQ.isLoading &&
    !variationsQ.isLoading &&
    !paymentsQ.isLoading &&
    !forecastsQ.isLoading;

  return (
    <div>
      <Header projectName={project.title} />
      <Tabs active={tab} onChange={setTab} />
      <main style={page}>
        {!allLoaded ? (
          <div style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {tab === 'Dashboard' && (
              <Dashboard
                budgetLines={budgetLines}
                contracts={contracts}
                variations={variations}
                payments={payments}
                forecasts={forecasts}
              />
            )}
            {tab === 'Budget' && (
              <BudgetTab
                budgetLines={budgetLines}
                budgetGroups={budgetGroups}
                budgetCategories={budgetCategories}
                contracts={contracts}
                variations={variations}
                forecasts={forecasts}
                onSave={(line) => saveBudgetLine.mutate(line)}
                onDelete={(id) => deleteBudgetLine.mutate(id)}
              />
            )}
            {tab === 'Contracts' && (
              <ContractsTab
                budgetLines={budgetLines}
                contracts={contracts}
                variations={variations}
                payments={payments}
                onSave={(contract) => saveContract.mutate(contract)}
                onDelete={(id) => deleteContract.mutate(id)}
              />
            )}
            {tab === 'Variations' && (
              <VariationsTab
                contracts={contracts}
                variations={variations}
                onSave={(v) => saveVariation.mutate(v)}
                onDelete={(id) => deleteVariation.mutate(id)}
              />
            )}
            {tab === 'Payments' && (
              <PaymentsTab
                contracts={contracts}
                payments={payments}
                onSave={(p) => savePayment.mutate(p)}
                onDelete={(id) => deletePayment.mutate(id)}
              />
            )}
            {tab === 'Forecasts' && (
              <ForecastsTab
                budgetLines={budgetLines}
                forecasts={forecasts}
                onSave={(f) => saveForecast.mutate(f)}
                onDelete={(id) => deleteForecast.mutate(id)}
              />
            )}
          </>
        )}
      </main>
      <SignOutFooter />
    </div>
  );
}

function FullScreenMessage({ children, tone }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.pageBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        fontSize: 14,
        color: tone === 'error' ? colors.negative : colors.textMuted,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

function SignOutFooter() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 32px 32px',
        fontSize: 12,
        color: colors.textSubtle,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <span>Signed in as {user.email}</span>
      <button
        type="button"
        onClick={() => signOut()}
        style={{
          background: 'transparent',
          border: 'none',
          color: colors.textMuted,
          fontSize: 12,
          cursor: 'pointer',
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        Sign out
      </button>
    </div>
  );
}
