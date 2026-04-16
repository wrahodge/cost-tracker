import React, { useState } from 'react';
import { colors, btn, tableStyles, input, badge, badgeToneForStatus } from '../styles.js';
import { formatMoney } from '../utils/format.js';
import {
  contractOriginalSum,
  contractApprovedVars,
  contractRevisedSum,
  contractTotalCertified,
} from '../utils/calc.js';
import Modal from './Modal.jsx';
import { Field } from './FormShared.jsx';
import DropdownMenu from './DropdownMenu.jsx';

const CONTRACT_STATUSES = ['Approved', 'Pending', 'Part-Approved'];
const MILESTONE_STATUSES = ['Approved', 'Pending'];

// --- Contract list view -------------------------------------------------

export default function ContractsTab({
  budgetLines,
  contracts,
  variations,
  payments,
  onSave,
  onDelete,
}) {
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const expandAll = () => {
    const all = {};
    contracts.forEach((c) => { all[c.id] = true; });
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  const openNew = () =>
    setEditing({
      mode: 'new',
      data: {
        title: '',
        reference: '',
        vendor: '',
        status: 'Pending',
        retention_pct: 0.05,
        contract_standard: '',
        po_number: '',
        notes: '',
        sections: [
          {
            title: 'Main',
            milestones: [
              { title: '', budget_line_id: budgetLines[0]?.id || '', original_value: 0, status: 'Approved' },
            ],
          },
        ],
      },
    });

  const openEdit = (c) => {
    const sections = (c.contract_sections || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sec) => ({
        id: sec.id,
        title: sec.title || '',
        milestones: (c.contract_milestones || [])
          .filter((m) => m.section_id === sec.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((m) => ({
            id: m.id,
            title: m.title || '',
            budget_line_id: m.budget_line_id || '',
            original_value: m.original_value ?? 0,
            status: m.status || 'Approved',
          })),
      }));
    // Put unsectioned milestones in a default section
    const sectionedIds = new Set(sections.flatMap((s) => s.milestones.map((m) => m.id)));
    const unsectioned = (c.contract_milestones || []).filter((m) => !sectionedIds.has(m.id));
    if (sections.length === 0 || unsectioned.length > 0) {
      const defaultSec = sections.find((s) => s.title === 'Main') || {
        title: 'Main',
        milestones: [],
      };
      if (!sections.find((s) => s.title === 'Main')) sections.unshift(defaultSec);
      const mainSec = sections.find((s) => s.title === 'Main');
      mainSec.milestones.push(
        ...unsectioned.map((m) => ({
          id: m.id,
          title: m.title || '',
          budget_line_id: m.budget_line_id || '',
          original_value: m.original_value ?? 0,
          status: m.status || 'Approved',
        }))
      );
    }
    if (sections.length === 0) {
      sections.push({
        title: 'Main',
        milestones: [{ title: '', budget_line_id: budgetLines[0]?.id || '', original_value: 0, status: 'Approved' }],
      });
    }
    setEditing({
      mode: 'edit',
      data: {
        id: c.id,
        title: c.title || '',
        reference: c.reference || '',
        vendor: c.vendor || '',
        status: c.status || 'Pending',
        retention_pct: c.retention_pct ?? 0.05,
        contract_standard: c.contract_standard || '',
        po_number: c.po_number || '',
        notes: c.notes || '',
        sections,
      },
    });
  };

  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    const milestones = d.sections.flatMap((sec) =>
      sec.milestones.map((m) => ({
        ...m,
        original_value: Number(m.original_value) || 0,
        section_title: sec.title,
      }))
    );
    onSave({
      ...d,
      retention_pct: Number(d.retention_pct) || 0,
      vendor: d.vendor || d.title,
      milestones,
    });
    close();
  };

  const budgetLineLabel = (id) => {
    const b = budgetLines.find((x) => x.id === id);
    if (!b) return '—';
    return b.code ? `${b.code} — ${b.title}` : b.title;
  };

  const exportCSV = () => {
    const header = ['Title', 'Status', 'Original Value', 'Variation Value', 'Total Value', 'Budget', 'Contract Standard'];
    const rows = contracts.map((c) => {
      const orig = contractOriginalSum(c);
      const vars = contractApprovedVars(c, variations);
      const milestones = c.contract_milestones || [];
      const budgets = [...new Set(milestones.map((m) => budgetLineLabel(m.budget_line_id)))];
      return [
        c.title,
        c.status,
        orig.toFixed(2),
        vars.toFixed(2),
        (orig + vars).toFixed(2),
        budgets.length > 1 ? 'Multiple Budgets' : budgets[0] || '',
        c.contract_standard || '',
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contracts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const anyExpanded = Object.values(expanded).some(Boolean);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...btn.primary, background: '#2563eb' }} onClick={openNew}>
            + Add Contract
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
              <th style={tableStyles.th}>Status</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Original Contract Value</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Variation Value</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Total Contract Value</th>
              <th style={tableStyles.th}>Budget</th>
              <th style={tableStyles.th}>Contract Standard</th>
              <th style={{ ...tableStyles.th, width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => {
              const milestones = c.contract_milestones || [];
              const orig = contractOriginalSum(c);
              const vars = contractApprovedVars(c, variations);
              const total = orig + vars;
              const budgets = [...new Set(milestones.map((m) => budgetLineLabel(m.budget_line_id)))];
              const budgetDisplay = budgets.length > 1 ? 'Multiple Budgets' : budgets[0] || '—';
              const isExpanded = expanded[c.id];

              return (
                <React.Fragment key={c.id}>
                  <tr
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td
                      style={{ ...tableStyles.td, width: 36, cursor: 'pointer' }}
                      onClick={() => toggleExpand(c.id)}
                    >
                      {milestones.length > 0 && (
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
                      )}
                    </td>
                    <td style={tableStyles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                        {c.title}
                      </div>
                    </td>
                    <td style={tableStyles.td}>
                      <span style={badge(badgeToneForStatus(c.status))}>{c.status}</span>
                    </td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(orig)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>{formatMoney(vars)}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>{formatMoney(total)}</td>
                    <td style={{ ...tableStyles.td, fontSize: 13, color: budgets.length > 1 ? colors.pending : colors.textMuted }}>
                      {budgetDisplay}
                    </td>
                    <td style={{ ...tableStyles.td, fontSize: 13, color: colors.textMuted }}>{c.contract_standard || '—'}</td>
                    <td style={{ ...tableStyles.td, width: 44, textAlign: 'right' }}>
                      <DropdownMenu
                        items={[
                          { icon: '✎', label: 'Edit Contract', onClick: () => openEdit(c) },
                          {
                            icon: '🗑',
                            label: 'Delete Contract',
                            danger: true,
                            onClick: () => {
                              if (window.confirm(`Delete contract "${c.title}"? Linked variations and payments will also be removed.`))
                                onDelete(c.id);
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>

                  {/* Expanded milestones */}
                  {isExpanded &&
                    milestones
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((m) => (
                        <tr key={m.id} style={{ background: '#f9fafb' }}>
                          <td style={tableStyles.td} />
                          <td style={{ ...tableStyles.td, paddingLeft: 56, fontSize: 13, color: colors.textMuted }}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#2563eb', marginRight: 8, verticalAlign: 'middle' }} />
                            {m.title}
                          </td>
                          <td style={tableStyles.td}>
                            <span style={{ ...badge(badgeToneForStatus(m.status || 'Approved')), fontSize: 11 }}>
                              {m.status || 'Approved'}
                            </span>
                          </td>
                          <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontSize: 13 }}>{formatMoney(m.original_value)}</td>
                          <td colSpan={2} style={tableStyles.td} />
                          <td style={{ ...tableStyles.td, fontSize: 12, color: colors.textMuted }}>{budgetLineLabel(m.budget_line_id)}</td>
                          <td colSpan={2} style={tableStyles.td} />
                        </tr>
                      ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'right', fontSize: 13, color: colors.textMuted, marginTop: 8, paddingRight: 4 }}>
        Total Rows: {contracts.length}
      </div>

      {/* Edit / Create Modal */}
      {editing && (
        <ContractModal
          editing={editing}
          budgetLines={budgetLines}
          onClose={close}
          onSave={save}
        />
      )}
    </div>
  );
}

// --- Contract edit modal ------------------------------------------------

function ContractModal({ editing, budgetLines, onClose, onSave }) {
  const [data, setData] = useState(editing.data);
  const isNew = editing.mode === 'new';

  const onField = (f, v) => setData((d) => ({ ...d, [f]: v }));

  const onSectionTitle = (si, title) =>
    setData((d) => {
      const sections = [...d.sections];
      sections[si] = { ...sections[si], title };
      return { ...d, sections };
    });

  const onMilestone = (si, mi, field, value) =>
    setData((d) => {
      const sections = d.sections.map((s, i) =>
        i === si
          ? {
              ...s,
              milestones: s.milestones.map((m, j) =>
                j === mi ? { ...m, [field]: value } : m
              ),
            }
          : s
      );
      return { ...d, sections };
    });

  const addMilestone = (si) =>
    setData((d) => {
      const sections = [...d.sections];
      sections[si] = {
        ...sections[si],
        milestones: [
          ...sections[si].milestones,
          { title: '', budget_line_id: budgetLines[0]?.id || '', original_value: 0, status: 'Approved' },
        ],
      };
      return { ...d, sections };
    });

  const removeMilestone = (si, mi) =>
    setData((d) => {
      const sections = [...d.sections];
      sections[si] = {
        ...sections[si],
        milestones: sections[si].milestones.filter((_, j) => j !== mi),
      };
      return { ...d, sections };
    });

  const addSection = () =>
    setData((d) => ({
      ...d,
      sections: [
        ...d.sections,
        {
          title: '',
          milestones: [
            { title: '', budget_line_id: budgetLines[0]?.id || '', original_value: 0, status: 'Approved' },
          ],
        },
      ],
    }));

  const removeSection = (si) =>
    setData((d) => ({
      ...d,
      sections: d.sections.filter((_, i) => i !== si),
    }));

  const contractTotal = data.sections.reduce(
    (sum, sec) => sum + sec.milestones.reduce((s, m) => s + (Number(m.original_value) || 0), 0),
    0
  );

  const derivedBudget = (() => {
    const ids = new Set(
      data.sections.flatMap((s) => s.milestones.map((m) => m.budget_line_id).filter(Boolean))
    );
    if (ids.size === 0) return '—';
    if (ids.size === 1) {
      const b = budgetLines.find((x) => x.id === [...ids][0]);
      return b ? (b.code ? `${b.code} — ${b.title}` : b.title) : '—';
    }
    return 'Multiple Budgets';
  })();

  const handleSubmit = () => {
    editing.data = data;
    onSave();
  };

  return (
    <Modal
      title={isNew ? 'Add Contract' : 'Update Contract'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={isNew ? 'Create' : 'Update'}
      wide
    >
      {/* Top field row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr', gap: 14, marginBottom: 20 }}>
        <Field label="Title *">
          <input style={input} value={data.title} onChange={(e) => onField('title', e.target.value)} required />
        </Field>
        <Field label="Contract Standard">
          <input style={input} value={data.contract_standard} onChange={(e) => onField('contract_standard', e.target.value)} placeholder="e.g. AS4902-2000" />
        </Field>
        <Field label="Budget">
          <div style={{ ...input, background: '#f5f6f8', color: colors.textMuted, cursor: 'default' }}>
            {derivedBudget}
          </div>
        </Field>
        <Field label="PO Number">
          <input style={input} value={data.po_number} onChange={(e) => onField('po_number', e.target.value)} />
        </Field>
      </div>

      {/* Retention + Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Retention %">
          <input
            style={input}
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={((Number(data.retention_pct) || 0) * 100).toFixed(1)}
            onChange={(e) => onField('retention_pct', (Number(e.target.value) || 0) / 100)}
          />
        </Field>
        <Field label="Status">
          <select style={input} value={data.status} onChange={(e) => onField('status', e.target.value)}>
            {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div />
      </div>

      {/* Line Items section */}
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', marginBottom: 12 }}>
          Line Items
        </div>

        {/* Contract Total row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 130px 1fr 120px',
            gap: 8,
            padding: '10px 12px',
            background: '#f5f6f8',
            borderRadius: 6,
            marginBottom: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              C
            </span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Contract Total</span>
          </div>
          <div style={{ ...tableStyles.numeric, fontWeight: 700, fontSize: 14 }}>{formatMoney(contractTotal)}</div>
          <div />
          <div>
            <span style={badge(badgeToneForStatus(data.status))}>{data.status}</span>
          </div>
        </div>

        {/* Sections */}
        {data.sections.map((sec, si) => {
          const secTotal = sec.milestones.reduce((s, m) => s + (Number(m.original_value) || 0), 0);
          return (
            <div key={si} style={{ marginBottom: 16 }}>
              {/* Section header */}
              {(data.sections.length > 1 || sec.title !== 'Main') && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: '#eef0f3',
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 14, color: colors.textMuted }}>⊞</span>
                  <input
                    style={{ ...input, fontWeight: 600, background: 'transparent', border: 'none', padding: '4px 0', flex: 1 }}
                    value={sec.title}
                    onChange={(e) => onSectionTitle(si, e.target.value)}
                    placeholder="Section name (e.g. SP1 - Townhouses)"
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, marginRight: 8 }}>
                    {formatMoney(secTotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => addMilestone(si)}
                    style={{ ...btn.secondary, padding: '3px 8px', fontSize: 12 }}
                    title="Add line item to this section"
                  >
                    +
                  </button>
                  {data.sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(si)}
                      style={{ ...btn.danger, fontSize: 14 }}
                      title="Remove section"
                    >
                      🗑
                    </button>
                  )}
                </div>
              )}

              {/* Milestone rows */}
              {sec.milestones.map((m, mi) => (
                <div
                  key={mi}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 1fr 100px 32px',
                    gap: 8,
                    marginBottom: 6,
                    paddingLeft: data.sections.length > 1 || sec.title !== 'Main' ? 24 : 0,
                    alignItems: 'center',
                  }}
                >
                  <input
                    style={input}
                    value={m.title}
                    onChange={(e) => onMilestone(si, mi, 'title', e.target.value)}
                    placeholder="Line item name"
                    required
                  />
                  <input
                    style={{ ...input, textAlign: 'right' }}
                    type="number"
                    min="0"
                    step="1000"
                    value={m.original_value}
                    onChange={(e) => onMilestone(si, mi, 'original_value', e.target.value)}
                    required
                  />
                  <select
                    style={input}
                    value={m.budget_line_id}
                    onChange={(e) => onMilestone(si, mi, 'budget_line_id', e.target.value)}
                    required
                  >
                    {budgetLines.map((b) => (
                      <option key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.title}</option>
                    ))}
                  </select>
                  <select
                    style={input}
                    value={m.status || 'Approved'}
                    onChange={(e) => onMilestone(si, mi, 'status', e.target.value)}
                  >
                    {MILESTONE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMilestone(si, mi)}
                    style={{ ...btn.danger, fontSize: 14, visibility: sec.milestones.length > 1 ? 'visible' : 'hidden' }}
                    title="Remove line item"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {/* Add buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => addMilestone(data.sections.length - 1)}
            style={{ ...btn.secondary, fontSize: 13, padding: '7px 14px', color: '#2563eb' }}
          >
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#2563eb', marginRight: 6, verticalAlign: 'middle' }} />
            Add Line Item
          </button>
          <button
            type="button"
            onClick={addSection}
            style={{ ...btn.secondary, fontSize: 13, padding: '7px 14px', color: colors.textMuted }}
          >
            ⊞ Add Section
          </button>
        </div>
      </div>

      {/* Notes */}
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16, marginTop: 20 }}>
        <Field label="Notes">
          <textarea
            style={{ ...input, minHeight: 80, resize: 'vertical' }}
            value={data.notes}
            onChange={(e) => onField('notes', e.target.value)}
            placeholder="Internal notes…"
          />
        </Field>
      </div>
    </Modal>
  );
}
