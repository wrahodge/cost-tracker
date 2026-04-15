import React from 'react';
import { btn, label as labelStyle } from '../styles.js';

export function Field({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

export function TabToolbar({ title, onAdd }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{title}</h1>
      <button style={btn.primary} onClick={onAdd}>
        + Add
      </button>
    </div>
  );
}
