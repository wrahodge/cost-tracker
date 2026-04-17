import React from 'react';
import { colors } from '../styles.js';

export default function Header({ projectName }) {
  return (
    <header
      style={{
        background: colors.headerBg,
        color: colors.headerText,
        padding: '14px 32px',
        borderBottom: '1px solid #000',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              ess
            </span>
            <span style={{
              fontSize: 24,
              fontWeight: 800,
              color: colors.gold,
              letterSpacing: -0.5,
            }}>
              e
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              nce
            </span>
          </div>
          <div style={{ width: 1, height: 28, background: '#3a3d44', margin: '0 6px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: colors.textSubtle }}>🔍</span>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{projectName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
