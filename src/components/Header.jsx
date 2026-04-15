import React from 'react';
import { colors } from '../styles.js';

export default function Header({ projectName }) {
  return (
    <header
      style={{
        background: colors.headerBg,
        color: colors.headerText,
        padding: '18px 32px',
        borderBottom: '1px solid #000',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: colors.gold,
            color: '#1a1d23',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif',
          }}
          aria-hidden
        >
          $
        </div>
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 0.2,
              lineHeight: 1.1,
            }}
          >
            {projectName}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginTop: 2,
            }}
          >
            Cost Control
          </div>
        </div>
      </div>
    </header>
  );
}
