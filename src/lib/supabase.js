import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in development so missing env config doesn't silently
  // fall through to a broken "forever loading" state.
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
