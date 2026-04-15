import React from 'react';
import { colors } from '../styles.js';

const TABS = ['Dashboard', 'Budget', 'Contracts', 'Variations', 'Payments'];

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
          gap: 4,
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
                padding: '16px 18px 14px',
                fontSize: 14,
                fontWeight: 600,
                color: isActive ? colors.text : colors.textMuted,
                cursor: 'pointer',
                borderBottom: `3px solid ${isActive ? colors.gold : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
