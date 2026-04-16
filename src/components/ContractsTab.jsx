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

const CONTRACT_STATUSES = ['Approved', 'Pending', 'Part-Approved'];

const emptyContract = {
  title: '',
  reference: '',
  vendor: '',
  status: 'Pending',
  retention_pct: 0.05,
  contract_standard: '',
  milestones: [{ title: 'Main', budget_line_id: '', original_value: 0 }],
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
        milestones: [
          { title: 'Main', budget_line_id: budgetLines[0]?.id || '', original_value: 0 },
        ],
      },
    });

  const openEdit = (c) => {
    const milestones = (c.contract_milestones || []).map((m) => ({
      id: m.id,
      title: m.title || '',
      budget_line_id: m.budget_line_id || '',
      original_value: m.original_value ?? 0,
    }));
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
        milestones: milestones.length > 0
          ? milestones
          : [{ title: 'Main', budget_line_id: budgetLines[0]?.id || '', original_value: 0 }],
      },
    });
  };

  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({
      ...d,
      retention_pct: Number(d.retention_pct) || 0,
      vendor: d.vendor || d.title,
      milestones: d.milestones.map((m) => ({
        ...m,
        original_value: Number(m.original_value) || 0,
      })),
    });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  const onMilestone = (index, field, value) =>
    setEditing((e) => {
      const ms = [...e.data.milestones];
      ms[index] = { ...ms[index], [field]: value };
      return { ...e, data: { ...e.data, milestones: ms } };
    });

  const addMilestone = () =>
    setEditing((e) => ({
      ...e,
      data: {
        ...e.data,
        milestones: [
          ...e.data.milestones,
          { title: '', budget_line_id: budgetLines[0]?.id || '', original_value: 0 },
        ],
      },
    }));

  const removeMilestone = (index) =>
    setEditing((e) => ({
      ...e,
      data: {
        ...e.data,
        milestones: e.data.milestones.filter((_, i) => i !== index),
      },
    }));

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
              <th style={tableStyles.th}>Cost Code(s)</th>
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
              const milestones = c.contract_milestones || [];
              const original = contractOriginalSum(c);
              const revised = contractRevisedSum(c, variations);
              const certified = contractTotalCertified(c, payments);
              const budgetLabels = [
                ...new Set(milestones.map((m) => budgetLineLabel(m.budget_line_id))),
              ];
              const costCodeDisplay =
                budgetLabels.length > 1 ? 'Multiple Budgets' : budgetLabels[0] || '—';
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
                  <td
                    style={{
                      ...tableStyles.td,
                      color: budgetLabels.length > 1 ? colors.pending : colors.textMuted,
                      fontSize: 13,
                    }}
                  >
                    {costCodeDisplay}
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
                        )
                          onDelete(c.id);
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
              <Field label="Status">
                <select
                  style={input}
                  value={editing.data.status}
                  onChange={(e) => onField('status', e.target.value)}
                >
                  {CONTRACT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Milestones sub-editor */}
            <div
              style={{
                borderTop: `1px solid ${colors.border}`,
                paddingTop: 14,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: colors.textMuted,
                  }}
                >
                  Milestones
                </div>
                <button type="button" onClick={addMilestone} style={{ ...btn.secondary, padding: '5px 10px', fontSize: 12 }}>
                  + Milestone
                </button>
              </div>
              {editing.data.milestones.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.2fr 120px 32px',
                    gap: 8,
                    marginBottom: 8,
                    alignItems: 'end',
                  }}
                >
                  <div>
                    {i === 0 && <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Title</div>}
                    <input
                      style={input}
                      value={m.title}
                      onChange={(e) => onMilestone(i, 'title', e.target.value)}
                      placeholder="Milestone name"
                      required
                    />
                  </div>
                  <div>
                    {i === 0 && <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Budget Line</div>}
                    <select
                      style={input}
                      value={m.budget_line_id}
                      onChange={(e) => onMilestone(i, 'budget_line_id', e.target.value)}
                      required
                    >
                      {budgetLines.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code ? `${b.code} — ` : ''}{b.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Value ($)</div>}
                    <input
                      style={input}
                      type="number"
                      min="0"
                      step="1000"
                      value={m.original_value}
                      onChange={(e) => onMilestone(i, 'original_value', e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ paddingBottom: 2 }}>
                    {editing.data.milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(i)}
                        style={btn.danger}
                        title="Remove milestone"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div
                style={{
                  fontSize: 13,
                  color: colors.textMuted,
                  textAlign: 'right',
                  marginTop: 4,
                }}
              >
                Total:{' '}
                <strong style={{ color: colors.text }}>
                  {formatMoney(
                    editing.data.milestones.reduce(
                      (s, m) => s + (Number(m.original_value) || 0),
                      0
                    )
                  )}
                </strong>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
