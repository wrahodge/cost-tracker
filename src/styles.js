// Shared inline style objects. Intentionally small — colour palette first,
// then component-level snippets that get imported by multiple tabs.

export const colors = {
  headerBg: '#1a1d23',
  headerText: '#f5f6f8',
  gold: '#d4a017',
  pageBg: '#f5f6f8',
  card: '#ffffff',
  border: '#e4e6eb',
  borderStrong: '#c9ccd3',
  text: '#1a1d23',
  textMuted: '#6b7280',
  textSubtle: '#9ca3af',
  negative: '#c0392b',
  positive: '#1f8a5c',
  pending: '#b08500',
  accentRow: '#fafbfc',
};

export const page = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '24px 32px 48px',
};

export const card = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: '18px 20px',
};

export const sectionTitle = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  color: colors.textMuted,
  marginBottom: 12,
};

export const tableStyles = {
  wrapper: {
    ...card,
    padding: 0,
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.accentRow,
  },
  td: {
    padding: '14px 16px',
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text,
  },
  tr: {
    cursor: 'pointer',
  },
  numeric: {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
};

export const btn = {
  primary: {
    background: colors.headerBg,
    color: colors.headerText,
    border: 'none',
    borderRadius: 6,
    padding: '9px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondary: {
    background: '#ffffff',
    color: colors.text,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 6,
    padding: '9px 16px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  danger: {
    background: 'transparent',
    color: colors.textSubtle,
    border: 'none',
    padding: '4px 8px',
    fontSize: 16,
    cursor: 'pointer',
    borderRadius: 4,
  },
};

export const input = {
  width: '100%',
  padding: '9px 11px',
  fontSize: 14,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 6,
  background: '#fff',
  color: colors.text,
  outline: 'none',
};

export const label = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: colors.textMuted,
  marginBottom: 6,
};

export const badge = (tone = 'neutral') => {
  const map = {
    neutral: { bg: '#eef0f3', fg: colors.textMuted },
    positive: { bg: '#e5f4ec', fg: colors.positive },
    negative: { bg: '#fae8e5', fg: colors.negative },
    pending: { bg: '#fbf1d9', fg: colors.pending },
    info: { bg: '#e7edf7', fg: '#2b4b8c' },
  };
  const c = map[tone] || map.neutral;
  return {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: c.bg,
    color: c.fg,
  };
};

export function badgeToneForStatus(status) {
  switch (status) {
    case 'Approved':
    case 'Paid':
    case 'Active':
      return 'positive';
    case 'Rejected':
      return 'negative';
    case 'Pending':
    case 'Draft':
      return 'pending';
    case 'Certified':
      return 'info';
    default:
      return 'neutral';
  }
}
