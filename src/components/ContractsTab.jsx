import React, { useState } from 'react';
import { colors, btn, tableStyles, input, badge, badgeToneForStatus } from '../styles.js';
import { formatMoney, formatPct } from '../utils/format.js';
import {
  contractRevisedSum,
  contractTotalCertified,
} from '../utils/calc.js';
import Modal from './Modal.jsx';
import { Field, TabToolbar } from './FormShared.jsx';

const STATUSES = ['Active', 'Closed', 'On Hold'];

const emptyContract = {
  budgetLineId: '',
  contractor: '',
  reference: '',
  originalSum: 0,
  retentionPct: 0.05,
  status: 'Active',
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
      data: { ...emptyContract, budgetLineId: budgetLines[0]?.id || '' },
    });
  const openEdit = (c) => setEditing({ mode: 'edit', data: { ...c } });
  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({
      ...d,
      originalSum: Number(d.originalSum) || 0,
      retentionPct: Number(d.retentionPct) || 0,
    });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  const budgetLineName = (id) => {
    const b = budgetLines.find((x) => x.id === id);
    return b ? `${b.code} — ${b.description}` : '—';
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
                  <td style={tableStyles.td}>{c.reference}</td>
                  <td style={tableStyles.td}>{c.contractor}</td>
                  <td style={tableStyles.td}>{budgetLineName(c.budgetLineId)}</td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(c.originalSum)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(revised)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(certified)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatPct(c.retentionPct)}
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
                            `Delete contract "${c.contractor}"? Linked variations and payments will also be removed.`
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
                required
              />
            </Field>
            <Field label="Contractor / Consultant">
              <input
                style={input}
                value={editing.data.contractor}
                onChange={(e) => onField('contractor', e.target.value)}
                required
              />
            </Field>
            <Field label="Budget Line">
              <select
                style={input}
                value={editing.data.budgetLineId}
                onChange={(e) => onField('budgetLineId', e.target.value)}
                required
              >
                {budgetLines.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.description}
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
                  value={editing.data.originalSum}
                  onChange={(e) => onField('originalSum', e.target.value)}
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
                  value={editing.data.retentionPct}
                  onChange={(e) => onField('retentionPct', e.target.value)}
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
