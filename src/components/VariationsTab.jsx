import React, { useState } from 'react';
import { colors, btn, tableStyles, input, badge, badgeToneForStatus } from '../styles.js';
import { formatMoney } from '../utils/format.js';
import Modal from './Modal.jsx';
import { Field } from './FormShared.jsx';
import DropdownMenu from './DropdownMenu.jsx';
import VariationOrderReport from './VariationOrderReport.jsx';

const STATUSES = ['Forecast', 'Pending', 'In Principle', 'Approved'];
const CATEGORIES = ['', 'Scope Change', 'Latent Conditions'];

function emptyVariation(defaults = {}) {
  return {
    contract_id: '',
    budget_line_id: '',
    reference: '',
    title: '',
    description: '',
    status: 'Forecast',
    category: '',
    contract_variation_no: 1,
    variation_no: '',
    vo_no: '',
    vpr_no: '',
    clause: '',
    date_received: new Date().toISOString().slice(0, 10),
    date_approved: '',
    date_rejected: null,
    requested_amount: '',
    variation_amount: 0,
    tax_percent: 10,
    approved_by: '',
    days_claimed: '',
    days_approved: '',
    notes: '',
    ...defaults,
  };
}

export default function VariationsTab({ project, contracts, budgetLines, variations, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [reportVariation, setReportVariation] = useState(null);

  const contractFor = (id) => contracts.find((c) => c.id === id);

  const toggleExpand = (id) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const expandAll = () => {
    const all = {};
    variations.forEach((v) => { all[v.id] = true; });
    setExpanded(all);
  };
  const collapseAll = () => setExpanded({});
  const anyExpanded = Object.values(expanded).some(Boolean);

  const openNew = () => {
    const firstContract = contracts[0];
    const firstMilestone = firstContract?.contract_milestones?.[0];
    setEditing({
      mode: 'new',
      data: emptyVariation({
        contract_id: firstContract?.id || '',
        budget_line_id: firstMilestone?.budget_line_id || '',
      }),
    });
  };

  const openEdit = (v) =>
    setEditing({
      mode: 'edit',
      data: {
        id: v.id,
        contract_id: v.contract_id,
        budget_line_id: v.budget_line_id || '',
        reference: v.reference || '',
        title: v.title || '',
        description: v.description || '',
        status: v.status || 'Pending',
        category: v.category || '',
        contract_variation_no: v.contract_variation_no ?? '',
        variation_no: v.variation_no || '',
        vo_no: v.vo_no || '',
        vpr_no: v.vpr_no || '',
        clause: v.clause || '',
        date_received: v.date_received || '',
        date_approved: v.date_approved || '',
        date_rejected: v.date_rejected || null,
        requested_amount: v.requested_amount ?? '',
        variation_amount: v.variation_amount ?? 0,
        tax_percent: v.tax_percent ?? 10,
        approved_by: v.approved_by || '',
        days_claimed: v.days_claimed ?? '',
        days_approved: v.days_approved ?? '',
        notes: v.notes || '',
      },
    });

  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({
      ...d,
      variation_amount: Number(d.variation_amount) || 0,
      requested_amount: d.requested_amount === '' ? null : Number(d.requested_amount) || 0,
    });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  const exportCSV = () => {
    const header = ['Title', 'Contract', 'Contract Var No.', 'Vendor', 'Variation No.', 'VO No.', 'Status', 'Category', 'Variation Amount'];
    const rows = variations.map((v) => {
      const c = contractFor(v.contract_id);
      return [
        v.title || '',
        c?.title || '',
        v.contract_variation_no ?? '',
        c?.vendor || '',
        v.variation_no || '',
        v.vo_no || '',
        v.date_rejected ? 'Rejected' : v.status,
        v.category || '',
        (Number(v.variation_amount) || 0).toFixed(2),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((val) => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const budgetLineLabel = (id) => {
    if (!budgetLines) return '—';
    const b = budgetLines.find((x) => x.id === id);
    return b ? (b.code ? `${b.code} — ${b.title}` : b.title) : '—';
  };

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...btn.primary, background: '#2563eb' }} onClick={openNew}>
            + Add Variation
          </button>
          <button style={btn.secondary} onClick={exportCSV}>
            ↓ Export
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ ...btn.secondary, fontSize: 13, padding: '7px 14px' }}
            onClick={anyExpanded ? collapseAll : expandAll}
          >
            ↕ {anyExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              {/* Chevron col */}
              <th style={{ ...tableStyles.th, width: 32, padding: '14px 8px' }}></th>
              {/* Title (includes V badge + ... menu + title text) */}
              <th style={{ ...tableStyles.th, minWidth: 240 }}>Title</th>
              <th style={tableStyles.th}>Contract</th>
              <th style={{ ...tableStyles.th, width: 60 }}>Contr...</th>
              <th style={tableStyles.th}>Vendor</th>
              <th style={{ ...tableStyles.th, width: 100 }}>Variation No.</th>
              <th style={{ ...tableStyles.th, width: 70 }}>VO No.</th>
              <th style={{ ...tableStyles.th, width: 100 }}>Status</th>
              <th style={tableStyles.th}>Category</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Variation Am...</th>
              {/* Attachment count col */}
              <th style={{ ...tableStyles.th, width: 40, textAlign: 'center' }}>
                <span style={{ fontSize: 13 }}>🔗</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {variations.map((v) => {
              const rejected = !!v.date_rejected;
              const isExpanded = expanded[v.id];
              const contract = contractFor(v.contract_id);
              return (
                <React.Fragment key={v.id}>
                  <tr
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Chevron */}
                    <td
                      style={{ ...tableStyles.td, width: 32, padding: '14px 8px', cursor: 'pointer' }}
                      onClick={() => toggleExpand(v.id)}
                    >
                      <span style={{
                        display: 'inline-block',
                        fontSize: 9,
                        color: colors.textMuted,
                        transition: 'transform 0.15s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}>▶</span>
                    </td>

                    {/* Title — V badge, ... menu, title text (all inline) */}
                    <td style={{ ...tableStyles.td, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#7c3aed',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>V</span>
                        <DropdownMenu
                          items={[
                            { icon: '✏️', label: 'Edit Variation', accent: true, onClick: () => openEdit(v) },
                            { icon: '⬇', label: 'Variation Approval PDF', onClick: () => {} },
                            { icon: '⬇', label: 'Variation Order PDF', onClick: () => setReportVariation(v) },
                            { icon: '⬇', label: 'Variation Recommendation PDF', onClick: () => {} },
                            {
                              icon: '🗑️',
                              label: 'Delete Variation',
                              danger: true,
                              onClick: () => {
                                if (window.confirm(`Delete variation "${v.reference || v.title}"?`))
                                  onDelete(v.id);
                              },
                            },
                            { icon: 'ℹ️', label: 'Audit Log', onClick: () => {} },
                          ]}
                        />
                        <span
                          style={{
                            cursor: 'pointer',
                            textDecoration: rejected ? 'line-through' : 'none',
                            color: rejected ? colors.textMuted : colors.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          onClick={() => openEdit(v)}
                        >
                          {v.title}
                        </span>
                      </div>
                    </td>

                    {/* Contract */}
                    <td style={{ ...tableStyles.td, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                      {contract?.title || '—'}
                    </td>

                    {/* Contract Variation No. */}
                    <td style={{ ...tableStyles.td, textAlign: 'center', width: 60 }}>
                      {v.contract_variation_no ?? ''}
                    </td>

                    {/* Vendor */}
                    <td style={{ ...tableStyles.td, fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                      {contract?.vendor || contract?.title || '—'}
                    </td>

                    {/* Variation No. */}
                    <td style={{ ...tableStyles.td, width: 100 }}>{v.variation_no || ''}</td>

                    {/* VO No. */}
                    <td style={{ ...tableStyles.td, width: 70 }}>{v.vo_no || ''}</td>

                    {/* Status */}
                    <td style={{ ...tableStyles.td, width: 100 }}>
                      {rejected ? (
                        <span style={badge('negative')}>Rejected</span>
                      ) : (
                        <span style={badge(badgeToneForStatus(v.status))}>{v.status}</span>
                      )}
                    </td>

                    {/* Category */}
                    <td style={{ ...tableStyles.td, fontSize: 13, color: colors.textMuted }}>
                      {v.category || ''}
                    </td>

                    {/* Variation Amount */}
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>
                      {formatMoney(v.variation_amount)}
                    </td>

                    {/* Attachment count */}
                    <td style={{ ...tableStyles.td, width: 40, textAlign: 'center', fontSize: 12, color: colors.textMuted }}>
                      0
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr style={{ background: '#f9fafb' }}>
                      <td style={{ ...tableStyles.td, padding: '14px 8px' }} />
                      <td colSpan={10} style={{ ...tableStyles.td, paddingLeft: 48 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, fontSize: 12, padding: '4px 0' }}>
                          <DetailCell label="Reference" value={v.reference || '—'} />
                          <DetailCell label="Date Received" value={v.date_received || '—'} />
                          <DetailCell label="Date Approved" value={v.date_approved || '—'} />
                          <DetailCell label="Requested Amount" value={v.requested_amount != null ? formatMoney(v.requested_amount) : '—'} />
                          <DetailCell label="Budget" value={budgetLineLabel(v.budget_line_id)} />
                          <DetailCell label="Tax %" value={v.tax_percent != null ? `${v.tax_percent}%` : '10%'} />
                          <DetailCell label="Days Claimed" value={v.days_claimed ?? '—'} />
                          <DetailCell label="Days Approved" value={v.days_approved ?? '—'} />
                          {v.description && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <DetailCell label="Description" value={v.description} />
                            </div>
                          )}
                          {v.notes && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <DetailCell label="Notes" value={v.notes} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'right', fontSize: 13, color: colors.textMuted, marginTop: 8, paddingRight: 4 }}>
        Total Rows: {variations.length}
      </div>

      {/* ── Modal ── */}
      {editing && (
        <Modal
          title={editing.mode === 'new' ? 'Add Variation' : 'Edit Variation'}
          onClose={close}
          onSubmit={save}
          submitLabel={editing.mode === 'new' ? 'Add' : 'Save'}
          wide
        >
          <VariationForm
            data={editing.data}
            contracts={contracts}
            budgetLines={budgetLines || []}
            onField={onField}
          />
        </Modal>
      )}

      {/* ── Variation Order Report overlay ── */}
      {reportVariation && (
        <VariationOrderReport
          variation={reportVariation}
          contract={contractFor(reportVariation.contract_id)}
          variations={variations}
          project={project}
          onClose={() => setReportVariation(null)}
        />
      )}
    </div>
  );
}

function DetailCell({ label, value }) {
  return (
    <div>
      <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ color: colors.text }}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variation form (inside modal) — matches Mastt's Add Variation layout
// ---------------------------------------------------------------------------

function VariationForm({ data, contracts, budgetLines, onField }) {
  const [activeTab, setActiveTab] = useState('lineItems');

  const onContractChange = (id) => {
    onField('contract_id', id);
    const c = contracts.find((x) => x.id === id);
    const firstBudgetLine = c?.contract_milestones?.[0]?.budget_line_id || '';
    onField('budget_line_id', firstBudgetLine);
  };

  const rejected = !!data.date_rejected;

  const tabStyle = (tab) => ({
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    color: activeTab === tab ? '#2563eb' : colors.textMuted,
    borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
  });

  const smallTh = {
    ...tableStyles.th,
    fontSize: 11,
    padding: '8px 10px',
    fontWeight: 600,
  };

  const smallTd = {
    ...tableStyles.td,
    padding: '6px 10px',
    fontSize: 12,
  };

  const smallInput = {
    ...input,
    padding: '5px 8px',
    fontSize: 12,
  };

  return (
    <div>
      {/* Row 1 — Title, Varying Contract, Variation Category, Contract Variation Number */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Title">
          <input
            style={input}
            value={data.title}
            onChange={(e) => onField('title', e.target.value)}
            placeholder=""
            required
          />
        </Field>
        <Field label="Varying Contract">
          <select
            style={input}
            value={data.contract_id}
            onChange={(e) => onContractChange(e.target.value)}
            required
          >
            <option value="">— Select —</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.reference ? `${c.reference} — ` : ''}{c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Variation Category">
          <select
            style={input}
            value={data.category}
            onChange={(e) => onField('category', e.target.value)}
          >
            <option value="">—</option>
            {CATEGORIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Contract Variation Number">
          <input
            style={input}
            type="number"
            min="1"
            value={data.contract_variation_no}
            onChange={(e) => onField('contract_variation_no', e.target.value)}
          />
        </Field>
      </div>

      {/* Row 2 — Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Status">
          <select style={input} value={data.status} onChange={(e) => onField('status', e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div style={{ alignSelf: 'end', paddingBottom: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.textMuted, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rejected}
              onChange={(e) =>
                onField('date_rejected', e.target.checked ? new Date().toISOString().slice(0, 10) : null)
              }
            />
            Mark as rejected
          </label>
        </div>
      </div>

      {/* Tabs — matching Mastt: Line Items, Description, Time Impact, Additional Fields */}
      <div style={{ borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: 0, marginBottom: 16 }}>
        <button type="button" style={tabStyle('lineItems')} onClick={() => setActiveTab('lineItems')}>
          Line Items
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #2563eb', marginLeft: 6, verticalAlign: 'middle' }} />
        </button>
        <button type="button" style={tabStyle('description')} onClick={() => setActiveTab('description')}>
          Description
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #2563eb', marginLeft: 6, verticalAlign: 'middle' }} />
        </button>
        <button type="button" style={tabStyle('timeImpact')} onClick={() => setActiveTab('timeImpact')}>
          Time Impact
        </button>
        <button type="button" style={tabStyle('additional')} onClick={() => setActiveTab('additional')}>
          Additional Fields
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #2563eb', marginLeft: 6, verticalAlign: 'middle' }} />
        </button>
      </div>

      {/* ── Line Items tab ── */}
      {activeTab === 'lineItems' && (
        <div>
          <div style={{ ...tableStyles.wrapper, marginBottom: 12 }}>
            <table style={{ ...tableStyles.table, fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={smallTh}>Name</th>
                  <th style={{ ...smallTh, ...tableStyles.numeric }}>Requested Amount ⓘ</th>
                  <th style={{ ...smallTh, ...tableStyles.numeric }}>Variation Amount</th>
                  <th style={smallTh}>Contract Line Item</th>
                  <th style={smallTh}>Budget</th>
                  <th style={{ ...smallTh, ...tableStyles.numeric, width: 70 }}>Tax %</th>
                </tr>
              </thead>
              <tbody>
                {/* Summary row */}
                <tr style={{ background: '#f5f6f8' }}>
                  <td style={{ ...smallTd, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#7c3aed',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>V</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Variations</span>
                    </div>
                  </td>
                  <td style={{ ...smallTd, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {(Number(data.requested_amount) || 0).toFixed(2)}
                  </td>
                  <td style={{ ...smallTd, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {(Number(data.variation_amount) || 0).toFixed(2)}
                  </td>
                  <td style={{ ...smallTd, padding: '8px 10px' }}></td>
                  <td style={{ ...smallTd, padding: '8px 10px' }}></td>
                  <td style={{ ...smallTd, ...tableStyles.numeric, padding: '8px 10px' }}></td>
                </tr>
                {/* Editable row */}
                <tr>
                  <td style={smallTd}>
                    <input
                      style={smallInput}
                      value={data.reference}
                      onChange={(e) => onField('reference', e.target.value)}
                      placeholder="Enter name..."
                    />
                  </td>
                  <td style={smallTd}>
                    <input
                      style={{ ...smallInput, textAlign: 'right' }}
                      type="number"
                      min="0"
                      step="100"
                      value={data.requested_amount}
                      onChange={(e) => onField('requested_amount', e.target.value)}
                    />
                  </td>
                  <td style={smallTd}>
                    <input
                      style={{ ...smallInput, textAlign: 'right' }}
                      type="number"
                      step="100"
                      value={data.variation_amount}
                      onChange={(e) => onField('variation_amount', e.target.value)}
                      required
                    />
                  </td>
                  <td style={smallTd}>
                    <select
                      style={smallInput}
                      value={data.budget_line_id}
                      onChange={(e) => onField('budget_line_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {budgetLines.map((b) => (
                        <option key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.title}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...smallTd, fontSize: 11, color: colors.textMuted }}>
                    {(() => {
                      const b = budgetLines.find((x) => x.id === data.budget_line_id);
                      return b ? (b.code ? `${b.code} — ${b.title}` : b.title) : '';
                    })()}
                  </td>
                  <td style={smallTd}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input
                        style={{ ...smallInput, textAlign: 'right', width: 50 }}
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={data.tax_percent}
                        onChange={(e) => onField('tax_percent', e.target.value)}
                      />
                      <span style={{ fontSize: 12, color: colors.textMuted }}>%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#2563eb',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'default',
              opacity: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#2563eb',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}>+</span>
            Add Line Item
          </button>
        </div>
      )}

      {/* ── Description tab ── */}
      {activeTab === 'description' && (
        <div>
          <Field label="Description">
            <textarea
              style={{ ...input, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
              value={data.description}
              onChange={(e) => onField('description', e.target.value)}
              placeholder="Describe the variation scope, reason, and impact..."
            />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Notes">
              <textarea
                style={{ ...input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                value={data.notes}
                onChange={(e) => onField('notes', e.target.value)}
                placeholder="Internal notes..."
              />
            </Field>
          </div>
        </div>
      )}

      {/* ── Time Impact tab ── */}
      {activeTab === 'timeImpact' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Days Claimed">
            <input
              style={input}
              type="number"
              min="0"
              value={data.days_claimed}
              onChange={(e) => onField('days_claimed', e.target.value)}
            />
          </Field>
          <Field label="Days Approved">
            <input
              style={input}
              type="number"
              min="0"
              value={data.days_approved}
              onChange={(e) => onField('days_approved', e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* ── Additional Fields tab ── */}
      {activeTab === 'additional' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Variation No.">
              <input style={input} value={data.variation_no} onChange={(e) => onField('variation_no', e.target.value)} />
            </Field>
            <Field label="VO No.">
              <input style={input} value={data.vo_no} onChange={(e) => onField('vo_no', e.target.value)} />
            </Field>
            <Field label="VPR No.">
              <input style={input} value={data.vpr_no} onChange={(e) => onField('vpr_no', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Clause">
              <input style={input} value={data.clause} onChange={(e) => onField('clause', e.target.value)} />
            </Field>
            <Field label="Approved By">
              <input style={input} value={data.approved_by} onChange={(e) => onField('approved_by', e.target.value)} />
            </Field>
            <Field label="Date Received">
              <input style={input} type="date" value={data.date_received || ''} onChange={(e) => onField('date_received', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Date Approved">
              <input style={input} type="date" value={data.date_approved || ''} onChange={(e) => onField('date_approved', e.target.value)} />
            </Field>
            <Field label="Date Rejected">
              <input style={input} type="date" value={data.date_rejected || ''} onChange={(e) => onField('date_rejected', e.target.value || null)} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
