import React, { useState } from 'react';
import { colors, btn, tableStyles, input } from '../styles.js';
import { formatMoney } from '../utils/format.js';
import {
  budgetLineEffectiveBudget,
  budgetCommitted,
  budgetApprovedVars,
  budgetUncommitted,
} from '../utils/calc.js';
import Modal from './Modal.jsx';
import { Field, TabToolbar } from './FormShared.jsx';

const emptyLine = {
  code: '',
  title: '',
  original_amount: 0,
  group_id: '',
};

export default function BudgetTab({
  budgetLines,
  budgetGroups,
  contracts,
  variations,
  onSave,
  onDelete,
}) {
  const [editing, setEditing] = useState(null);

  const openNew = () =>
    setEditing({
      mode: 'new',
      data: {
        ...emptyLine,
        group_id: budgetGroups[0]?.id || '',
      },
    });
  const openEdit = (line) =>
    setEditing({
      mode: 'edit',
      data: {
        id: line.id,
        code: line.code || '',
        title: line.title || '',
        original_amount: line.original_amount ?? 0,
        group_id: line.group_id,
      },
    });
  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({
      ...d,
      original_amount: Number(d.original_amount) || 0,
    });
    close();
  };

  const onField = (field, value) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [field]: value } }));

  return (
    <div>
      <TabToolbar title="Budget Lines" onAdd={openNew} />

      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Code</th>
              <th style={tableStyles.th}>Description</th>
              <th style={tableStyles.th}>Group</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Original Budget</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Committed</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Approved Vars</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Uncommitted</th>
              <th style={{ ...tableStyles.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {budgetLines.map((line) => {
              const effective = budgetLineEffectiveBudget(line);
              const committed = budgetCommitted(line, contracts);
              const approved = budgetApprovedVars(line, variations);
              const uncommitted = budgetUncommitted(line, contracts);
              const groupLabel =
                line.group?.title ||
                budgetGroups.find((g) => g.id === line.group_id)?.title ||
                '—';
              return (
                <tr
                  key={line.id}
                  style={tableStyles.tr}
                  onClick={() => openEdit(line)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tableStyles.td}>{line.code || '—'}</td>
                  <td style={tableStyles.td}>{line.title}</td>
                  <td style={{ ...tableStyles.td, color: colors.textMuted }}>{groupLabel}</td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(effective)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(committed)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(approved)}
                  </td>
                  <td
                    style={{
                      ...tableStyles.td,
                      ...tableStyles.numeric,
                      color: uncommitted < 0 ? colors.negative : colors.text,
                      fontWeight: uncommitted < 0 ? 600 : 400,
                    }}
                  >
                    {formatMoney(uncommitted)}
                  </td>
                  <td style={{ ...tableStyles.td, width: 40, textAlign: 'right' }}>
                    <button
                      style={btn.danger}
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete budget line "${line.title}"?`)) {
                          onDelete(line.id);
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
          title={editing.mode === 'new' ? 'New Budget Line' : 'Edit Budget Line'}
          onClose={close}
          onSubmit={save}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Cost Code">
              <input
                style={input}
                value={editing.data.code}
                onChange={(e) => onField('code', e.target.value)}
                placeholder="e.g. 03-100"
              />
            </Field>
            <Field label="Description">
              <input
                style={input}
                value={editing.data.title}
                onChange={(e) => onField('title', e.target.value)}
                required
              />
            </Field>
            <Field label="Group">
              <select
                style={input}
                value={editing.data.group_id}
                onChange={(e) => onField('group_id', e.target.value)}
                required
              >
                {budgetGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.category?.title ? `${g.category.title} → ` : ''}
                    {g.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Original Budget (AUD)">
              <input
                style={input}
                type="number"
                min="0"
                step="1000"
                value={editing.data.original_amount}
                onChange={(e) => onField('original_amount', e.target.value)}
                required
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
