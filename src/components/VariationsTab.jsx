import React, { useState, useMemo } from 'react';
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
    contract_variation_no: '',
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

  // --- CRUD ---
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

  const contractLabel = (id) => {
    const c = contracts.find((x) => x.id === id);
    return c ? c.title : '—';
  };

  const vendorLabel = (id) => {
    const c = contracts.find((x) => x.id === id);
    return c?.vendor || c?.title || '—';
  };

  const budgetLineLabel = (id) => {
    if (!budgetLines) return '—';
    const b = budgetLines.find((x) => x.id === id);
    return b ? (b.code ? `${b.code} — ${b.title}` : b.title) : '—';
  };

  // --- CSV export ---
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

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...btn.primary, background: '#2563eb' }} onClick={openNew}>
            + Add Variation
          </button>
          <button style={btn.secondary} onClick={exportCSV}>
            ↓ Export
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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
              <th style={tableStyles.th}>Title</th>
              <th style={tableStyles.th}>Contract</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric, width: 70 }}>Contr. Var No.</th>
              <th style={tableStyles.th}>Vendor</th>
              <th style={{ ...tableStyles.th, width: 90 }}>Variation No.</th>
              <th style={{ ...tableStyles.th, width: 70 }}>VO No.</th>
              <th style={tableStyles.th}>Status</th>
              <th style={tableStyles.th}>Category</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Variation Amount</th>
              <th style={{ ...tableStyles.th, width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {variations.map((v) => {
              const rejected = !!v.date_rejected;
              const isExpanded = expanded[v.id];
              return (
                <React.Fragment key={v.id}>
                  <tr
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td
                      style={{ ...tableStyles.td, width: 36, cursor: 'pointer' }}
                      onClick={() => toggleExpand(v.id)}
                    >
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
                    <td style={{ ...tableStyles.td, cursor: 'pointer' }} onClick={() => openEdit(v)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#7c3aed',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          V
                        </span>
                        <span style={{
                          textDecoration: rejected ? 'line-through' : 'none',
                          color: rejected ? colors.textMuted : colors.text,
                        }}>
                          {v.title}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...tableStyles.td, fontSize: 13 }}>{contractLabel(v.contract_id)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{v.contract_variation_no ?? '—'}</td>
                    <td style={{ ...tableStyles.td, fontSize: 13, color: colors.textMuted }}>{vendorLabel(v.contract_id)}</td>
                    <td style={tableStyles.td}>{v.variation_no || '—'}</td>
                    <td style={tableStyles.td}>{v.vo_no || '—'}</td>
                    <td style={tableStyles.td}>
                      {rejected ? (
                        <span style={badge('negative')}>Rejected</span>
                      ) : (
                        <span style={badge(badgeToneForStatus(v.status))}>{v.status}</span>
                      )}
                    </td>
                    <td style={{ ...tableStyles.td, fontSize: 13, color: colors.textMuted }}>{v.category || '—'}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>
                      {formatMoney(v.variation_amount)}
                    </td>
                    <td style={{ ...tableStyles.td, width: 44, textAlign: 'right' }}>
                      <DropdownMenu
                        items={[
                          { icon: '✎', label: 'Edit Variation', onClick: () => openEdit(v) },
                          { icon: '🖨', label: 'Variation Order PDF', onClick: () => setReportVariation(v) },
                          {
                            icon: '🗑',
                            label: 'Delete Variation',
                            danger: true,
                            onClick: () => {
                              if (window.confirm(`Delete variation "${v.reference || v.title}"?`))
                                onDelete(v.id);
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <tr style={{ background: '#f9fafb' }}>
                      <td style={tableStyles.td} />
                      <td colSpan={10} style={{ ...tableStyles.td, paddingLeft: 56 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 12 }}>
                          <div>
                            <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Reference</div>
                            {v.reference || '—'}
                          </div>
                          <div>
                            <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Date Received</div>
                            {v.date_received || '—'}
                          </div>
                          <div>
                            <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Date Approved</div>
                            {v.date_approved || '—'}
                          </div>
                          <div>
                            <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Requested Amount</div>
                            {v.requested_amount != null ? formatMoney(v.requested_amount) : '—'}
                          </div>
                          <div>
                            <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Budget</div>
                            {budgetLineLabel(v.budget_line_id)}
                          </div>
                          <div>
                            <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Tax %</div>
                            {v.tax_percent != null ? `${v.tax_percent}%` : '10%'}
                          </div>
                          <div>
                            <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Days Claimed</div>
                            {v.days_claimed ?? '—'}
                          </div>
                          <div>
                            <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Days Approved</div>
                            {v.days_approved ?? '—'}
                          </div>
                          {v.description && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Description</div>
                              {v.description}
                            </div>
                          )}
                          {v.notes && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>Notes</div>
                              {v.notes}
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

      {/* Modal */}
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

      {/* Variation Order Report overlay */}
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

// ---------------------------------------------------------------------------
// Variation form (inside modal)
// ---------------------------------------------------------------------------

function VariationForm({ data, contracts, budgetLines, onField }) {
  const [activeTab, setActiveTab] = useState('lineItems');

  // When the contract changes, auto-pick the first milestone's budget line
  const onContractChange = (id) => {
    onField('contract_id', id);
    const c = contracts.find((x) => x.id === id);
    const firstBudgetLine = c?.contract_milestones?.[0]?.budget_line_id || '';
    onField('budget_line_id', firstBudgetLine);
  };

  const rejected = !!data.date_rejected;

  const tabStyle = (tab) => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    color: activeTab === tab ? '#2563eb' : colors.textMuted,
    borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
  });

  return (
    <div style={{ display: 'grid', gap: 0 }}>
      {/* Row 1 — Title, Contract, Category, Contract Var No. */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', gap: 14, marginBottom: 18 }}>
        <Field label="Title">
          <input
            style={input}
            value={data.title}
            onChange={(e) => onField('title', e.target.value)}
            placeholder="Variation title"
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
            <option value="">— Select contract —</option>
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
            <option value="">— None —</option>
            {CATEGORIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Contract Var. Number">
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
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14, marginBottom: 18 }}>
        <Field label="Status">
          <select style={input} value={data.status} onChange={(e) => onField('status', e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div style={{ alignSelf: 'end', paddingBottom: 4 }}>
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

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: 0, marginBottom: 16 }}>
        <button type="button" style={tabStyle('lineItems')} onClick={() => setActiveTab('lineItems')}>Line Items</button>
        <button type="button" style={tabStyle('description')} onClick={() => setActiveTab('description')}>Description</button>
        <button type="button" style={tabStyle('timeImpact')} onClick={() => setActiveTab('timeImpact')}>Time Impact</button>
        <button type="button" style={tabStyle('additional')} onClick={() => setActiveTab('additional')}>Additional Fields</button>
      </div>

      {/* Tab content: Line Items */}
      {activeTab === 'lineItems' && (
        <div>
          <table style={{ ...tableStyles.table, fontSize: 12, marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ ...tableStyles.th, fontSize: 11, padding: '8px 10px' }}>Name</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px' }}>Requested Amount</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px' }}>Variation Amount</th>
                <th style={{ ...tableStyles.th, fontSize: 11, padding: '8px 10px' }}>Contract Line Item</th>
                <th style={{ ...tableStyles.th, fontSize: 11, padding: '8px 10px' }}>Budget</th>
                <th style={{ ...tableStyles.th, ...tableStyles.numeric, fontSize: 11, padding: '8px 10px', width: 70 }}>Tax %</th>
              </tr>
            </thead>
            <tbody>
              {/* Summary row */}
              <tr style={{ background: '#f5f6f8' }}>
                <td style={{ ...tableStyles.td, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>V</span>
                    <span style={{ fontWeight: 600 }}>Variations</span>
                  </div>
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>
                  {formatMoney(Number(data.requested_amount) || 0)}
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px', fontWeight: 600 }}>
                  {formatMoney(Number(data.variation_amount) || 0)}
                </td>
                <td style={{ ...tableStyles.td, padding: '8px 10px' }}></td>
                <td style={{ ...tableStyles.td, padding: '8px 10px' }}></td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, padding: '8px 10px' }}></td>
              </tr>
              {/* Editable line item row */}
              <tr>
                <td style={{ ...tableStyles.td, padding: '6px 10px' }}>
                  <input
                    style={{ ...input, padding: '4px 8px', fontSize: 12 }}
                    value={data.reference}
                    onChange={(e) => onField('reference', e.target.value)}
                    placeholder="Enter name..."
                  />
                </td>
                <td style={{ ...tableStyles.td, padding: '6px 10px' }}>
                  <input
                    style={{ ...input, padding: '4px 8px', fontSize: 12, textAlign: 'right' }}
                    type="number"
                    min="0"
                    step="100"
                    value={data.requested_amount}
                    onChange={(e) => onField('requested_amount', e.target.value)}
                  />
                </td>
                <td style={{ ...tableStyles.td, padding: '6px 10px' }}>
                  <input
                    style={{ ...input, padding: '4px 8px', fontSize: 12, textAlign: 'right' }}
                    type="number"
                    step="100"
                    value={data.variation_amount}
                    onChange={(e) => onField('variation_amount', e.target.value)}
                    required
                  />
                </td>
                <td style={{ ...tableStyles.td, padding: '6px 10px' }}>
                  <select
                    style={{ ...input, padding: '4px 8px', fontSize: 12 }}
                    value={data.budget_line_id}
                    onChange={(e) => onField('budget_line_id', e.target.value)}
                  >
                    <option value="">—</option>
                    {budgetLines.map((b) => (
                      <option key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.title}</option>
                    ))}
                  </select>
                </td>
                <td style={{ ...tableStyles.td, padding: '6px 10px', fontSize: 11, color: colors.textMuted }}>
                  {(() => {
                    const b = budgetLines.find((x) => x.id === data.budget_line_id);
                    return b ? (b.code ? `${b.code} — ${b.title}` : b.title) : '—';
                  })()}
                </td>
                <td style={{ ...tableStyles.td, padding: '6px 10px' }}>
                  <input
                    style={{ ...input, padding: '4px 8px', fontSize: 12, textAlign: 'right', width: 60 }}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={data.tax_percent}
                    onChange={(e) => onField('tax_percent', e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tab content: Description */}
      {activeTab === 'description' && (
        <div>
          <Field label="Description">
            <textarea
              style={{ ...input, minHeight: 120, resize: 'vertical' }}
              value={data.description}
              onChange={(e) => onField('description', e.target.value)}
              placeholder="Describe the variation scope, reason, and impact…"
            />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Notes">
              <textarea
                style={{ ...input, minHeight: 80, resize: 'vertical' }}
                value={data.notes}
                onChange={(e) => onField('notes', e.target.value)}
                placeholder="Internal notes…"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Tab content: Time Impact */}
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

      {/* Tab content: Additional Fields */}
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
