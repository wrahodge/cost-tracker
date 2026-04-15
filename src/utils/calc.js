// Cascading calculations for the Mastt-style cost-control model.
// All helpers are pure — they take slices of state and return derived
// numbers so the UI never stores anything that can be recomputed.
//
// Data shapes (see src/types.js for full definitions):
//
//   budget_line {
//     id, title, code, original_amount, adjustments_in, adjustments_out,
//     group_id, group?: { id, title, category?: { id, title } }
//   }
//
//   contract {
//     id, title, status, retention_pct,
//     contract_milestones: [{ id, budget_line_id, original_value, ... }]
//   }
//
//   variation {
//     id, contract_id, budget_line_id, status, variation_amount,
//     date_rejected
//   }
//
//   payment_claim {
//     id, contract_id, status, certified_amount, retention_amount,
//     claim_amount, value_completed, period_from, period_to
//   }

const sum = (arr) => arr.reduce((acc, n) => acc + (Number(n) || 0), 0);

// --- Budget line helpers ------------------------------------------------

export function budgetLineEffectiveBudget(line) {
  if (!line) return 0;
  return (
    (Number(line.original_amount) || 0) +
    (Number(line.adjustments_in) || 0) -
    (Number(line.adjustments_out) || 0)
  );
}

export function milestonesForBudgetLine(line, contracts) {
  const lineId = line.id;
  const out = [];
  for (const c of contracts) {
    const ms = c.contract_milestones || [];
    for (const m of ms) {
      if (m.budget_line_id === lineId) out.push(m);
    }
  }
  return out;
}

export function budgetCommitted(line, contracts) {
  return sum(milestonesForBudgetLine(line, contracts).map((m) => m.original_value));
}

export function budgetApprovedVars(line, variations) {
  return sum(
    variations
      .filter(
        (v) => v.budget_line_id === line.id && v.status === 'Approved' && !v.date_rejected
      )
      .map((v) => v.variation_amount)
  );
}

export function budgetUncommitted(line, contracts) {
  return budgetLineEffectiveBudget(line) - budgetCommitted(line, contracts);
}

// --- Contract helpers ---------------------------------------------------

export function contractOriginalSum(contract) {
  const ms = contract?.contract_milestones || [];
  return sum(ms.map((m) => m.original_value));
}

export function contractApprovedVars(contract, variations) {
  return sum(
    variations
      .filter(
        (v) =>
          v.contract_id === contract.id &&
          v.status === 'Approved' &&
          !v.date_rejected
      )
      .map((v) => v.variation_amount)
  );
}

export function contractRevisedSum(contract, variations) {
  return contractOriginalSum(contract) + contractApprovedVars(contract, variations);
}

export function contractTotalCertified(contract, payments) {
  return sum(
    payments
      .filter((p) => p.contract_id === contract.id)
      .map((p) => p.certified_amount)
  );
}

export function contractTotalPaid(contract, payments) {
  return sum(
    payments
      .filter((p) => p.contract_id === contract.id && p.status === 'Paid')
      .map((p) => p.certified_amount)
  );
}

// --- Payment helpers ----------------------------------------------------

// Retention is stored per claim (Mastt pattern). If the claim has a
// stored retention_amount, use it; otherwise fall back to contract
// retention_pct × certified_amount (useful when the user hasn't
// entered a value yet in the form).
export function paymentRetention(payment, contract) {
  if (payment.retention_amount != null && Number(payment.retention_amount) > 0) {
    return Number(payment.retention_amount);
  }
  const pct = contract ? Number(contract.retention_pct) || 0 : 0;
  return (Number(payment.certified_amount) || 0) * pct;
}

export function paymentNetPayable(payment, contract) {
  return (Number(payment.certified_amount) || 0) - paymentRetention(payment, contract);
}

// --- Project totals (dashboard cards) -----------------------------------

export function projectTotals({ budgetLines, contracts, variations, payments }) {
  const totalBudget = sum(budgetLines.map((b) => budgetLineEffectiveBudget(b)));

  const committed = sum(
    contracts.flatMap((c) => (c.contract_milestones || []).map((m) => m.original_value))
  );

  const approvedVars = sum(
    variations
      .filter((v) => v.status === 'Approved' && !v.date_rejected)
      .map((v) => v.variation_amount)
  );

  const certified = sum(payments.map((p) => p.certified_amount));
  const paid = sum(
    payments.filter((p) => p.status === 'Paid').map((p) => p.certified_amount)
  );

  const uncommitted = totalBudget - committed;
  return { totalBudget, committed, approvedVars, certified, paid, uncommitted };
}
