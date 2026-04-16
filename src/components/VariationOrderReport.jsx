import React from 'react';
import { colors } from '../styles.js';
import { formatMoneyCents } from '../utils/format.js';
import { formatDate } from '../utils/format.js';
import { contractOriginalSum, contractApprovedVars, contractRevisedSum } from '../utils/calc.js';

const navy = '#2c3e6b';
const borderColor = '#dde0e6';
const goldBg = '#f5e6b8';

const cellPad = { padding: '7px 10px' };
const numCell = { ...cellPad, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const headerCell = {
  ...cellPad,
  background: navy,
  color: '#fff',
  fontWeight: 700,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};
const subTotalRow = { background: '#eef0f4', fontWeight: 700 };

/**
 * VariationOrderReport — printable Variation Order PDF.
 * Props: variation, contract, variations (all for the contract), project, onClose
 */
export default function VariationOrderReport({
  variation,
  contract,
  variations,
  project,
  onClose,
}) {
  if (!variation || !contract) return null;

  const origSum = contractOriginalSum(contract);

  // Previously approved variations (approved, not rejected, excluding THIS variation)
  const prevApprovedVars = (variations || [])
    .filter(
      (v) =>
        v.contract_id === contract.id &&
        v.id !== variation.id &&
        v.status === 'Approved' &&
        !v.date_rejected
    )
    .reduce((s, v) => s + (Number(v.variation_amount) || 0), 0);

  const contractSumPrior = origSum + prevApprovedVars;
  const approvedAmount = Number(variation.variation_amount) || 0;
  const requestedAmount = Number(variation.requested_amount) || 0;
  const revisedContractSum = contractSumPrior + approvedAmount;

  const variationTitle = [
    variation.title,
    variation.reference ? `- ${variation.reference}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#fff',
        zIndex: 100,
        overflowY: 'auto',
        fontFamily: "'DM Sans', sans-serif",
        color: '#1a1d23',
        fontSize: 12,
      }}
    >
      {/* Screen-only toolbar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '12px 24px',
          background: '#f5f6f8',
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            background: navy,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Print / Export PDF
        </button>
        <button
          onClick={onClose}
          style={{
            background: '#fff',
            color: colors.text,
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>

      {/* ================================================================ */}
      {/* PAGE 1 — Variation Order                                         */}
      {/* ================================================================ */}
      <div
        style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}
        className="print-page"
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
            marginBottom: 4,
            textTransform: 'uppercase',
          }}
        >
          Variation Order
        </h1>
        <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 4 }}>
          {variationTitle}
        </div>
        <div style={{ height: 2, background: navy, marginBottom: 24 }} />

        {/* Two-column header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            marginBottom: 32,
          }}
        >
          {/* Left — Contractor */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: navy,
                marginBottom: 8,
              }}
            >
              Contractor
            </div>
            <table
              style={{
                fontSize: 12,
                borderCollapse: 'collapse',
                width: '100%',
              }}
            >
              <tbody>
                <InfoRow label="Project" value={project?.title || '—'} />
                <InfoRow label="Contract Name" value={contract.title} />
              </tbody>
            </table>
          </div>

          {/* Right — Variation Details */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: '#6b7280',
                marginBottom: 8,
              }}
            >
              Principal
            </div>
            <table
              style={{
                fontSize: 12,
                borderCollapse: 'collapse',
                width: '100%',
              }}
            >
              <tbody>
                <InfoRow
                  label="Variation Details"
                  value=""
                  highlight
                  sectionHeader
                />
                <InfoRow
                  label="Date Received"
                  value={formatDate(variation.date_received)}
                  highlight
                />
                <InfoRow
                  label="Date Approved"
                  value={formatDate(variation.date_approved)}
                  highlight
                />
                <InfoRow
                  label="Approved Amount"
                  value={formatMoneyCents(approvedAmount)}
                  highlight
                  gold
                />
                <InfoRow
                  label="Days Requested"
                  value={
                    variation.days_claimed != null
                      ? String(variation.days_claimed)
                      : '—'
                  }
                  highlight
                />
                <InfoRow
                  label="Days Approved"
                  value={
                    variation.days_approved != null
                      ? String(variation.days_approved)
                      : '—'
                  }
                  highlight
                  gold
                />
                <InfoRow
                  label="Revised Contract"
                  value={formatMoneyCents(revisedContractSum)}
                  highlight
                  gold
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Contract Summary */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Contract Summary
        </div>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: 32,
          }}
        >
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'left' }}>Item</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellPad}>Original Contract Value</td>
              <td style={numCell}>{formatMoneyCents(origSum)}</td>
            </tr>
            <tr>
              <td style={cellPad}>Variations Previously Approved</td>
              <td style={numCell}>{formatMoneyCents(prevApprovedVars)}</td>
            </tr>
            <tr style={subTotalRow}>
              <td style={cellPad}>CONTRACT SUM PRIOR TO THIS VARIATION</td>
              <td style={numCell}>{formatMoneyCents(contractSumPrior)}</td>
            </tr>
            <tr>
              <td style={cellPad}>Requested Variation Amount</td>
              <td style={numCell}>{formatMoneyCents(requestedAmount)}</td>
            </tr>
            <tr>
              <td style={cellPad}>Approved Variation Amount</td>
              <td style={numCell}>{formatMoneyCents(approvedAmount)}</td>
            </tr>
            <tr
              style={{
                background: navy,
                color: '#fff',
                fontWeight: 700,
              }}
            >
              <td style={{ ...cellPad, color: goldBg }}>
                REVISED CONTRACT SUM (Including Approved Variations)
              </td>
              <td style={{ ...numCell, color: '#fff' }}>
                {formatMoneyCents(revisedContractSum)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Approval */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Approval
        </div>
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            marginBottom: 24,
            border: `1px solid ${borderColor}`,
            padding: '12px 16px',
            borderRadius: 4,
          }}
        >
          Pursuant to the clause under the contract, the Superintendent
          certifies the Contractor&apos;s Variation in accordance with this
          Variation Order.
        </div>
        <div style={{ fontWeight: 700, fontSize: 12 }}>
          Authorised by{' '}
          <span
            style={{
              display: 'inline-block',
              width: 200,
              borderBottom: '1px solid #1a1d23',
              marginLeft: 8,
            }}
          >
            &nbsp;
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* PAGE 2 — Variation Amount (line items)                           */}
      {/* ================================================================ */}
      <div
        style={{
          pageBreakBefore: 'always',
          maxWidth: 900,
          margin: '0 auto',
          padding: '40px 32px',
        }}
        className="print-page"
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
            marginBottom: 4,
            textTransform: 'uppercase',
          }}
        >
          Variation Order
        </h1>
        <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 4 }}>
          {variationTitle}
        </div>
        <div
          style={{ height: 2, background: '#2563eb', marginBottom: 32 }}
        />

        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Variation Amount
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#6b7280',
            marginBottom: 12,
          }}
        >
          Below are line items for this Variation.
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: 24,
          }}
        >
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'center', width: 50 }}>
                No
              </th>
              <th style={{ ...headerCell, textAlign: 'left' }}>Variation</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>
                Requested Amount
              </th>
              <th style={{ ...headerCell, textAlign: 'right' }}>
                Approved Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellPad, textAlign: 'center' }}>1</td>
              <td style={{ ...cellPad, fontWeight: 600 }}>
                {variation.reference || variation.title || 'Variation'}
              </td>
              <td style={numCell}>{formatMoneyCents(requestedAmount)}</td>
              <td style={numCell}>{formatMoneyCents(approvedAmount)}</td>
            </tr>
            <tr
              style={{
                background: navy,
                color: '#fff',
                fontWeight: 700,
              }}
            >
              <td colSpan={2} style={{ ...cellPad, color: goldBg }}>
                TOTAL (Exc. GST)
              </td>
              <td style={{ ...numCell, color: '#fff' }}>
                {formatMoneyCents(requestedAmount)}
              </td>
              <td style={{ ...numCell, color: '#fff' }}>
                {formatMoneyCents(approvedAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header, nav, footer { display: none !important; }
          body, #root { background: #fff !important; }
          .print-page { padding: 20px 16px !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}

// --- helpers ---

function InfoRow({ label, value, highlight, gold: isGold, sectionHeader }) {
  return (
    <tr>
      <td
        style={{
          padding: '6px 10px',
          fontWeight: 700,
          fontSize: 11,
          textTransform: 'uppercase',
          color: highlight ? navy : '#6b7280',
          background: isGold
            ? goldBg
            : highlight
              ? '#eef0f7'
              : 'transparent',
          borderBottom: `1px solid ${borderColor}`,
          width: '45%',
        }}
      >
        {label}
      </td>
      {!sectionHeader && (
        <td
          style={{
            padding: '6px 10px',
            fontSize: 12,
            borderBottom: `1px solid ${borderColor}`,
            background: isGold ? goldBg : 'transparent',
            fontWeight: isGold ? 700 : 400,
          }}
        >
          {value}
        </td>
      )}
      {sectionHeader && <td style={{ borderBottom: `1px solid ${borderColor}` }} />}
    </tr>
  );
}
