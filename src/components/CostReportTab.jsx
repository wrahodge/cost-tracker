import React, { useMemo } from 'react';
import { colors, tableStyles, btn, card, sectionTitle } from '../styles.js';
import { formatMoney, formatPct, formatDate } from '../utils/format.js';
import {
  contractOriginalSum,
  contractApprovedVars,
  contractRevisedSum,
  contractTotalCertified,
  contractTotalPaid,
  paymentRetention,
  paymentNetPayable,
  projectTotals,
} from '../utils/calc.js';

export default function CostReportTab({
  project,
  budgetLines,
  contracts,
  variations,
  payments,
  forecasts,
}) {
  const totals = projectTotals({ budgetLines, contracts, variations, payments, forecasts });

  // Group payments by month, sorted chronologically
  const months = useMemo(() => {
    const map = {};
    for (const p of payments) {
      const key = p.month || (p.date ? p.date.slice(0, 7) : 'Unknown');
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [payments]);

  const budgetLineLabel = (id) => {
    const b = budgetLines.find((x) => x.id === id);
    return b ? (b.code ? `${b.code} — ${b.title}` : b.title) : '—';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Monthly Cost Report</h1>
        <button
          type="button"
          style={btn.primary}
          onClick={() => window.print()}
        >
          Print / Export PDF
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 24,
        }}
        className="print-summary"
      >
        <SummaryCard label="Total Budget" value={totals.totalBudget} />
        <SummaryCard label="Current Contract" value={totals.committed + totals.approvedVars} />
        <SummaryCard label="FFC" value={totals.ffc} />
        <SummaryCard
          label="Variance"
          value={totals.variance}
          color={totals.variance < 0 ? colors.negative : colors.positive}
        />
      </div>

      {/* Contract summary table */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionTitle}>Contract Summary</div>
        <div style={tableStyles.wrapper}>
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Ref</th>
                <th style={tableStyles.th}>Contractor</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Original</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Variations</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Revised</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Certified</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Paid</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Remaining</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Pay %</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const orig = contractOriginalSum(c);
                const vars = contractApprovedVars(c, variations);
                const revised = contractRevisedSum(c, variations);
                const cert = contractTotalCertified(c, payments);
                const paid = contractTotalPaid(c, payments);
                const remaining = revised - paid;
                const pct = revised > 0 ? paid / revised : 0;
                return (
                  <tr key={c.id}>
                    <td style={tableStyles.td}>{c.reference || '—'}</td>
                    <td style={tableStyles.td}>{c.title}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(orig)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(vars)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(revised)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(cert)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(paid)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, color: remaining > 0 ? colors.text : colors.negative }}>
                      {formatMoney(remaining)}
                    </td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatPct(pct)}</td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr style={{ background: colors.accentRow }}>
                <td colSpan={2} style={{ ...tableStyles.td, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted }}>
                  Total
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>
                  {formatMoney(contracts.reduce((s, c) => s + contractOriginalSum(c), 0))}
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>
                  {formatMoney(totals.approvedVars)}
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>
                  {formatMoney(totals.committed + totals.approvedVars)}
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>
                  {formatMoney(totals.certified)}
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>
                  {formatMoney(totals.paid)}
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>
                  {formatMoney(totals.committed + totals.approvedVars - totals.paid)}
                </td>
                <td style={tableStyles.td} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment claims by month */}
      <div style={sectionTitle}>Payment Certificates by Month</div>
      {months.length === 0 ? (
        <div style={{ color: colors.textMuted, fontSize: 14, padding: '16px 0' }}>
          No payment certificates recorded yet.
        </div>
      ) : (
        months.map(([month, claims]) => {
          const monthTotal = claims.reduce((s, p) => s + (Number(p.certified_amount) || 0), 0);
          const monthRetention = claims.reduce((s, p) => {
            const c = contracts.find((x) => x.id === p.contract_id);
            return s + paymentRetention(p, c);
          }, 0);
          const monthNet = claims.reduce((s, p) => {
            const c = contracts.find((x) => x.id === p.contract_id);
            return s + paymentNetPayable(p, c);
          }, 0);
          return (
            <div key={month} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                {month}
              </div>
              <div style={tableStyles.wrapper}>
                <table style={tableStyles.table}>
                  <thead>
                    <tr>
                      <th style={tableStyles.th}>Ref</th>
                      <th style={tableStyles.th}>Contract</th>
                      <th style={tableStyles.th}>Period</th>
                      <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Claimed</th>
                      <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Certified</th>
                      <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Retention</th>
                      <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Net Payable</th>
                      <th style={tableStyles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((p) => {
                      const c = contracts.find((x) => x.id === p.contract_id);
                      const ret = paymentRetention(p, c);
                      const net = paymentNetPayable(p, c);
                      return (
                        <tr key={p.id}>
                          <td style={tableStyles.td}>{p.reference || '—'}</td>
                          <td style={tableStyles.td}>{c ? c.title : '—'}</td>
                          <td style={{ ...tableStyles.td, fontSize: 13, color: colors.textMuted }}>
                            {p.period_from && p.period_to
                              ? `${formatDate(p.period_from)} – ${formatDate(p.period_to)}`
                              : formatDate(p.date)}
                          </td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(p.claim_amount)}</td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(p.certified_amount)}</td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(ret)}</td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>{formatMoney(net)}</td>
                          <td style={tableStyles.td}>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: p.status === 'Paid' ? colors.positive : p.status === 'Draft' ? colors.pending : colors.text,
                            }}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: colors.accentRow }}>
                      <td colSpan={4} style={{ ...tableStyles.td, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted }}>
                        Month Total
                      </td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>{formatMoney(monthTotal)}</td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>{formatMoney(monthRetention)}</td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 700 }}>{formatMoney(monthNet)}</td>
                      <td style={tableStyles.td} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.textMuted }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: color || colors.text, fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(value)}
      </div>
    </div>
  );
}
