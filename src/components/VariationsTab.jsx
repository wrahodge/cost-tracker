import React, { useState } from 'react';
import { colors, btn, tableStyles, input, badge, badgeToneForStatus } from '../styles.js';
import { formatMoney, formatDate } from '../utils/format.js';
import Modal from './Modal.jsx';
import { Field, TabToolbar } from './FormShared.jsx';

const STATUSES = ['Pending', 'Approved', 'Rejected'];

const empty = {
  contractId: '',
  reference: '',
  description: '',
  amount: 0,
  status: 'Pending',
  date: new Date().toISOString().slice(0, 10),
};

export default function VariationsTab({ contracts, variations, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);

  const openNew = () =>
    setEditing({
      mode: 'new',
      data: { ...empty, contractId: contracts[0]?.id || '' },
    });
  const openEdit = (v) => setEditing({ mode: 'edit', data: { ...v } });
  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({ ...d, amount: Number(d.amount) || 0 });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  const contractName = (id) => {
    const c = contracts.find((x) => x.id === id);
    return c ? `${c.reference} — ${c.contractor}` : '—';
  };

  return (
    <div>
      <TabToolbar title="Variations" onAdd={openNew} />

      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Ref</th>
              <th style={tableStyles.th}>Contract</th>
              <th style={tableStyles.th}>Description</th>
              <th style={tableStyles.th}>Date</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Amount</th>
              <th style={tableStyles.th}>Status</th>
              <th style={{ ...tableStyles.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {variations.map((v) => (
              <tr
                key={v.id}
                style={tableStyles.tr}
                onClick={() => openEdit(v)}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={tableStyles.td}>{v.reference}</td>
                <td style={tableStyles.td}>{contractName(v.contractId)}</td>
                <td style={tableStyles.td}>{v.description}</td>
                <td style={tableStyles.td}>{formatDate(v.date)}</td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                  {formatMoney(v.amount)}
                </td>
                <td style={tableStyles.td}>
                  <span style={badge(badgeToneForStatus(v.status))}>{v.status}</span>
                </td>
                <td style={{ ...tableStyles.td, width: 40, textAlign: 'right' }}>
                  <button
                    style={btn.danger}
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete variation ${v.reference}?`)) {
                        onDelete(v.id);
                      }
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title={editing.mode === 'new' ? 'New Variation' : 'Edit Variation'}
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
            <Field label="Contract">
              <select
                style={input}
                value={editing.data.contractId}
                onChange={(e) => onField('contractId', e.target.value)}
                required
              >
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.reference} — {c.contractor}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <input
                style={input}
                value={editing.data.description}
                onChange={(e) => onField('description', e.target.value)}
                required
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Amount (AUD)">
                <input
                  style={input}
                  type="number"
                  step="100"
                  value={editing.data.amount}
                  onChange={(e) => onField('amount', e.target.value)}
                  required
                />
              </Field>
              <Field label="Date">
                <input
                  style={input}
                  type="date"
                  value={editing.data.date}
                  onChange={(e) => onField('date', e.target.value)}
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
