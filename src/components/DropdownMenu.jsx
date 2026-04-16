import React, { useState, useEffect, useRef } from 'react';
import { colors, btn } from '../styles.js';

// Reusable three-dot (⋯) dropdown menu. Click the trigger to open,
// click outside or press Escape to close.
export default function DropdownMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          color: colors.textMuted,
          padding: '4px 8px',
          borderRadius: 4,
          lineHeight: 1,
        }}
        title="Actions"
      >
        ⋯
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            background: '#fff',
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(10, 12, 18, 0.12)',
            zIndex: 20,
            minWidth: 180,
            overflow: 'hidden',
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '11px 16px',
                border: 'none',
                background: 'transparent',
                fontSize: 14,
                color: item.danger ? colors.negative : colors.text,
                cursor: 'pointer',
                textAlign: 'left',
                borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentRow)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {item.icon && <span style={{ fontSize: 16 }}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
