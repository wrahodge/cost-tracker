// Cascading calculations for the cost-control model.
// All helpers are pure — they take slices of state and return derived numbers
// so the UI never stores anything that can be recomputed.

const sum = (arr) => arr.reduce((acc, n) => acc + (Number(n) || 0), 0);

export function contractApprovedVars(contract, variations) {
  return sum(
    variations
      .filter((v) => v.contractId === contract.id && v.status === 'Approved')
      .map((v) => v.amount)
  );
}

export function contractRevisedSum(contract, variations) {
  return (Number(contract.originalSum) || 0) + contractApprovedVars(contract, variations);
}

export function contractPaymentsForContract(contract, payments) {
  return payments.filter((p) => p.contractId === contract.id);
}

export function contractTotalCertified(contract, payments) {
  return sum(
    contractPaymentsForContract(contract, payments).map((p) => p.certifiedAmount)
  );
}

export function contractTotalPaid(contract, payments) {
  return sum(
    contractPaymentsForContract(contract, payments)
      .filter((p) => p.status === 'Paid')
      .map((p) => p.certifiedAmount)
  );
}

export function paymentRetention(payment, contract) {
  const pct = contract ? Number(contract.retentionPct) || 0 : 0;
  return (Number(payment.certifiedAmount) || 0) * pct;
}

export function paymentNetPayable(payment, contract) {
  return (Number(payment.certifiedAmount) || 0) - paymentRetention(payment, contract);
}

// --- Budget line rollups ------------------------------------------------

export function contractsForBudgetLine(line, contracts) {
  return contracts.filter((c) => c.budgetLineId === line.id);
}

export function budgetCommitted(line, contracts) {
  return sum(contractsForBudgetLine(line, contracts).map((c) => c.originalSum));
}

export function budgetApprovedVars(line, contracts, variations) {
  return sum(
    contractsForBudgetLine(line, contracts).map((c) =>
      contractApprovedVars(c, variations)
    )
  );
}

export function budgetUncommitted(line, contracts) {
  return (Number(line.originalBudget) || 0) - budgetCommitted(line, contracts);
}

// --- Project totals (dashboard cards) -----------------------------------

export function projectTotals({ budgetLines, contracts, variations, payments }) {
  const totalBudget = sum(budgetLines.map((b) => b.originalBudget));
  const committed = sum(contracts.map((c) => c.originalSum));
  const approvedVars = sum(
    variations.filter((v) => v.status === 'Approved').map((v) => v.amount)
  );
  const certified = sum(payments.map((p) => p.certifiedAmount));
  const paid = sum(
    payments.filter((p) => p.status === 'Paid').map((p) => p.certifiedAmount)
  );
  const uncommitted = totalBudget - committed;
  return { totalBudget, committed, approvedVars, certified, paid, uncommitted };
}
