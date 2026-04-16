import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: log what the build baked in so we can diagnose env var issues.
// Remove this block once auth is confirmed working.
// eslint-disable-next-line no-console
console.log('[supabase] config →', {
  url: url || '(empty)',
  keyPrefix: anonKey ? anonKey.slice(0, 20) + '…' : '(empty)',
  keyLength: anonKey ? anonKey.length : 0,
  email: import.meta.env.VITE_ALLOWED_EMAIL || '(empty)',
  allKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
});

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env.local and fill in the values from your ' +
      'Supabase project (see docs/supabase-setup.md).'
  );
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL || '';
