import React, { useState } from 'react';
import { colors, btn, tableStyles, input, badge, badgeToneForStatus } from '../styles.js';
import { formatMoney, formatDate } from '../utils/format.js';
import Modal from './Modal.jsx';
import { Field, TabToolbar } from './FormShared.jsx';

const STATUSES = ['Forecast', 'Pending', 'In Principle', 'Approved'];

function emptyVariation(defaults = {}) {
  return {
    contract_id: '',
    budget_line_id: '',
    reference: '',
    title: '',
    description: '',
    status: 'Pending',
    date_received: new Date().toISOString().slice(0, 10),
    date_rejected: null,
    variation_amount: 0,
    ...defaults,
  };
}

export default function VariationsTab({ contracts, variations, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);

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
        date_received: v.date_received || '',
        date_rejected: v.date_rejected || null,
        variation_amount: v.variation_amount ?? 0,
      },
    });

  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({
      ...d,
      variation_amount: Number(d.variation_amount) || 0,
    });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  const contractLabel = (id) => {
    const c = contracts.find((x) => x.id === id);
    return c ? `${c.reference || ''} — ${c.title}`.trim() : '—';
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
            {variations.map((v) => {
              const rejected = !!v.date_rejected;
              return (
                <tr
                  key={v.id}
                  style={tableStyles.tr}
                  onClick={() => openEdit(v)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = colors.accentRow)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <td style={tableStyles.td}>{v.reference || '—'}</td>
                  <td style={tableStyles.td}>{contractLabel(v.contract_id)}</td>
                  <td
                    style={{
                      ...tableStyles.td,
                      textDecoration: rejected ? 'line-through' : 'none',
                      color: rejected ? colors.textMuted : colors.text,
                    }}
                  >
                    {v.title}
                  </td>
                  <td style={tableStyles.td}>{formatDate(v.date_received)}</td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(v.variation_amount)}
                  </td>
                  <td style={tableStyles.td}>
                    {rejected ? (
                      <span style={badge('negative')}>Rejected</span>
                    ) : (
                      <span style={badge(badgeToneForStatus(v.status))}>{v.status}</span>
                    )}
                  </td>
                  <td style={{ ...tableStyles.td, width: 40, textAlign: 'right' }}>
                    <button
                      style={btn.danger}
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete variation ${v.reference || v.title}?`)) {
                          onDelete(v.id);
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
          title={editing.mode === 'new' ? 'New Variation' : 'Edit Variation'}
          onClose={close}
          onSubmit={save}
        >
          <VariationForm
            data={editing.data}
            contracts={contracts}
            onField={onField}
          />
        </Modal>
      )}
    </div>
  );
}

function VariationForm({ data, contracts, onField }) {
  // When the contract changes, auto-pick the first milestone's budget line
  // so the variation points at the right cost code by default.
  const onContractChange = (id) => {
    onField('contract_id', id);
    const c = contracts.find((x) => x.id === id);
    const firstBudgetLine = c?.contract_milestones?.[0]?.budget_line_id || '';
    onField('budget_line_id', firstBudgetLine);
  };

  const rejected = !!data.date_rejected;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Field label="Reference">
        <input
          style={input}
          value={data.reference}
          onChange={(e) => onField('reference', e.target.value)}
          placeholder="e.g. VAR-001"
        />
      </Field>
      <Field label="Contract">
        <select
          style={input}
          value={data.contract_id}
          onChange={(e) => onContractChange(e.target.value)}
          required
        >
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.reference ? `${c.reference} — ` : ''}
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <input
          style={input}
          value={data.title}
          onChange={(e) => onField('title', e.target.value)}
          required
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Amount (AUD)">
          <input
            style={input}
            type="number"
            step="100"
            value={data.variation_amount}
            onChange={(e) => onField('variation_amount', e.target.value)}
            required
          />
        </Field>
        <Field label="Date Received">
          <input
            style={input}
            type="date"
            value={data.date_received || ''}
            onChange={(e) => onField('date_received', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Status">
        <select
          style={input}
          value={data.status}
          onChange={(e) => onField('status', e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: colors.textMuted,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={rejected}
          onChange={(e) =>
            onField(
              'date_rejected',
              e.target.checked ? new Date().toISOString().slice(0, 10) : null
            )
          }
        />
        Mark as rejected (won't flow into revised contract sums)
      </label>
    </div>
  );
}
