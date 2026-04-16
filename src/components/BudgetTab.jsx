import React, { useState, useMemo } from 'react';
import { colors, btn, tableStyles, input } from '../styles.js';
import { formatMoney } from '../utils/format.js';
import {
  budgetLineEffectiveBudget,
  budgetCommitted,
  budgetApprovedVars,
  budgetUncommitted,
  budgetForecastTotal,
  budgetLineFFC,
  budgetLineVariance,
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
  budgetCategories,
  contracts,
  variations,
  forecasts,
  onSave,
  onDelete,
}) {
  const [editing, setEditing] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const toggle = (id) =>
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // Build the tree: category → group → line
  const tree = useMemo(() => {
    return (budgetCategories || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => {
        const groups = (budgetGroups || [])
          .filter((g) => {
            const catId = g.category_id || g.category?.id;
            return catId === cat.id;
          })
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((grp) => {
            const lines = budgetLines
              .filter((l) => l.group_id === grp.id)
              .sort((a, b) => a.sort_order - b.sort_order);
            return { ...grp, lines };
          });
        return { ...cat, groups };
      });
  }, [budgetCategories, budgetGroups, budgetLines]);

  const openNew = () =>
    setEditing({
      mode: 'new',
      data: { ...emptyLine, group_id: budgetGroups[0]?.id || '' },
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
    onSave({ ...editing.data, original_amount: Number(editing.data.original_amount) || 0 });
    close();
  };
  const onField = (field, value) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [field]: value } }));

  // Subtotals for a group
  const groupSubtotals = (lines) => {
    let budget = 0, committed = 0, approved = 0, uncommitted = 0, ffc = 0, variance = 0;
    for (const line of lines) {
      budget += budgetLineEffectiveBudget(line);
      committed += budgetCommitted(line, contracts);
      approved += budgetApprovedVars(line, variations);
      uncommitted += budgetUncommitted(line, contracts);
      ffc += budgetLineFFC(line, contracts, variations, forecasts || []);
      variance += budgetLineVariance(line, contracts, variations, forecasts || []);
    }
    return { budget, committed, approved, uncommitted, ffc, variance };
  };

  // Subtotals for a category
  const categorySubtotals = (groups) => {
    let budget = 0, committed = 0, approved = 0, uncommitted = 0, ffc = 0, variance = 0;
    for (const grp of groups) {
      const s = groupSubtotals(grp.lines);
      budget += s.budget;
      committed += s.committed;
      approved += s.approved;
      uncommitted += s.uncommitted;
      ffc += s.ffc;
      variance += s.variance;
    }
    return { budget, committed, approved, uncommitted, ffc, variance };
  };

  return (
    <div>
      <TabToolbar title="Budget" onAdd={openNew} />

      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={{ ...tableStyles.th, width: 40 }}></th>
              <th style={tableStyles.th}>Code</th>
              <th style={tableStyles.th}>Description</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Budget</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Committed</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Approved Vars</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>FFC</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Variance</th>
              <th style={{ ...tableStyles.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {tree.map((cat) => {
              const catCollapsed = collapsed[cat.id];
              const catSub = categorySubtotals(cat.groups);
              return (
                <React.Fragment key={cat.id}>
                  {/* Category row */}
                  <tr
                    style={{ background: '#eef0f3', cursor: 'pointer' }}
                    onClick={() => toggle(cat.id)}
                  >
                    <td style={{ ...tableStyles.td, width: 40, borderBottom: 'none' }}>
                      <Chevron open={!catCollapsed} />
                    </td>
                    <td style={{ ...tableStyles.td, borderBottom: 'none' }} />
                    <td
                      style={{
                        ...tableStyles.td,
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        borderBottom: 'none',
                      }}
                    >
                      {cat.title}
                    </td>
                    <SubtotalCells sub={catSub} bold />
                    <td style={{ ...tableStyles.td, borderBottom: 'none' }} />
                  </tr>

                  {!catCollapsed &&
                    cat.groups.map((grp) => {
                      const grpCollapsed = collapsed[grp.id];
                      const grpSub = groupSubtotals(grp.lines);
                      return (
                        <React.Fragment key={grp.id}>
                          {/* Group row */}
                          <tr
                            style={{ background: '#f5f6f8', cursor: 'pointer' }}
                            onClick={() => toggle(grp.id)}
                          >
                            <td style={{ ...tableStyles.td, width: 40, paddingLeft: 28 }}>
                              <Chevron open={!grpCollapsed} />
                            </td>
                            <td style={tableStyles.td} />
                            <td
                              style={{
                                ...tableStyles.td,
                                fontWeight: 600,
                                fontSize: 13,
                                color: colors.textMuted,
                              }}
                            >
                              {grp.title}
                            </td>
                            <SubtotalCells sub={grpSub} />
                            <td style={tableStyles.td} />
                          </tr>

                          {!grpCollapsed &&
                            grp.lines.map((line) => {
                              const effective = budgetLineEffectiveBudget(line);
                              const committed = budgetCommitted(line, contracts);
                              const approved = budgetApprovedVars(line, variations);
                              const uncommitted = budgetUncommitted(line, contracts);
                              const ffc = budgetLineFFC(line, contracts, variations, forecasts || []);
                              const vari = budgetLineVariance(line, contracts, variations, forecasts || []);
                              return (
                                <tr
                                  key={line.id}
                                  style={{ ...tableStyles.tr, cursor: 'pointer' }}
                                  onClick={() => openEdit(line)}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = colors.accentRow)
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = 'transparent')
                                  }
                                >
                                  <td style={{ ...tableStyles.td, width: 40 }} />
                                  <td style={{ ...tableStyles.td, paddingLeft: 56, color: colors.textMuted, fontSize: 13 }}>
                                    {line.code || '—'}
                                  </td>
                                  <td style={tableStyles.td}>{line.title}</td>
                                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                                    {formatMoney(effective)}
                                  </td>
                                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                                    {formatMoney(committed)}
                                  </td>
                                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                                    {formatMoney(approved)}
                                  </td>
                                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                                    {formatMoney(ffc)}
                                  </td>
                                  <td
                                    style={{
                                      ...tableStyles.td,
                                      ...tableStyles.numeric,
                                      color: vari < 0 ? colors.negative : colors.positive,
                                      fontWeight: vari < 0 ? 600 : 400,
                                    }}
                                  >
                                    {formatMoney(vari)}
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
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
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
                {(budgetGroups || []).map((g) => (
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

function Chevron({ open }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        color: colors.textMuted,
        transition: 'transform 0.15s',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      }}
    >
      ▶
    </span>
  );
}

function SubtotalCells({ sub, bold }) {
  const style = {
    ...tableStyles.td,
    ...tableStyles.numeric,
    fontWeight: bold ? 700 : 600,
    fontSize: 13,
    borderBottom: 'none',
  };
  return (
    <>
      <td style={style}>{formatMoney(sub.budget)}</td>
      <td style={style}>{formatMoney(sub.committed)}</td>
      <td style={style}>{formatMoney(sub.approved)}</td>
      <td style={style}>{formatMoney(sub.ffc)}</td>
      <td
        style={{
          ...style,
          color: sub.variance < 0 ? colors.negative : colors.positive,
        }}
      >
        {formatMoney(sub.variance)}
      </td>
    </>
  );
}
