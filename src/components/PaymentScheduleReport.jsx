import React from 'react';
import { colors } from '../styles.js';
import { formatMoney, formatMoneyCents, formatDate } from '../utils/format.js';
import { contractOriginalSum, contractApprovedVars, contractRevisedSum } from '../utils/calc.js';

// Mastt-style colour tokens for the report
const navy = '#2c3e6b';
const gold = '#d4a017';
const lightBg = '#f5f6f8';
const borderColor = '#dde0e6';

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
  borderBottom: `2px solid ${navy}`,
};
const subTotalRow = { background: '#eef0f4', fontWeight: 700 };
const highlightBg = { background: '#e8d97a' };

/**
 * PaymentScheduleReport — printable Payment Schedule + Payment Report.
 * Renders as a full-page overlay; press "Print" to export to PDF.
 * Props:
 *   payment, contract, variations, lineItems (milestone items),
 *   variationItems, project, onClose
 */
export default function PaymentScheduleReport({
  payment,
  contract,
  variations,
  lineItems = [],
  variationItems = [],
  project,
  onClose,
}) {
  if (!payment || !contract) return null;

  const origSum = contractOriginalSum(contract);
  const varSum = contractApprovedVars(contract, variations);
  const revisedSum = contractRevisedSum(contract, variations);
  const taxPct = Number(contract.tax_percent) || 10;

  // Milestone aggregates
  const msTotals = aggregate(lineItems);
  // Variation aggregates
  const vrTotals = aggregate(variationItems);
  // Grand totals
  const grand = {
    approved: msTotals.approved + vrTotals.approved,
    totalToDate: msTotals.totalToDate + vrTotals.totalToDate,
    previous: msTotals.previous + vrTotals.previous,
    thisPayment: msTotals.thisPayment + vrTotals.thisPayment,
    remaining: msTotals.remaining + vrTotals.remaining,
  };
  grand.pct = grand.approved > 0 ? (grand.totalToDate / grand.approved) * 100 : 0;
  const thisPmtPct = grand.approved > 0 ? (grand.thisPayment / grand.approved) * 100 : 0;

  const approvedAmount = Number(payment.certified_amount) || 0;
  const gst = approvedAmount * (taxPct / 100);
  const totalIncGST = approvedAmount + gst;

  const period = payment.period_from && payment.period_to
    ? `${formatDate(payment.period_from)} - ${formatDate(payment.period_to)}`
    : '—';

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
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 24px', background: lightBg, borderBottom: `1px solid ${borderColor}` }}>
        <button onClick={() => window.print()} style={{ background: navy, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Print / Export PDF
        </button>
        <button onClick={onClose} style={{ background: '#fff', color: colors.text, border: `1px solid ${borderColor}`, borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          Close
        </button>
      </div>

      {/* ================================================================ */}
      {/* PAGE 1 — Payment Schedule                                        */}
      {/* ================================================================ */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }} className="print-page">
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 4, textTransform: 'uppercase' }}>
          Payment Schedule
        </h1>
        <div style={{ height: 2, background: navy, marginBottom: 24 }} />

        {/* Two-column header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
          {/* Left — Contractor */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 8 }}>
              Contractor
            </div>
            <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <InfoRow label="Project" value={project?.title || '—'} />
                <InfoRow label="Contract Name" value={contract.title} />
                <InfoRow label="Payment Claim" value={payment.title || payment.reference || '—'} />
                <InfoRow label="Purchase Order" value={contract.po_number || '—'} />
                <InfoRow label="Invoice Number" value={payment.invoice || '—'} />
              </tbody>
            </table>
          </div>

          {/* Right — Payment Details */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 8 }}>
              Payment Details
            </div>
            <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <InfoRow label="Date Claim Received" value={formatDate(payment.date_received)} highlight />
                <InfoRow label="Certified Date" value={formatDate(payment.date_approved || payment.date)} highlight />
                <InfoRow label="Payment Period" value={period} highlight />
                <InfoRow label="Submitted Amount" value={formatMoneyCents(Number(payment.submitted_amount) || Number(payment.claim_amount) || 0)} highlight />
                <InfoRow label="Approved Amount" value={formatMoneyCents(approvedAmount)} highlight gold />
                <InfoRow label="Total Amount (inc. GST)" value={formatMoneyCents(totalIncGST)} highlight gold />
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'left' }}>Item</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Approved Contract</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Total to Date</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>%</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Previous Total</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>This Payment</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellPad}>Contract</td>
              <td style={numCell}>{formatMoneyCents(msTotals.approved)}</td>
              <td style={numCell}>{formatMoneyCents(msTotals.totalToDate)}</td>
              <td style={numCell}>{msTotals.approved > 0 ? ((msTotals.totalToDate / msTotals.approved) * 100).toFixed(2) + '%' : '0%'}</td>
              <td style={numCell}>{formatMoneyCents(msTotals.previous)}</td>
              <td style={numCell}>{formatMoneyCents(msTotals.thisPayment)}</td>
              <td style={numCell}>{formatMoneyCents(msTotals.remaining)}</td>
            </tr>
            <tr>
              <td style={cellPad}>Approved Variations</td>
              <td style={numCell}>{formatMoneyCents(vrTotals.approved)}</td>
              <td style={numCell}>{formatMoneyCents(vrTotals.totalToDate)}</td>
              <td style={numCell}>{vrTotals.approved > 0 ? ((vrTotals.totalToDate / vrTotals.approved) * 100).toFixed(2) + '%' : '0%'}</td>
              <td style={numCell}>{formatMoneyCents(vrTotals.previous)}</td>
              <td style={numCell}>{formatMoneyCents(vrTotals.thisPayment)}</td>
              <td style={numCell}>{formatMoneyCents(vrTotals.remaining)}</td>
            </tr>
            <tr style={subTotalRow}>
              <td style={cellPad}>SUB-TOTAL</td>
              <td style={numCell}>{formatMoneyCents(grand.approved)}</td>
              <td style={numCell}>{formatMoneyCents(grand.totalToDate)}</td>
              <td style={numCell}>{grand.pct.toFixed(2)}%</td>
              <td style={numCell}>{formatMoneyCents(grand.previous)}</td>
              <td style={numCell}>{formatMoneyCents(grand.thisPayment)}</td>
              <td style={numCell}>{formatMoneyCents(grand.remaining)}</td>
            </tr>
            <tr>
              <td colSpan={5} style={cellPad}>GST</td>
              <td style={numCell}>{formatMoneyCents(gst)}</td>
              <td style={numCell}></td>
            </tr>
            <tr style={{ ...subTotalRow, background: navy, color: '#fff' }}>
              <td colSpan={5} style={{ ...cellPad, fontWeight: 700 }}>TOTAL AMOUNT (inc. GST)</td>
              <td style={{ ...numCell, fontWeight: 700 }}>{formatMoneyCents(totalIncGST)}</td>
              <td style={numCell}></td>
            </tr>
          </tbody>
        </table>

        {/* Footer text */}
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 32, marginTop: 24 }}>
          This Payment &apos;{payment.title || payment.reference || '—'}&apos; for{' '}
          {payment.month || '—'} is issued under the contract.
        </div>
        <div style={{ fontWeight: 700, fontSize: 12 }}>
          Authorised by <span style={{ display: 'inline-block', width: 200, borderBottom: '1px solid #1a1d23', marginLeft: 8 }}>&nbsp;</span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* PAGE 2 — Payment Report (detail)                                 */}
      {/* ================================================================ */}
      <div style={{ pageBreakBefore: 'always', maxWidth: 900, margin: '0 auto', padding: '40px 32px' }} className="print-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280' }}>
              Payment Report
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Amounts Exclude GST</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{contract.title}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'left' }}>Contract Item</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Approved Contract</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Total to Date</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>%</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Previous Total</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>This Payment</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>%</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {/* Milestone rows */}
            {lineItems.map((it, i) => {
              const approved = Number(it.approved_value) || 0;
              const prev = Number(it.previous_total) || 0;
              const thisPmt = Number(it.this_payment) || 0;
              const totalToDate = prev + thisPmt;
              const tdPct = approved > 0 ? ((totalToDate / approved) * 100).toFixed(0) + '%' : '0%';
              const tpPct = approved > 0 ? ((thisPmt / approved) * 100).toFixed(2) + '%' : '0%';
              const remaining = approved - totalToDate;
              return (
                <tr key={i}>
                  <td style={{ ...cellPad, fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5b7bb5', flexShrink: 0 }} />
                      {it.title}
                    </div>
                  </td>
                  <td style={numCell}>{formatMoneyCents(approved)}</td>
                  <td style={numCell}>{formatMoneyCents(totalToDate)}</td>
                  <td style={numCell}>{tdPct}</td>
                  <td style={numCell}>{formatMoneyCents(prev)}</td>
                  <td style={numCell}>{formatMoneyCents(thisPmt)}</td>
                  <td style={numCell}>{tpPct}</td>
                  <td style={numCell}>{formatMoneyCents(remaining)}</td>
                </tr>
              );
            })}

            {/* Contract sub-total */}
            <tr style={subTotalRow}>
              <td style={{ ...cellPad, fontWeight: 700 }}>CONTRACT SUB-TOTAL</td>
              <td style={numCell}>{formatMoneyCents(msTotals.approved)}</td>
              <td style={numCell}>{formatMoneyCents(msTotals.totalToDate)}</td>
              <td style={numCell}>{msTotals.approved > 0 ? ((msTotals.totalToDate / msTotals.approved) * 100).toFixed(2) + '%' : '0%'}</td>
              <td style={numCell}>{formatMoneyCents(msTotals.previous)}</td>
              <td style={numCell}>{formatMoneyCents(msTotals.thisPayment)}</td>
              <td style={numCell}>{msTotals.approved > 0 ? ((msTotals.thisPayment / msTotals.approved) * 100).toFixed(2) + '%' : '0%'}</td>
              <td style={numCell}>{formatMoneyCents(msTotals.remaining)}</td>
            </tr>

            {/* Variation rows */}
            {variationItems.map((it, i) => {
              const approved = Number(it.approved_value) || 0;
              const prev = Number(it.previous_total) || 0;
              const thisPmt = Number(it.this_payment) || 0;
              const totalToDate = prev + thisPmt;
              const tdPct = approved > 0 ? ((totalToDate / approved) * 100).toFixed(2) + '%' : '0%';
              const remaining = approved - totalToDate;
              return (
                <tr key={`v${i}`}>
                  <td style={{ ...cellPad, fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#e7edf7', color: '#2b4b8c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>V</span>
                      {it.title}
                    </div>
                  </td>
                  <td style={numCell}>{formatMoneyCents(approved)}</td>
                  <td style={numCell}>{formatMoneyCents(totalToDate)}</td>
                  <td style={numCell}>{tdPct}</td>
                  <td style={numCell}>{formatMoneyCents(prev)}</td>
                  <td style={numCell}>{formatMoneyCents(thisPmt)}</td>
                  <td style={numCell}>{approved > 0 ? ((thisPmt / approved) * 100).toFixed(2) + '%' : '0%'}</td>
                  <td style={numCell}>{formatMoneyCents(remaining)}</td>
                </tr>
              );
            })}

            {/* Variation sub-total */}
            {variationItems.length > 0 && (
              <tr style={subTotalRow}>
                <td style={{ ...cellPad, fontWeight: 700 }}>VARIATION SUB-TOTAL</td>
                <td style={numCell}>{formatMoneyCents(vrTotals.approved)}</td>
                <td style={numCell}>{formatMoneyCents(vrTotals.totalToDate)}</td>
                <td style={numCell}>{vrTotals.approved > 0 ? ((vrTotals.totalToDate / vrTotals.approved) * 100).toFixed(2) + '%' : '0%'}</td>
                <td style={numCell}>{formatMoneyCents(vrTotals.previous)}</td>
                <td style={numCell}>{formatMoneyCents(vrTotals.thisPayment)}</td>
                <td style={numCell}>{vrTotals.approved > 0 ? ((vrTotals.thisPayment / vrTotals.approved) * 100).toFixed(2) + '%' : '0%'}</td>
                <td style={numCell}>{formatMoneyCents(vrTotals.remaining)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Grand total footer */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'left' }}>Contract Item</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Approved Contract</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Total to Date</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>%</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Previous Total</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>This Payment</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>%</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: navy, color: '#fff', fontWeight: 700 }}>
              <td style={{ ...cellPad, color: '#e8d97a', fontWeight: 700 }}>TOTAL AMOUNT (exc. GST)</td>
              <td style={{ ...numCell, color: '#fff' }}>{formatMoneyCents(grand.approved)}</td>
              <td style={{ ...numCell, color: '#fff' }}>{formatMoneyCents(grand.totalToDate)}</td>
              <td style={{ ...numCell, color: '#fff' }}>{grand.pct.toFixed(2)}%</td>
              <td style={{ ...numCell, color: '#fff' }}>{formatMoneyCents(grand.previous)}</td>
              <td style={{ ...numCell, color: '#fff' }}>{formatMoneyCents(grand.thisPayment)}</td>
              <td style={{ ...numCell, color: '#fff' }}>{thisPmtPct.toFixed(1)}%</td>
              <td style={{ ...numCell, color: '#fff' }}>{formatMoneyCents(grand.remaining)}</td>
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
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}

// --- helpers ---

function aggregate(items) {
  const t = {
    approved: 0,
    totalToDate: 0,
    previous: 0,
    thisPayment: 0,
    remaining: 0,
  };
  for (const it of items) {
    const a = Number(it.approved_value) || 0;
    const p = Number(it.previous_total) || 0;
    const tp = Number(it.this_payment) || 0;
    t.approved += a;
    t.totalToDate += p + tp;
    t.previous += p;
    t.thisPayment += tp;
    t.remaining += a - p - tp;
  }
  return t;
}

function InfoRow({ label, value, highlight, gold: isGold }) {
  return (
    <tr>
      <td
        style={{
          padding: '6px 10px',
          fontWeight: 700,
          fontSize: 11,
          textTransform: 'uppercase',
          color: highlight ? navy : '#6b7280',
          background: isGold ? '#e8d97a' : highlight ? '#eef0f7' : 'transparent',
          borderBottom: `1px solid ${borderColor}`,
          width: '45%',
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: '6px 10px',
          fontSize: 12,
          borderBottom: `1px solid ${borderColor}`,
          background: isGold ? '#e8d97a' : 'transparent',
          fontWeight: isGold ? 700 : 400,
        }}
      >
        {value}
      </td>
    </tr>
  );
}
