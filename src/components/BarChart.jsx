import React from 'react';
import { colors } from '../styles.js';
import { formatMoney } from '../utils/format.js';

// Minimal grouped/stacked SVG bar chart — no deps.
// props:
//   data: [{ label, values: [{ key, value, color }] }]
//   mode: 'grouped' | 'progress'
//     grouped — values render side by side per row
//     progress — a single bar with a filled portion (values[0] filled, values[1] total)
//   maxValue: optional explicit cap (otherwise inferred)

export default function BarChart({ data, mode = 'grouped', maxValue }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>
    );
  }

  const cap =
    maxValue ??
    Math.max(
      ...data.flatMap((d) => d.values.map((v) => v.value)),
      1
    );

  const rowHeight = 34;
  const labelWidth = 170;
  const rightPad = 110;

  return (
    <div style={{ width: '100%' }}>
      {data.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: rowHeight,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: labelWidth,
              paddingRight: 12,
              fontSize: 12,
              color: colors.text,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={row.label}
          >
            {row.label}
          </div>
          <div style={{ flex: 1, position: 'relative', height: rowHeight - 8 }}>
            {mode === 'grouped' ? (
              <GroupedBars values={row.values} cap={cap} />
            ) : (
              <ProgressBar values={row.values} />
            )}
          </div>
          <div
            style={{
              width: rightPad,
              textAlign: 'right',
              fontSize: 12,
              color: colors.textMuted,
              fontVariantNumeric: 'tabular-nums',
              paddingLeft: 10,
            }}
          >
            {row.rightLabel}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupedBars({ values, cap }) {
  const inner = 4;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: inner,
        height: '100%',
        background: '#f1f3f6',
        borderRadius: 4,
        padding: 3,
      }}
    >
      {values.map((v, idx) => {
        const pct = Math.max(0, Math.min(1, v.value / cap));
        return (
          <div
            key={idx}
            style={{
              position: 'relative',
              height: `calc(${100 / values.length}% - ${inner / values.length}px)`,
            }}
            title={`${v.key}: ${formatMoney(v.value)}`}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct * 100}%`,
                minWidth: 2,
                background: v.color,
                borderRadius: 3,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ values }) {
  const [filled, total] = values;
  const cap = Math.max(total?.value || 0, 1);
  const pct = Math.max(0, Math.min(1, (filled?.value || 0) / cap));
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        background: '#f1f3f6',
        borderRadius: 4,
        overflow: 'hidden',
      }}
      title={`${formatMoney(filled?.value || 0)} of ${formatMoney(total?.value || 0)}`}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct * 100}%`,
          background: filled?.color || colors.gold,
        }}
      />
    </div>
  );
}
