import React from 'react';
import { colors, card, sectionTitle } from '../styles.js';
import { formatMoney } from '../utils/format.js';
import {
  projectTotals,
  budgetCommitted,
  contractRevisedSum,
  contractTotalCertified,
} from '../utils/calc.js';
import BarChart from './BarChart.jsx';

export default function Dashboard({ budgetLines, contracts, variations, payments }) {
  const totals = projectTotals({ budgetLines, contracts, variations, payments });

  const cards = [
    { label: 'Total Budget', value: totals.totalBudget, tone: 'neutral' },
    { label: 'Committed', value: totals.committed, tone: 'neutral' },
    { label: 'Approved Variations', value: totals.approvedVars, tone: 'neutral' },
    { label: 'Certified', value: totals.certified, tone: 'neutral' },
    { label: 'Paid', value: totals.paid, tone: 'neutral' },
    {
      label: 'Uncommitted',
      value: totals.uncommitted,
      tone: totals.uncommitted < 0 ? 'negative' : 'positive',
    },
  ];

  const budgetChartData = budgetLines.map((b) => {
    const committed = budgetCommitted(b, contracts);
    const budgetAmount =
      (Number(b.original_amount) || 0) +
      (Number(b.adjustments_in) || 0) -
      (Number(b.adjustments_out) || 0);
    return {
      label: b.title,
      values: [
        { key: 'Budget', value: budgetAmount, color: colors.headerBg },
        { key: 'Committed', value: committed, color: colors.gold },
      ],
      rightLabel: `${formatMoney(committed)} / ${formatMoney(budgetAmount)}`,
    };
  });

  const contractChartData = contracts.map((c) => {
    const revised = contractRevisedSum(c, variations);
    const certified = contractTotalCertified(c, payments);
    return {
      label: c.title,
      values: [
        { key: 'Certified', value: certified, color: colors.gold },
        { key: 'Revised Sum', value: revised, color: colors.headerBg },
      ],
      rightLabel: `${formatMoney(certified)} / ${formatMoney(revised)}`,
    };
  });

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {cards.map((c) => (
          <div key={c.label} style={card}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: colors.textMuted,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginTop: 8,
                color:
                  c.tone === 'negative'
                    ? colors.negative
                    : c.tone === 'positive'
                    ? colors.positive
                    : colors.text,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatMoney(c.value)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
        }}
      >
        <div style={card}>
          <div style={sectionTitle}>Budget vs Committed by Cost Code</div>
          <BarChart data={budgetChartData} mode="grouped" />
          <Legend
            items={[
              { label: 'Original Budget', color: colors.headerBg },
              { label: 'Committed', color: colors.gold },
            ]}
          />
        </div>
        <div style={card}>
          <div style={sectionTitle}>Contract Payment Progress</div>
          <BarChart data={contractChartData} mode="grouped" />
          <Legend
            items={[
              { label: 'Certified', color: colors.gold },
              { label: 'Revised Sum', color: colors.headerBg },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        marginTop: 14,
        paddingTop: 12,
        borderTop: `1px solid ${colors.border}`,
        fontSize: 12,
        color: colors.textMuted,
      }}
    >
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: it.color,
              display: 'inline-block',
            }}
          />
          {it.label}
        </div>
      ))}
    </div>
  );
}
