import React, { useEffect } from 'react';
import { colors, btn } from '../styles.js';

export default function Modal({ title, onClose, onSubmit, submitLabel = 'Save', children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 22, 28, 0.45)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 16px 24px',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 540,
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 20px 40px rgba(10, 12, 18, 0.18)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: colors.textMuted,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div style={{ padding: '20px 22px' }}>{children}</div>
          <div
            style={{
              padding: '14px 22px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: colors.accentRow,
            }}
          >
            <button type="button" onClick={onClose} style={btn.secondary}>
              Cancel
            </button>
            <button type="submit" style={btn.primary}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
