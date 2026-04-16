import React, { useState, useMemo } from 'react';
import { colors, tableStyles } from '../styles.js';
import { formatMoney, formatPct } from '../utils/format.js';
import {
  budgetLineEffectiveBudget,
  budgetCommitted,
  budgetApprovedVars,
  budgetUncommitted,
  budgetForecastTotal,
  budgetLineFFC,
  budgetLineVariance,
  contractOriginalSum,
  contractApprovedVars,
  contractRevisedSum,
  contractTotalCertified,
  contractTotalPaid,
  milestonesForBudgetLine,
  forecastsForBudgetLine,
  projectTotals,
} from '../utils/calc.js';

// 8-level Mastt Overall view, built client-side from the same data
// slices used across other tabs. No SQL view needed — all calculation
// happens at render time via the pure helpers in calc.js.
//
// Tree shape:
//   D1: Project root
//   D2: Budget Category
//   D3: Budget Group
//   D4: Budget Line Item
//     D5: Contract (linked via milestones)
//       D6: Contract Milestone
//       D6: Variations folder (aggregate)
//         D7: Individual variation
//     D5: Forecasts folder (aggregate)
//       D6: Individual forecast

export default function OverallTab({
  project,
  budgetCategories,
  budgetGroups,
  budgetLines,
  contracts,
  variations,
  payments,
  forecasts,
}) {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const totals = projectTotals({ budgetLines, contracts, variations, payments, forecasts });

  const tree = useMemo(() => {
    return (budgetCategories || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => {
        const groups = (budgetGroups || [])
          .filter((g) => (g.category_id || g.category?.id) === cat.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((grp) => {
            const lines = budgetLines
              .filter((l) => l.group_id === grp.id)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((line) => {
                // Contracts linked to this line via milestones
                const linkedContracts = contracts.filter((c) =>
                  (c.contract_milestones || []).some(
                    (m) => m.budget_line_id === line.id
                  )
                );
                // Variations against this line
                const lineVariations = variations.filter(
                  (v) => v.budget_line_id === line.id
                );
                // Forecasts against this line
                const lineForecasts = forecastsForBudgetLine(line, forecasts);
                return { ...line, linkedContracts, lineVariations, lineForecasts };
              });
            return { ...grp, lines };
          });
        return { ...cat, groups };
      });
  }, [budgetCategories, budgetGroups, budgetLines, contracts, variations, forecasts]);

  // Roll-up helpers
  const linesRollup = (lines) => {
    let budget = 0, committed = 0, approved = 0, ffc = 0, variance = 0, paid = 0, certified = 0;
    for (const line of lines) {
      budget += budgetLineEffectiveBudget(line);
      committed += budgetCommitted(line, contracts);
      approved += budgetApprovedVars(line, variations);
      ffc += budgetLineFFC(line, contracts, variations, forecasts);
      variance += budgetLineVariance(line, contracts, variations, forecasts);
    }
    // paid/certified come from payments, which are per-contract
    // We compute from the linked contracts for these lines
    const lineIds = new Set(lines.map((l) => l.id));
    for (const c of contracts) {
      const hasLink = (c.contract_milestones || []).some((m) => lineIds.has(m.budget_line_id));
      if (hasLink) {
        certified += contractTotalCertified(c, payments);
        paid += contractTotalPaid(c, payments);
      }
    }
    return { budget, committed, approved, ffc, variance, certified, paid };
  };

  const groupRollup = (grp) => linesRollup(grp.lines);
  const catRollup = (cat) => {
    const allLines = cat.groups.flatMap((g) => g.lines);
    return linesRollup(allLines);
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700 }}>
        Overall View
      </h1>

      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={{ ...tableStyles.th, width: 40 }}></th>
              <th style={{ ...tableStyles.th, minWidth: 250 }}>Title</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Budget</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Committed</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Variations</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Current Contract</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>FFC</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Variance</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Paid</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Pay %</th>
            </tr>
          </thead>
          <tbody>
            {/* D1: Project root */}
            <tr style={{ background: '#e0e2e7', cursor: 'pointer' }} onClick={() => toggle('root')}>
              <td style={cellStyle(0)}><Chevron open={!collapsed.root} /></td>
              <td style={{ ...cellStyle(0), fontWeight: 700, fontSize: 14 }}>{project?.title || 'Project'}</td>
              <NumCells
                budget={totals.totalBudget}
                committed={totals.committed}
                approvedVars={totals.approvedVars}
                currentContract={totals.committed + totals.approvedVars}
                ffc={totals.ffc}
                variance={totals.variance}
                paid={totals.paid}
                payPct={totals.committed + totals.approvedVars > 0 ? totals.paid / (totals.committed + totals.approvedVars) : 0}
                bold
              />
            </tr>

            {!collapsed.root && tree.map((cat) => {
              const catId = `cat-${cat.id}`;
              const cr = catRollup(cat);
              const cc = cr.committed + cr.approved;
              return (
                <React.Fragment key={cat.id}>
                  {/* D2: Category */}
                  <tr style={{ background: '#eef0f3', cursor: 'pointer' }} onClick={() => toggle(catId)}>
                    <td style={cellStyle(1)}><Chevron open={!collapsed[catId]} /></td>
                    <td style={{ ...cellStyle(1), fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {cat.title}
                    </td>
                    <NumCells budget={cr.budget} committed={cr.committed} approvedVars={cr.approved} currentContract={cc} ffc={cr.ffc} variance={cr.variance} paid={cr.paid} payPct={cc > 0 ? cr.paid / cc : 0} bold />
                  </tr>

                  {!collapsed[catId] && cat.groups.map((grp) => {
                    const grpId = `grp-${grp.id}`;
                    const gr = groupRollup(grp);
                    const gc = gr.committed + gr.approved;
                    return (
                      <React.Fragment key={grp.id}>
                        {/* D3: Group */}
                        <tr style={{ background: '#f5f6f8', cursor: 'pointer' }} onClick={() => toggle(grpId)}>
                          <td style={cellStyle(2)}><Chevron open={!collapsed[grpId]} /></td>
                          <td style={{ ...cellStyle(2), fontWeight: 600, fontSize: 13, color: colors.textMuted }}>
                            {grp.title}
                          </td>
                          <NumCells budget={gr.budget} committed={gr.committed} approvedVars={gr.approved} currentContract={gc} ffc={gr.ffc} variance={gr.variance} paid={gr.paid} payPct={gc > 0 ? gr.paid / gc : 0} />
                        </tr>

                        {!collapsed[grpId] && grp.lines.map((line) => {
                          const lineId = `line-${line.id}`;
                          const bud = budgetLineEffectiveBudget(line);
                          const com = budgetCommitted(line, contracts);
                          const app = budgetApprovedVars(line, variations);
                          const cc2 = com + app;
                          const ffc = budgetLineFFC(line, contracts, variations, forecasts);
                          const vari = budgetLineVariance(line, contracts, variations, forecasts);
                          const lPaid = line.linkedContracts.reduce((s, c) => s + contractTotalPaid(c, payments), 0);
                          return (
                            <React.Fragment key={line.id}>
                              {/* D4: Budget Line */}
                              <tr style={{ cursor: 'pointer' }} onClick={() => toggle(lineId)}
                                onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                <td style={cellStyle(3)}>
                                  {(line.linkedContracts.length > 0 || line.lineForecasts.length > 0) && (
                                    <Chevron open={!collapsed[lineId]} />
                                  )}
                                </td>
                                <td style={{ ...cellStyle(3), fontWeight: 500 }}>
                                  {line.code ? <span style={{ color: colors.textMuted, marginRight: 8 }}>{line.code}</span> : null}
                                  {line.title}
                                </td>
                                <NumCells budget={bud} committed={com} approvedVars={app} currentContract={cc2} ffc={ffc} variance={vari} paid={lPaid} payPct={cc2 > 0 ? lPaid / cc2 : 0} />
                              </tr>

                              {!collapsed[lineId] && (
                                <>
                                  {/* D5–D6: Contracts + Milestones */}
                                  {line.linkedContracts.map((contract) => {
                                    const cId = `ctr-${contract.id}-${line.id}`;
                                    const orig = contractOriginalSum(contract);
                                    const cApp = contractApprovedVars(contract, variations);
                                    const revised = contractRevisedSum(contract, variations);
                                    const cPaid = contractTotalPaid(contract, payments);
                                    const cVars = variations.filter((v) => v.contract_id === contract.id);
                                    return (
                                      <React.Fragment key={contract.id}>
                                        {/* D5: Contract */}
                                        <tr style={{ cursor: 'pointer' }} onClick={() => toggle(cId)}
                                          onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                          <td style={cellStyle(4)}>
                                            <Chevron open={!collapsed[cId]} />
                                          </td>
                                          <td style={{ ...cellStyle(4), color: '#2b4b8c', fontWeight: 500 }}>
                                            {contract.reference ? `${contract.reference} — ` : ''}
                                            {contract.title}
                                          </td>
                                          <td style={numStyle}>—</td>
                                          <td style={numStyle}>{formatMoney(orig)}</td>
                                          <td style={numStyle}>{formatMoney(cApp)}</td>
                                          <td style={numStyle}>{formatMoney(revised)}</td>
                                          <td style={numStyle}>—</td>
                                          <td style={numStyle}>—</td>
                                          <td style={numStyle}>{formatMoney(cPaid)}</td>
                                          <td style={numStyle}>{revised > 0 ? formatPct(cPaid / revised) : '—'}</td>
                                        </tr>

                                        {!collapsed[cId] && (
                                          <>
                                            {/* D6: Milestones */}
                                            {(contract.contract_milestones || [])
                                              .filter((m) => m.budget_line_id === line.id)
                                              .map((m) => (
                                                <tr key={m.id}>
                                                  <td style={cellStyle(5)} />
                                                  <td style={{ ...cellStyle(5), color: colors.textMuted, fontSize: 13 }}>
                                                    {m.title}
                                                  </td>
                                                  <td style={numStyle}>—</td>
                                                  <td style={numStyle}>{formatMoney(m.original_value)}</td>
                                                  <td colSpan={6} style={numStyle}>—</td>
                                                </tr>
                                              ))}

                                            {/* D6: Variations folder */}
                                            {cVars.length > 0 && (
                                              <>
                                                <tr
                                                  style={{ cursor: 'pointer' }}
                                                  onClick={() => toggle(`vars-${contract.id}`)}
                                                >
                                                  <td style={cellStyle(5)}>
                                                    <Chevron open={!collapsed[`vars-${contract.id}`]} />
                                                  </td>
                                                  <td style={{ ...cellStyle(5), fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted }}>
                                                    Variations ({cVars.length})
                                                  </td>
                                                  <td style={numStyle}>—</td>
                                                  <td style={numStyle}>—</td>
                                                  <td style={numStyle}>{formatMoney(cApp)}</td>
                                                  <td colSpan={5} style={numStyle}>—</td>
                                                </tr>
                                                {!collapsed[`vars-${contract.id}`] &&
                                                  cVars.map((v) => (
                                                    <tr key={v.id}>
                                                      <td style={cellStyle(6)} />
                                                      <td
                                                        style={{
                                                          ...cellStyle(6),
                                                          fontSize: 13,
                                                          color: v.date_rejected ? colors.textMuted : colors.text,
                                                          textDecoration: v.date_rejected ? 'line-through' : 'none',
                                                        }}
                                                      >
                                                        <StatusDot status={v.date_rejected ? 'Rejected' : v.status} />
                                                        {v.reference ? `${v.reference} — ` : ''}
                                                        {v.title}
                                                      </td>
                                                      <td style={numStyle}>—</td>
                                                      <td style={numStyle}>—</td>
                                                      <td style={numStyle}>{formatMoney(v.variation_amount)}</td>
                                                      <td colSpan={5} style={numStyle}>—</td>
                                                    </tr>
                                                  ))}
                                              </>
                                            )}
                                          </>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}

                                  {/* D5: Forecasts folder */}
                                  {line.lineForecasts.length > 0 && (
                                    <>
                                      <tr
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => toggle(`for-${line.id}`)}
                                      >
                                        <td style={cellStyle(4)}>
                                          <Chevron open={!collapsed[`for-${line.id}`]} />
                                        </td>
                                        <td style={{ ...cellStyle(4), fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.pending }}>
                                          Forecasts ({line.lineForecasts.length})
                                        </td>
                                        <td style={numStyle}>—</td>
                                        <td style={numStyle}>—</td>
                                        <td style={numStyle}>—</td>
                                        <td style={numStyle}>—</td>
                                        <td style={numStyle}>{formatMoney(budgetForecastTotal(line, forecasts))}</td>
                                        <td colSpan={3} style={numStyle}>—</td>
                                      </tr>
                                      {!collapsed[`for-${line.id}`] &&
                                        line.lineForecasts.map((f) => (
                                          <tr key={f.id}>
                                            <td style={cellStyle(5)} />
                                            <td style={{ ...cellStyle(5), fontSize: 13, color: colors.pending }}>
                                              {f.title}
                                            </td>
                                            <td style={numStyle}>—</td>
                                            <td style={numStyle}>—</td>
                                            <td style={numStyle}>—</td>
                                            <td style={numStyle}>—</td>
                                            <td style={numStyle}>{formatMoney(f.amount)}</td>
                                            <td colSpan={3} style={numStyle}>—</td>
                                          </tr>
                                        ))}
                                    </>
                                  )}
                                </>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Small helpers ---

const INDENT_PX = 20;

function cellStyle(depth) {
  return {
    ...tableStyles.td,
    paddingLeft: 12 + depth * INDENT_PX,
  };
}

const numStyle = {
  ...tableStyles.td,
  ...tableStyles.numeric,
  fontSize: 13,
};

function Chevron({ open }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        color: colors.textMuted,
        transition: 'transform 0.15s',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      }}
    >
      ▶
    </span>
  );
}

function NumCells({ budget, committed, approvedVars, currentContract, ffc, variance, paid, payPct, bold }) {
  const s = { ...numStyle, fontWeight: bold ? 700 : 400 };
  return (
    <>
      <td style={s}>{formatMoney(budget)}</td>
      <td style={s}>{formatMoney(committed)}</td>
      <td style={s}>{formatMoney(approvedVars)}</td>
      <td style={s}>{formatMoney(currentContract)}</td>
      <td style={s}>{formatMoney(ffc)}</td>
      <td style={{ ...s, color: variance < 0 ? colors.negative : colors.positive }}>
        {formatMoney(variance)}
      </td>
      <td style={s}>{formatMoney(paid)}</td>
      <td style={s}>{payPct > 0 ? formatPct(payPct) : '—'}</td>
    </>
  );
}

const STATUS_COLORS = {
  Approved: colors.positive,
  'In Principle': '#2b4b8c',
  Pending: colors.pending,
  Forecast: colors.textMuted,
  Rejected: colors.negative,
};

function StatusDot({ status }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: STATUS_COLORS[status] || colors.textMuted,
        marginRight: 6,
        verticalAlign: 'middle',
      }}
      title={status}
    />
  );
}
