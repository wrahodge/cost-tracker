import React, { useState } from 'react';
import { colors, btn, tableStyles, input } from '../styles.js';
import { formatMoney } from '../utils/format.js';
import {
  budgetCommitted,
  budgetApprovedVars,
  budgetUncommitted,
} from '../utils/calc.js';
import Modal from './Modal.jsx';
import { Field, TabToolbar } from './FormShared.jsx';

const emptyLine = { code: '', description: '', originalBudget: 0 };

export default function BudgetTab({ budgetLines, contracts, variations, onSave, onDelete }) {
  const [editing, setEditing] = useState(null); // null | 'new' | budgetLine

  const openNew = () => setEditing({ mode: 'new', data: { ...emptyLine } });
  const openEdit = (line) => setEditing({ mode: 'edit', data: { ...line } });
  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    const payload = {
      ...d,
      originalBudget: Number(d.originalBudget) || 0,
    };
    onSave(payload);
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
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Original Budget</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Committed</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Approved Vars</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Uncommitted</th>
              <th style={{ ...tableStyles.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {budgetLines.map((line) => {
              const committed = budgetCommitted(line, contracts);
              const approved = budgetApprovedVars(line, contracts, variations);
              const uncommitted = budgetUncommitted(line, contracts);
              return (
                <tr
                  key={line.id}
                  style={tableStyles.tr}
                  onClick={() => openEdit(line)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tableStyles.td}>{line.code}</td>
                  <td style={tableStyles.td}>{line.description}</td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(line.originalBudget)}
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
                        if (window.confirm(`Delete budget line "${line.description}"?`)) {
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
                required
              />
            </Field>
            <Field label="Description">
              <input
                style={input}
                value={editing.data.description}
                onChange={(e) => onField('description', e.target.value)}
                required
              />
            </Field>
            <Field label="Original Budget (AUD)">
              <input
                style={input}
                type="number"
                min="0"
                step="1000"
                value={editing.data.originalBudget}
                onChange={(e) => onField('originalBudget', e.target.value)}
                required
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

