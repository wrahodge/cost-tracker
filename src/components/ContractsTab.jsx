import React, { useState } from 'react';
import { colors, btn, tableStyles, input, badge, badgeToneForStatus } from '../styles.js';
import { formatMoney, formatPct } from '../utils/format.js';
import {
  contractOriginalSum,
  contractRevisedSum,
  contractTotalCertified,
} from '../utils/calc.js';
import Modal from './Modal.jsx';
import { Field, TabToolbar } from './FormShared.jsx';

const STATUSES = ['Approved', 'Pending', 'Part-Approved'];

const emptyContract = {
  title: '',
  reference: '',
  vendor: '',
  status: 'Pending',
  retention_pct: 0.05,
  contract_standard: '',
  // Shim fields for the single auto-created milestone
  budget_line_id: '',
  original_value: 0,
};

export default function ContractsTab({
  budgetLines,
  contracts,
  variations,
  payments,
  onSave,
  onDelete,
}) {
  const [editing, setEditing] = useState(null);

  const openNew = () =>
    setEditing({
      mode: 'new',
      data: {
        ...emptyContract,
        budget_line_id: budgetLines[0]?.id || '',
      },
    });

  const openEdit = (c) => {
    // Pull the single milestone fields into the shim form.
    const firstMilestone = (c.contract_milestones || [])[0];
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
        budget_line_id: firstMilestone?.budget_line_id || '',
        original_value: firstMilestone?.original_value ?? 0,
      },
    });
  };

  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({
      ...d,
      retention_pct: Number(d.retention_pct) || 0,
      original_value: Number(d.original_value) || 0,
      // Vendor defaults to title if the user leaves it blank.
      vendor: d.vendor || d.title,
    });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  const budgetLineLabel = (id) => {
    const b = budgetLines.find((x) => x.id === id);
    if (!b) return '—';
    return b.code ? `${b.code} — ${b.title}` : b.title;
  };

  return (
    <div>
      <TabToolbar title="Contracts" onAdd={openNew} />

      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Ref</th>
              <th style={tableStyles.th}>Contractor</th>
              <th style={tableStyles.th}>Cost Code</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Original Sum</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Revised Sum</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Certified</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Retention %</th>
              <th style={tableStyles.th}>Status</th>
              <th style={{ ...tableStyles.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => {
              const firstMilestone = (c.contract_milestones || [])[0];
              const original = contractOriginalSum(c);
              const revised = contractRevisedSum(c, variations);
              const certified = contractTotalCertified(c, payments);
              return (
                <tr
                  key={c.id}
                  style={tableStyles.tr}
                  onClick={() => openEdit(c)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tableStyles.td}>{c.reference || '—'}</td>
                  <td style={tableStyles.td}>{c.title}</td>
                  <td style={tableStyles.td}>
                    {budgetLineLabel(firstMilestone?.budget_line_id)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(original)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(revised)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(certified)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatPct(c.retention_pct)}
                  </td>
                  <td style={tableStyles.td}>
                    <span style={badge(badgeToneForStatus(c.status))}>{c.status}</span>
                  </td>
                  <td style={{ ...tableStyles.td, width: 40, textAlign: 'right' }}>
                    <button
                      style={btn.danger}
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Delete contract "${c.title}"? Linked variations and payments will also be removed.`
                          )
                        ) {
                          onDelete(c.id);
                        }
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title={editing.mode === 'new' ? 'New Contract' : 'Edit Contract'}
          onClose={close}
          onSubmit={save}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Reference">
              <input
                style={input}
                value={editing.data.reference}
                onChange={(e) => onField('reference', e.target.value)}
                placeholder="e.g. CT-001"
              />
            </Field>
            <Field label="Contractor / Consultant">
              <input
                style={input}
                value={editing.data.title}
                onChange={(e) => onField('title', e.target.value)}
                required
              />
            </Field>
            <Field label="Budget Line">
              <select
                style={input}
                value={editing.data.budget_line_id}
                onChange={(e) => onField('budget_line_id', e.target.value)}
                required
              >
                {budgetLines.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ? `${b.code} — ` : ''}
                    {b.title}
                  </option>
                ))}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Original Sum (AUD)">
                <input
                  style={input}
                  type="number"
                  min="0"
                  step="1000"
                  value={editing.data.original_value}
                  onChange={(e) => onField('original_value', e.target.value)}
                  required
                />
              </Field>
              <Field label="Retention (0 – 1)">
                <input
                  style={input}
                  type="number"
                  min="0"
                  max="1"
                  step="0.005"
                  value={editing.data.retention_pct}
                  onChange={(e) => onField('retention_pct', e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Status">
              <select
                style={input}
                value={editing.data.status}
                onChange={(e) => onField('status', e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
