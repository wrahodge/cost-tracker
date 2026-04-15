import React, { useState } from 'react';
import { colors, btn, tableStyles, input, badge, badgeToneForStatus } from '../styles.js';
import { formatMoney, formatDate } from '../utils/format.js';
import { paymentRetention, paymentNetPayable } from '../utils/calc.js';
import Modal from './Modal.jsx';
import { Field, TabToolbar } from './FormShared.jsx';

const STATUSES = ['Draft', 'Certified', 'Paid'];

const empty = {
  contractId: '',
  reference: '',
  claimAmount: 0,
  certifiedAmount: 0,
  date: new Date().toISOString().slice(0, 10),
  status: 'Draft',
};

export default function PaymentsTab({ contracts, payments, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);

  const openNew = () =>
    setEditing({
      mode: 'new',
      data: { ...empty, contractId: contracts[0]?.id || '' },
    });
  const openEdit = (p) => setEditing({ mode: 'edit', data: { ...p } });
  const close = () => setEditing(null);

  const save = () => {
    const d = editing.data;
    onSave({
      ...d,
      claimAmount: Number(d.claimAmount) || 0,
      certifiedAmount: Number(d.certifiedAmount) || 0,
    });
    close();
  };

  const onField = (f, v) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [f]: v } }));

  const contractFor = (id) => contracts.find((c) => c.id === id);

  return (
    <div>
      <TabToolbar title="Payment Certificates" onAdd={openNew} />

      <div style={tableStyles.wrapper}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Ref</th>
              <th style={tableStyles.th}>Contract</th>
              <th style={tableStyles.th}>Date</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Claimed</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Certified</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Retention</th>
              <th style={{ ...tableStyles.th, ...tableStyles.numeric }}>Net Payable</th>
              <th style={tableStyles.th}>Status</th>
              <th style={{ ...tableStyles.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const contract = contractFor(p.contractId);
              const retention = paymentRetention(p, contract);
              const net = paymentNetPayable(p, contract);
              return (
                <tr
                  key={p.id}
                  style={tableStyles.tr}
                  onClick={() => openEdit(p)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tableStyles.td}>{p.reference}</td>
                  <td style={tableStyles.td}>
                    {contract ? `${contract.reference} — ${contract.contractor}` : '—'}
                  </td>
                  <td style={tableStyles.td}>{formatDate(p.date)}</td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(p.claimAmount)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(p.certifiedAmount)}
                  </td>
                  <td style={{ ...tableStyles.td, ...tableStyles.numeric }}>
                    {formatMoney(retention)}
                  </td>
                  <td
                    style={{
                      ...tableStyles.td,
                      ...tableStyles.numeric,
                      fontWeight: 600,
                    }}
                  >
                    {formatMoney(net)}
                  </td>
                  <td style={tableStyles.td}>
                    <span style={badge(badgeToneForStatus(p.status))}>{p.status}</span>
                  </td>
                  <td style={{ ...tableStyles.td, width: 40, textAlign: 'right' }}>
                    <button
                      style={btn.danger}
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete payment certificate ${p.reference}?`)) {
                          onDelete(p.id);
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
          title={editing.mode === 'new' ? 'New Payment Certificate' : 'Edit Payment Certificate'}
          onClose={close}
          onSubmit={save}
        >
          <PaymentForm
            data={editing.data}
            contracts={contracts}
            onField={onField}
          />
        </Modal>
      )}
    </div>
  );
}

function PaymentForm({ data, contracts, onField }) {
  const contract = contracts.find((c) => c.id === data.contractId);
  const retention = paymentRetention(data, contract);
  const net = paymentNetPayable(data, contract);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Field label="Reference">
        <input
          style={input}
          value={data.reference}
          onChange={(e) => onField('reference', e.target.value)}
          required
        />
      </Field>
      <Field label="Contract">
        <select
          style={input}
          value={data.contractId}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Claim Amount (AUD)">
          <input
            style={input}
            type="number"
            min="0"
            step="100"
            value={data.claimAmount}
            onChange={(e) => onField('claimAmount', e.target.value)}
            required
          />
        </Field>
        <Field label="Certified Amount (AUD)">
          <input
            style={input}
            type="number"
            min="0"
            step="100"
            value={data.certifiedAmount}
            onChange={(e) => onField('certifiedAmount', e.target.value)}
            required
          />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Date">
          <input
            style={input}
            type="date"
            value={data.date}
            onChange={(e) => onField('date', e.target.value)}
          />
        </Field>
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
      </div>
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          color: colors.textMuted,
        }}
      >
        <div>
          Retention ({((contract?.retentionPct || 0) * 100).toFixed(1)}%):{' '}
          <strong style={{ color: colors.text }}>{formatMoney(retention)}</strong>
        </div>
        <div>
          Net payable:{' '}
          <strong style={{ color: colors.text }}>{formatMoney(net)}</strong>
        </div>
      </div>
    </div>
  );
}
