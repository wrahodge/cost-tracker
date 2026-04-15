import React, { useState } from 'react';
import { colors, btn, input, label as labelStyle } from '../styles.js';
import { useAuth } from './useAuth.js';
import { allowedEmail } from '../lib/supabase.js';

// Blocks the app until the user is signed in with a magic link.
// Shows a single email input, pre-filled with VITE_ALLOWED_EMAIL so
// the one-user workflow is a single click.
export default function AuthGate({ children }) {
  const { session, loading, signInWithEmail } = useAuth();
  const [email, setEmail] = useState(allowedEmail || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  if (loading) {
    return <SplashMessage title="Loading…" />;
  }

  if (session) {
    return children;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const { error: err } = await signInWithEmail(email.trim());
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send magic link.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SplashShell>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>
        Cost Control
      </h1>
      <p
        style={{
          margin: '0 0 24px',
          fontSize: 14,
          color: colors.textMuted,
          lineHeight: 1.5,
        }}
      >
        Sign in with a magic link. Only the allowlisted email can access the app.
      </p>

      {sent ? (
        <div
          style={{
            padding: '14px 16px',
            background: '#e7edf7',
            border: '1px solid #c9d4e8',
            borderRadius: 8,
            fontSize: 14,
            color: '#2b4b8c',
          }}
        >
          Check your inbox for a sign-in link sent to <strong>{email}</strong>.
          Once you click it, this page will refresh and load your project.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>Email</div>
            <input
              style={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              autoFocus
            />
          </div>
          {error && (
            <div
              style={{
                marginBottom: 14,
                padding: '10px 12px',
                background: '#fae8e5',
                border: '1px solid #f2c4bd',
                borderRadius: 6,
                fontSize: 13,
                color: colors.negative,
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{ ...btn.primary, width: '100%' }}
            disabled={sending || !email.trim()}
          >
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </SplashShell>
  );
}

function SplashMessage({ title }) {
  return (
    <SplashShell>
      <div style={{ fontSize: 16, color: colors.textMuted }}>{title}</div>
    </SplashShell>
  );
}

function SplashShell({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.pageBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          padding: '32px 32px 28px',
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 10px 30px rgba(10, 12, 18, 0.08)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: colors.gold,
            color: colors.headerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          $
        </div>
        {children}
      </div>
    </div>
  );
}
