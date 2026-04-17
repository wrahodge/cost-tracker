import React, { useState } from 'react';
import { colors, btn, tableStyles, input } from '../styles.js';
import { formatMoney } from '../utils/format.js';
import Modal from './Modal.jsx';
import { Field } from './FormShared.jsx';
import DropdownMenu from './DropdownMenu.jsx';

function emptyForecast(defaults = {}) {
  return {
    budget_line_id: '',
    title: '',
    amount: 0,
    notes: '',
    ...defaults,
  };
}

export default function ForecastsTab({ budgetLines, forecasts, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);

  const openNew = () =>
    setEditing({
      mode: 'new',
      data: emptyForecast({ budget_line_id: budgetLines[0]?.id || '' }),
    });

  const openEdit = (f) =>
    setEditing({
      mode: 'edit',
      data: {
        id: f.id,
        budget_line_id: f.budget_line_id || '',
        title: f.title || '',
        amount: f.amount ?? 0,
        notes: f.notes || '',
      },
    });

  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({ ...d, amount: Number(d.amount) || 0 });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  const budgetLineLabel = (id) => {
    const b = budgetLines.find((x) => x.id === id);
    if (!b) return '—';
    return b.code ? `${b.code} — ${b.title}` : b.title;
  };

  const total = forecasts.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

  const exportCSV = () => {
    const header = ['Description', 'Budget Line', 'Amount', 'Notes'];
    const rows = forecasts.map((f) => [
      f.title,
      budgetLineLabel(f.budget_line_id),
      (Number(f.amount) || 0).toFixed(2),
      f.notes || '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forecasts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btn.primary} onClick={openNew}>
            + Add Forecast
          </button>
          <button style={btn.secondary} onClick={exportCSV}>
            ↓ Export
          </button>
        </div>
      </div>

      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Description</th>
              <th style={tableStyles.th}>Budget Line</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Amount</th>
              <th style={tableStyles.th}>Notes</th>
              <th style={{ ...tableStyles.th, width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {forecasts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...tableStyles.td,
                    color: colors.textMuted,
                    textAlign: 'center',
                    padding: '24px 16px',
                  }}
                >
                  No forecasts yet. Forecasts are anticipated future costs that feed FFC on the Dashboard and Budget tabs.
                </td>
              </tr>
            )}
            {forecasts.map((f) => (
              <tr
                key={f.id}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = colors.accentRow)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <td style={{ ...tableStyles.td, cursor: 'pointer' }} onClick={() => openEdit(f)}>
                  {f.title}
                </td>
                <td style={{ ...tableStyles.td, color: colors.textMuted, fontSize: 13 }}>
                  {budgetLineLabel(f.budget_line_id)}
                </td>
                <td style={{ ...tableStyles.td, ...tableStyles.numeric, fontWeight: 600 }}>
                  {formatMoney(f.amount)}
                </td>
                <td
                  style={{
                    ...tableStyles.td,
                    color: colors.textMuted,
                    fontSize: 13,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={f.notes}
                >
                  {f.notes || '—'}
                </td>
                <td style={{ ...tableStyles.td, width: 44, textAlign: 'right' }}>
                  <DropdownMenu
                    items={[
                      { icon: '✏️', label: 'Edit Forecast', accent: true, onClick: () => openEdit(f) },
                      {
                        icon: '🗑️',
                        label: 'Delete Forecast',
                        danger: true,
                        onClick: () => {
                          if (window.confirm(`Delete forecast "${f.title}"?`))
                            onDelete(f.id);
                        },
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {forecasts.length > 0 && (
              <tr style={{ background: colors.accentRow }}>
                <td
                  colSpan={2}
                  style={{
                    ...tableStyles.td,
                    fontWeight: 600,
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: colors.textMuted,
                  }}
                >
                  Total Forecasts
                </td>
                <td
                  style={{
                    ...tableStyles.td,
                    ...tableStyles.numeric,
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(total)}
                </td>
                <td colSpan={2} style={tableStyles.td} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'right', fontSize: 13, color: colors.textMuted, marginTop: 8, paddingRight: 4 }}>
        Total Rows: {forecasts.length}
      </div>

      {editing && (
        <Modal
          title={editing.mode === 'new' ? 'Add Forecast' : 'Edit Forecast'}
          onClose={close}
          onSubmit={save}
          submitLabel={editing.mode === 'new' ? 'Add' : 'Save'}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Description">
              <input
                style={input}
                value={editing.data.title}
                onChange={(e) => onField('title', e.target.value)}
                placeholder="e.g. Anticipated facade remediation"
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
            <Field label="Amount (AUD)">
              <input
                style={input}
                type="number"
                step="1000"
                value={editing.data.amount}
                onChange={(e) => onField('amount', e.target.value)}
                required
              />
            </Field>
            <Field label="Notes">
              <textarea
                style={{ ...input, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
                value={editing.data.notes}
                onChange={(e) => onField('notes', e.target.value)}
                placeholder="Context or justification..."
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
