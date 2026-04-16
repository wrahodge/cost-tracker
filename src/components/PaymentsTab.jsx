import React, { useState, useMemo } from 'react';
import { colors, btn, tableStyles, input, badge, badgeToneForStatus } from '../styles.js';
import { formatMoney, formatDate } from '../utils/format.js';
import {
  paymentRetention,
  paymentNetPayable,
  contractRevisedSum,
  contractApprovedVars,
} from '../utils/calc.js';
import Modal from './Modal.jsx';
import { Field } from './FormShared.jsx';
import DropdownMenu from './DropdownMenu.jsx';
import PaymentScheduleReport from './PaymentScheduleReport.jsx';

const STATUSES = ['Draft', 'Certified', 'Approved', 'Paid'];

// Build line item rows from contract milestones + approved variations.
// If existing savedItems are provided (from DB), merge them in.
function buildLineItems(contract, variations, savedItems) {
  if (!contract) return [];
  const milestones = (contract.contract_milestones || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const approvedVars = (variations || []).filter(
    (v) => v.contract_id === contract.id && v.status === 'Approved' && !v.date_rejected
  );

  const savedMap = {};
  if (savedItems) {
    for (const si of savedItems) {
      const key = si.contract_milestone_id || si.variation_id || si.id;
      savedMap[key] = si;
    }
  }

  const items = [];
  for (const m of milestones) {
    const saved = savedMap[m.id];
    const approved = Number(m.original_value) || 0;
    const prev = saved ? Number(saved.previous_total) || 0 : 0;
    const thisPmt = saved ? Number(saved.this_payment) || 0 : 0;
    const totalToDate = prev + thisPmt;
    items.push({
      type: 'milestone',
      contract_milestone_id: m.id,
      title: m.title,
      approved_value: approved,
      this_payment: thisPmt,
      previous_total: prev,
      percent_complete: saved ? Number(saved.percent_complete) || 0 : approved > 0 ? (totalToDate / approved) * 100 : 0,
      submitted_amount: saved?.submitted_amount ?? '',
      total_to_date: totalToDate,
      amount_remaining: approved - totalToDate,
    });
  }
  for (const v of approvedVars) {
    const saved = savedMap[v.id];
    const approved = Number(v.variation_amount) || 0;
    const prev = saved ? Number(saved.previous_total) || 0 : 0;
    const thisPmt = saved ? Number(saved.this_payment) || 0 : 0;
    const totalToDate = prev + thisPmt;
    items.push({
      type: 'variation',
      variation_id: v.id,
      title: `${v.reference || ''} — ${v.title}`.trim().replace(/^— /, ''),
      approved_value: approved,
      this_payment: thisPmt,
      previous_total: prev,
      percent_complete: saved ? Number(saved.percent_complete) || 0 : approved > 0 ? (totalToDate / approved) * 100 : 0,
      submitted_amount: saved?.submitted_amount ?? '',
      total_to_date: totalToDate,
      amount_remaining: approved - totalToDate,
    });
  }
  return items;
}

function emptyPayment(defaults = {}) {
  return {
    contract_id: '',
    title: '',
    reference: '',
    status: 'Draft',
    month: '',
    month_paid: '',
    date: new Date().toISOString().slice(0, 10),
    date_received: '',
    date_payment_due: '',
    date_approved: '',
    payment_reference: '',
    invoice: '',
    claim_amount: 0,
    certified_amount: 0,
    submitted_amount: '',
    retention_amount: 0,
    period_from: '',
    period_to: '',
    notes: '',
    ...defaults,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PaymentsTab({ project, contracts, variations, payments, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [groupBy, setGroupBy] = useState('contract');
  const [expanded, setExpanded] = useState({});
  const [reportPayment, setReportPayment] = useState(null);

  const contractFor = (id) => contracts.find((c) => c.id === id);

  // --- expand / collapse (ContractsTab pattern) ---
  const toggleExpand = (key) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const groups = useMemo(() => {
    if (groupBy === 'contract') {
      return contracts
        .map((c) => {
          const gp = payments.filter((p) => p.contract_id === c.id);
          if (gp.length === 0) return null;
          return {
            key: c.id,
            label: c.title,
            contract: c,
            payments: gp,
            count: gp.length,
            paymentAmountSum: gp.reduce((s, p) => s + (Number(p.claim_amount) || 0), 0),
            submittedSum: gp.reduce((s, p) => s + (Number(p.submitted_amount) || 0), 0),
            approvedContract: contractRevisedSum(c, variations),
            variationValue: contractApprovedVars(c, variations),
          };
        })
        .filter(Boolean);
    }
    // group by status
    return STATUSES.map((status) => {
      const gp = payments.filter((p) => p.status === status);
      if (gp.length === 0) return null;
      return {
        key: status,
        label: status,
        contract: null,
        payments: gp,
        count: gp.length,
        paymentAmountSum: gp.reduce((s, p) => s + (Number(p.claim_amount) || 0), 0),
        submittedSum: gp.reduce((s, p) => s + (Number(p.submitted_amount) || 0), 0),
        approvedContract: null,
        variationValue: null,
      };
    }).filter(Boolean);
  }, [contracts, variations, payments, groupBy]);

  const expandAll = () => {
    const all = {};
    groups.forEach((g) => { all[g.key] = true; });
    setExpanded(all);
  };
  const collapseAll = () => setExpanded({});
  const anyExpanded = Object.values(expanded).some(Boolean);

  // --- CRUD helpers ---
  const openNew = () =>
    setEditing({
      mode: 'new',
      data: emptyPayment({ contract_id: contracts[0]?.id || '' }),
    });

  const openEdit = (p) =>
    setEditing({
      mode: 'edit',
      data: {
        id: p.id,
        contract_id: p.contract_id,
        title: p.title || '',
        reference: p.reference || '',
        status: p.status || 'Draft',
        month: p.month || '',
        month_paid: p.month_paid || '',
        date: p.date || '',
        date_received: p.date_received || '',
        date_payment_due: p.date_payment_due || '',
        date_approved: p.date_approved || '',
        payment_reference: p.payment_reference || '',
        invoice: p.invoice || '',
        claim_amount: p.claim_amount ?? 0,
        certified_amount: p.certified_amount ?? 0,
        submitted_amount: p.submitted_amount ?? '',
        retention_amount: p.retention_amount ?? 0,
        period_from: p.period_from || '',
        period_to: p.period_to || '',
        notes: p.notes || '',
      },
    });

  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({
      ...d,
      claim_amount: Number(d.claim_amount) || 0,
      certified_amount: Number(d.certified_amount) || 0,
      submitted_amount: d.submitted_amount === '' ? null : Number(d.submitted_amount) || 0,
      retention_amount: Number(d.retention_amount) || 0,
    });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  // --- CSV export ---
  const exportCSV = () => {
    const header = ['Title', 'Contract', 'Month', 'Month Paid', 'Payment Amount', 'Submitted Amount', 'Certified Amount', 'Status'];
    const rows = payments.map((p) => {
      const c = contractFor(p.contract_id);
      return [
        p.title || p.reference || '',
        c?.title || '',
        p.month || '',
        p.month_paid || '',
        (Number(p.claim_amount) || 0).toFixed(2),
        (Number(p.submitted_amount) || 0).toFixed(2),
        (Number(p.certified_amount) || 0).toFixed(2),
        p.status,
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btn.primary} onClick={openNew}>
            + Add Payment
          </button>
          <button style={btn.secondary} onClick={exportCSV}>
            ↓ Export
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, letterSpacing: 0.3, marginBottom: 2 }}>
              Group By
            </div>
            <select
              style={{ ...input, width: 150, padding: '7px 10px' }}
              value={groupBy}
              onChange={(e) => { setGroupBy(e.target.value); setExpanded({}); }}
            >
              <option value="contract">Contract</option>
              <option value="status">Status</option>
            </select>
          </div>
          <button
            style={{ ...btn.secondary, fontSize: 13, padding: '7px 12px' }}
            onClick={anyExpanded ? collapseAll : expandAll}
          >
            {anyExpanded ? '↕ Collapse All' : '↕ Expand All'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={{ ...tableStyles.th, width: 36 }}></th>
              <th style={tableStyles.th}>
                Payments by {groupBy === 'contract' ? 'Contract' : 'Status'}
              </th>
              <th style={tableStyles.th}>Month</th>
              <th style={tableStyles.th}>Month Paid</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Payment Amount</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Submitted Amount</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Approved Contract</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Variations</th>
              <th style={tableStyles.th}>Status</th>
              <th style={{ ...tableStyles.th, width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const isExpanded = expanded[g.key];
              return (
                <React.Fragment key={g.key}>
                  {/* Group header row */}
                  <tr
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleExpand(g.key)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tableStyles.td, width: 36 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 10,
                          color: colors.textMuted,
                          transition: 'transform 0.15s',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▶
                      </span>
                    </td>
                    <td style={{ ...tableStyles.td, fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {groupBy === 'contract' ? (
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: '#2563eb',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            C
                          </span>
                        ) : (
                          <span style={badge(badgeToneForStatus(g.label))}>{g.label}</span>
                        )}
                        <span>
                          {groupBy === 'contract' ? g.label : ''}{' '}
                          <span style={{ fontWeight: 400, color: colors.textMuted }}>({g.count})</span>
                        </span>
                      </div>
                    </td>
                    <td style={tableStyles.td}></td>
                    <td style={tableStyles.td}></td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>
                      {formatMoney(g.paymentAmountSum)}
                    </td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>
                      {formatMoney(g.submittedSum)}
                    </td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>
                      {g.approvedContract != null ? formatMoney(g.approvedContract) : ''}
                    </td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>
                      {g.variationValue != null ? formatMoney(g.variationValue) : ''}
                    </td>
                    <td style={tableStyles.td}></td>
                    <td style={{ ...tableStyles.td, width: 44 }}></td>
                  </tr>

                  {/* Expanded child rows */}
                  {isExpanded &&
                    g.payments.map((p) => {
                      const contract = contractFor(p.contract_id);
                      return (
                        <tr
                          key={p.id}
                          style={{ background: '#f9fafb', cursor: 'pointer' }}
                          onClick={() => openEdit(p)}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f1f3')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#f9fafb')}
                        >
                          <td style={tableStyles.td}></td>
                          <td style={{ ...tableStyles.td, paddingLeft: 56, fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: p.status === 'Paid' ? colors.positive : '#6b7280',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                P
                              </span>
                              {p.title || p.reference || `Payment #${p.contract_payment_no || ''}`}
                            </div>
                          </td>
                          <td style={{ ...tableStyles.td, fontSize: 13 }}>{p.month || '—'}</td>
                          <td style={{ ...tableStyles.td, fontSize: 13 }}>{p.month_paid || '—'}</td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontSize: 13 }}>
                            {formatMoney(p.claim_amount)}
                          </td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontSize: 13 }}>
                            {formatMoney(p.submitted_amount)}
                          </td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontSize: 13 }}>
                            {contract ? formatMoney(contractRevisedSum(contract, variations)) : '—'}
                          </td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontSize: 13 }}>
                            {contract ? formatMoney(contractApprovedVars(contract, variations)) : '—'}
                          </td>
                          <td style={{ ...tableStyles.td, fontSize: 13 }}>
                            <span style={badge(badgeToneForStatus(p.status))}>{p.status}</span>
                          </td>
                          <td style={{ ...tableStyles.td, width: 44, textAlign: 'right' }}>
                            <DropdownMenu
                              items={[
                                { icon: '✎', label: 'Edit Payment', onClick: () => openEdit(p) },
                                { icon: '🖨', label: 'Print Schedule', onClick: () => setReportPayment(p) },
                                {
                                  icon: '🗑',
                                  label: 'Delete Payment',
                                  danger: true,
                                  onClick: () => {
                                    if (window.confirm(`Delete payment "${p.title || p.reference}"?`))
                                      onDelete(p.id);
                                  },
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'right', fontSize: 13, color: colors.textMuted, marginTop: 8, paddingRight: 4 }}>
        Total Rows: {payments.length}
      </div>

      {/* Modal */}
      {editing && (
        <Modal
          title={editing.mode === 'new' ? 'Add Payment' : 'Edit Payment'}
          onClose={close}
          onSubmit={save}
          submitLabel={editing.mode === 'new' ? 'Add' : 'Save'}
          wide
        >
          <PaymentForm
            data={editing.data}
            contracts={contracts}
            variations={variations}
            onField={onField}
          />
        </Modal>
      )}

      {/* Payment Schedule Report overlay */}
      {reportPayment && (() => {
        const rc = contractFor(reportPayment.contract_id);
        const lineItems = buildLineItems(rc, variations, null);
        const milestoneItems = lineItems.filter((it) => it.type === 'milestone');
        const variationItemsList = lineItems.filter((it) => it.type === 'variation');
        return (
          <PaymentScheduleReport
            payment={reportPayment}
            contract={rc}
            variations={variations}
            lineItems={milestoneItems}
            variationItems={variationItemsList}
            project={project}
            onClose={() => setReportPayment(null)}
          />
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment form (inside modal)
// ---------------------------------------------------------------------------

function PaymentForm({ data, contracts, variations, onField }) {
  const contract = contracts.find((c) => c.id === data.contract_id);
  const retention = paymentRetention(data, contract);
  const net = paymentNetPayable(data, contract);
  const [lineItems, setLineItems] = useState(() => buildLineItems(contract, variations, data.lineItems));
  const [lineItemsExpanded, setLineItemsExpanded] = useState({ contract: true, variations: false });
  const [showLineItems, setShowLineItems] = useState(!!data.id);

  // Rebuild line items when contract changes
  const prevContractRef = React.useRef(data.contract_id);
  React.useEffect(() => {
    if (data.contract_id !== prevContractRef.current) {
      prevContractRef.current = data.contract_id;
      const c = contracts.find((ct) => ct.id === data.contract_id);
      setLineItems(buildLineItems(c, variations, null));
    }
  }, [data.contract_id, contracts, variations]);

  // Sync line items back to parent form data
  React.useEffect(() => {
    onField('lineItems', lineItems);
  }, [lineItems]);

  const autoRetention = () => {
    const pct = contract ? Number(contract.retention_pct) || 0 : 0;
    onField('retention_amount', (Number(data.certified_amount) || 0) * pct);
  };

  const onLineItem = (idx, field, value) =>
    setLineItems((items) =>
      items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [field]: value };
        // Auto-calc remaining
        const approved = Number(updated.approved_value) || 0;
        const prev = Number(updated.previous_total) || 0;
        const thisPmt = Number(updated.this_payment) || 0;
        updated.total_to_date = prev + thisPmt;
        updated.amount_remaining = approved - prev - thisPmt;
        if (approved > 0) {
          updated.percent_complete = ((prev + thisPmt) / approved) * 100;
        }
        return updated;
      })
    );

  const onVarItem = (idx, field, value) =>
    setLineItems((items) => {
      // Variation items are after milestone items
      const milestoneCount = items.filter((it) => it.type === 'milestone').length;
      const varIdx = milestoneCount + idx;
      return items.map((it, i) => {
        if (i !== varIdx) return it;
        const updated = { ...it, [field]: value };
        const approved = Number(updated.approved_value) || 0;
        const prev = Number(updated.previous_total) || 0;
        const thisPmt = Number(updated.this_payment) || 0;
        updated.total_to_date = prev + thisPmt;
        updated.amount_remaining = approved - prev - thisPmt;
        if (approved > 0) {
          updated.percent_complete = ((prev + thisPmt) / approved) * 100;
        }
        return updated;
      });
    });

  const milestoneItems = lineItems.filter((it) => it.type === 'milestone');
  const variationItems = lineItems.filter((it) => it.type === 'variation');

  const msTotals = {
    approved: milestoneItems.reduce((s, it) => s + (Number(it.approved_value) || 0), 0),
    totalToDate: milestoneItems.reduce((s, it) => s + (Number(it.total_to_date) || 0), 0),
    previous: milestoneItems.reduce((s, it) => s + (Number(it.previous_total) || 0), 0),
    remaining: milestoneItems.reduce((s, it) => s + (Number(it.amount_remaining) || 0), 0),
    thisPayment: milestoneItems.reduce((s, it) => s + (Number(it.this_payment) || 0), 0),
    submitted: milestoneItems.reduce((s, it) => s + (Number(it.submitted_amount) || 0), 0),
  };
  if (msTotals.approved > 0) msTotals.pctComplete = (msTotals.totalToDate / msTotals.approved) * 100;
  else msTotals.pctComplete = 0;

  const varTotals = {
    approved: variationItems.reduce((s, it) => s + (Number(it.approved_value) || 0), 0),
    totalToDate: variationItems.reduce((s, it) => s + (Number(it.total_to_date) || 0), 0),
    previous: variationItems.reduce((s, it) => s + (Number(it.previous_total) || 0), 0),
    remaining: variationItems.reduce((s, it) => s + (Number(it.amount_remaining) || 0), 0),
    thisPayment: variationItems.reduce((s, it) => s + (Number(it.this_payment) || 0), 0),
    submitted: variationItems.reduce((s, it) => s + (Number(it.submitted_amount) || 0), 0),
  };
  if (varTotals.approved > 0) varTotals.pctComplete = (varTotals.totalToDate / varTotals.approved) * 100;
  else varTotals.pctComplete = 0;

  return (
    <div style={{ display: 'grid', gap: 0 }}>
      {/* Row 1 — Title, Status, Month */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
        <Field label="Title *">
          <input
            style={input}
            value={data.title}
            onChange={(e) => onField('title', e.target.value)}
            placeholder="e.g. PC-01 — Main Works"
            required
          />
        </Field>
        <Field label="Status">
          <select style={input} value={data.status} onChange={(e) => onField('status', e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Month">
          <input
            style={input}
            value={data.month}
            onChange={(e) => onField('month', e.target.value)}
            placeholder="e.g. April 2026"
          />
        </Field>
      </div>

      {/* Row 2 — Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
        <Field label="Date Received">
          <input style={input} type="date" value={data.date_received || ''} onChange={(e) => onField('date_received', e.target.value)} />
        </Field>
        <Field label="Date Payment Due">
          <input style={input} type="date" value={data.date_payment_due || ''} onChange={(e) => onField('date_payment_due', e.target.value)} />
        </Field>
        <Field label="Date Approved">
          <input style={input} type="date" value={data.date_approved || ''} onChange={(e) => onField('date_approved', e.target.value)} />
        </Field>
        <Field label="Month Paid">
          <input
            style={input}
            value={data.month_paid}
            onChange={(e) => onField('month_paid', e.target.value)}
            placeholder="e.g. Feb 2026"
          />
        </Field>
      </div>

      {/* Row 3 — References */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
        <Field label="Payment Reference">
          <input style={input} value={data.payment_reference} onChange={(e) => onField('payment_reference', e.target.value)} />
        </Field>
        <Field label="Invoice No.">
          <input style={input} value={data.invoice} onChange={(e) => onField('invoice', e.target.value)} />
        </Field>
        <Field label="Claim No.">
          <input style={input} value={data.reference} onChange={(e) => onField('reference', e.target.value)} placeholder="e.g. PC-01" />
        </Field>
      </div>

      {/* Row 4 — Contract */}
      <div style={{ marginBottom: 18 }}>
        <Field label="Contract">
          <select
            style={input}
            value={data.contract_id}
            onChange={(e) => onField('contract_id', e.target.value)}
            required
          >
            <option value="">— Select contract —</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.reference ? `${c.reference} — ` : ''}{c.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Row 5 — Financial */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
        <Field label="Claim Amount (AUD)">
          <input
            style={input}
            type="number"
            min="0"
            step="100"
            value={data.claim_amount}
            onChange={(e) => onField('claim_amount', e.target.value)}
            required
          />
        </Field>
        <Field label="Certified Amount (AUD)">
          <input
            style={input}
            type="number"
            min="0"
            step="100"
            value={data.certified_amount}
            onChange={(e) => onField('certified_amount', e.target.value)}
            required
          />
        </Field>
        <Field label="Submitted Amount (AUD)">
          <input
            style={input}
            type="number"
            min="0"
            step="100"
            value={data.submitted_amount}
            onChange={(e) => onField('submitted_amount', e.target.value)}
          />
        </Field>
      </div>

      {/* Line Items section */}
      {contract && (
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16, marginBottom: 18 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, cursor: 'pointer' }}
            onClick={() => setShowLineItems((v) => !v)}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Line Items
            </div>
            <span style={{ fontSize: 12, color: colors.textMuted }}>
              {showLineItems ? 'Hide' : 'Show'}
            </span>
          </div>

          {showLineItems && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...tableStyles.table, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ ...tableStyles.th, fontSize: 11, padding: '8px 10px' }}>Contract Item</th>
                    <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px' }}>Contract Total</th>
                    <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px' }}>Total to Date</th>
                    <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px', width: 80 }}>% Complete</th>
                    <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px' }}>Previous</th>
                    <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px' }}>Remaining</th>
                    <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px' }}>Submitted</th>
                    <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px' }}>This Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Contract group header */}
                  <tr
                    style={{ background: '#f5f6f8', cursor: 'pointer' }}
                    onClick={() => setLineItemsExpanded((e) => ({ ...e, contract: !e.contract }))}
                  >
                    <td style={{ ...tableStyles.td, padding: '8px 10px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, color: colors.textMuted, transition: 'transform 0.15s', transform: lineItemsExpanded.contract ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>C</span>
                        {contract.title}
                      </div>
                    </td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(msTotals.approved)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(msTotals.totalToDate)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{msTotals.pctComplete.toFixed(1)}%</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(msTotals.previous)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(msTotals.remaining)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(msTotals.submitted)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(msTotals.thisPayment)}</td>
                  </tr>

                  {/* Milestone rows */}
                  {lineItemsExpanded.contract && milestoneItems.map((it, idx) => (
                    <tr key={it.id || idx} style={{ background: '#fafbfc' }}>
                      <td style={{ ...tableStyles.td, padding: '6px 10px', paddingLeft: 48, fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563eb', flexShrink: 0 }} />
                          {it.title}
                        </div>
                      </td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 10px', fontSize: 12 }}>{formatMoney(it.approved_value)}</td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 10px', fontSize: 12 }}>{formatMoney(it.total_to_date)}</td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 4px' }}>
                        <input
                          style={{ ...input, padding: '4px 6px', fontSize: 11, textAlign: 'right', width: 60 }}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={Number(it.percent_complete || 0).toFixed(2)}
                          onChange={(e) => {
                            const pct = Number(e.target.value) || 0;
                            const approved = Number(it.approved_value) || 0;
                            const prev = Number(it.previous_total) || 0;
                            const totalToDate = (pct / 100) * approved;
                            const thisPmt = totalToDate - prev;
                            onLineItem(idx, 'percent_complete', pct);
                            // Also update this_payment based on % change
                            setLineItems((items) =>
                              items.map((item, i) =>
                                i === idx
                                  ? { ...item, percent_complete: pct, this_payment: Math.max(0, thisPmt), total_to_date: totalToDate, amount_remaining: approved - totalToDate }
                                  : item
                              )
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 10px', fontSize: 12 }}>{formatMoney(it.previous_total)}</td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 10px', fontSize: 12 }}>{formatMoney(it.amount_remaining)}</td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 4px' }}>
                        <input
                          style={{ ...input, padding: '4px 6px', fontSize: 11, textAlign: 'right', width: 80 }}
                          type="number"
                          min="0"
                          step="100"
                          value={it.submitted_amount ?? ''}
                          onChange={(e) => onLineItem(idx, 'submitted_amount', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 4px' }}>
                        <input
                          style={{ ...input, padding: '4px 6px', fontSize: 11, textAlign: 'right', width: 80 }}
                          type="number"
                          min="0"
                          step="100"
                          value={it.this_payment}
                          onChange={(e) => onLineItem(idx, 'this_payment', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    </tr>
                  ))}

                  {/* Variations group header */}
                  {variationItems.length > 0 && (
                    <>
                      <tr
                        style={{ background: '#f5f6f8', cursor: 'pointer' }}
                        onClick={() => setLineItemsExpanded((e) => ({ ...e, variations: !e.variations }))}
                      >
                        <td style={{ ...tableStyles.td, padding: '8px 10px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 9, color: colors.textMuted, transition: 'transform 0.15s', transform: lineItemsExpanded.variations ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                            <span style={{ fontSize: 13, color: colors.textMuted }}>⚡</span>
                            Variations
                          </div>
                        </td>
                        <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(varTotals.approved)}</td>
                        <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(varTotals.totalToDate)}</td>
                        <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{varTotals.pctComplete.toFixed(1)}%</td>
                        <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(varTotals.previous)}</td>
                        <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(varTotals.remaining)}</td>
                        <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(varTotals.submitted)}</td>
                        <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>{formatMoney(varTotals.thisPayment)}</td>
                      </tr>

                      {lineItemsExpanded.variations && variationItems.map((it, idx) => (
                        <tr key={it.id || idx} style={{ background: '#fafbfc' }}>
                          <td style={{ ...tableStyles.td, padding: '6px 10px', paddingLeft: 48, fontSize: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#e7edf7', color: '#2b4b8c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>V</span>
                              {it.title}
                            </div>
                          </td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 10px', fontSize: 12 }}>{formatMoney(it.approved_value)}</td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 10px', fontSize: 12 }}>{formatMoney(it.total_to_date)}</td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 4px' }}>
                            <input
                              style={{ ...input, padding: '4px 6px', fontSize: 11, textAlign: 'right', width: 60 }}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={Number(it.percent_complete || 0).toFixed(2)}
                              onChange={(e) => {
                                const pct = Number(e.target.value) || 0;
                                const approved = Number(it.approved_value) || 0;
                                const prev = Number(it.previous_total) || 0;
                                const totalToDate = (pct / 100) * approved;
                                const thisPmt = totalToDate - prev;
                                setLineItems((items) => {
                                  const milestoneCount = items.filter((x) => x.type === 'milestone').length;
                                  const varIdx = milestoneCount + idx;
                                  return items.map((item, i) =>
                                    i === varIdx
                                      ? { ...item, percent_complete: pct, this_payment: Math.max(0, thisPmt), total_to_date: totalToDate, amount_remaining: approved - totalToDate }
                                      : item
                                  );
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 10px', fontSize: 12 }}>{formatMoney(it.previous_total)}</td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 10px', fontSize: 12 }}>{formatMoney(it.amount_remaining)}</td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 4px' }}>
                            <input
                              style={{ ...input, padding: '4px 6px', fontSize: 11, textAlign: 'right', width: 80 }}
                              type="number"
                              min="0"
                              step="100"
                              value={it.submitted_amount ?? ''}
                              onChange={(e) => onVarItem(idx, 'submitted_amount', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '6px 4px' }}>
                            <input
                              style={{ ...input, padding: '4px 6px', fontSize: 11, textAlign: 'right', width: 80 }}
                              type="number"
                              min="0"
                              step="100"
                              value={it.this_payment}
                              onChange={(e) => onVarItem(idx, 'this_payment', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Retention section */}
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Retention
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Retention (AUD)">
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...input, flex: 1 }}
                type="number"
                min="0"
                step="100"
                value={data.retention_amount}
                onChange={(e) => onField('retention_amount', e.target.value)}
              />
              <button
                type="button"
                onClick={autoRetention}
                style={{
                  ...btn.secondary,
                  padding: '0 10px',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
                title={`Auto-fill using contract retention ${
                  contract ? ((Number(contract.retention_pct) || 0) * 100).toFixed(1) : 0
                }%`}
              >
                Auto
              </button>
            </div>
          </Field>
          <Field label="Period From">
            <input style={input} type="date" value={data.period_from || ''} onChange={(e) => onField('period_from', e.target.value)} />
          </Field>
          <Field label="Period To">
            <input style={input} type="date" value={data.period_to || ''} onChange={(e) => onField('period_to', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Notes */}
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
        <Field label="Notes">
          <textarea
            style={{ ...input, minHeight: 70, resize: 'vertical' }}
            value={data.notes}
            onChange={(e) => onField('notes', e.target.value)}
            placeholder="Internal notes…"
          />
        </Field>
      </div>

      {/* Computed summary */}
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 12,
          marginTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          color: colors.textMuted,
        }}
      >
        <div>
          Retention:{' '}
          <strong style={{ color: colors.text }}>{formatMoney(retention)}</strong>
        </div>
        <div>
          Net payable:{' '}
          <strong style={{ color: colors.text }}>{formatMoney(net)}</strong>
        </div>
      </div>
    </div>
  );
}
