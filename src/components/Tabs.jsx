import React from 'react';
import { colors } from '../styles.js';

const TABS = ['Overall', 'Budget', 'Contracts', 'Variations', 'Forecasts', 'Payments', 'Dashboard', 'Cost Report'];

export default function Tabs({ active, onChange }) {
  return (
    <nav
      style={{
        background: '#fff',
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          gap: 0,
        }}
      >
        {TABS.map((t) => {
          const isActive = t === active;
          return (
            <button
              key={t}
              onClick={() => onChange(t)}
              style={{
                background: 'none',
                border: 'none',
                padding: '14px 20px 12px',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? colors.text : colors.textMuted,
                cursor: 'pointer',
                borderBottom: `3px solid ${isActive ? colors.blue : 'transparent'}`,
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {t === 'Budget' ? (
                <span>Budgets <span style={{ fontSize: 10, verticalAlign: 'middle' }}>▼</span></span>
              ) : t}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
