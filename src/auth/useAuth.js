import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

// Thin wrapper around supabase.auth with a React-friendly session state.
// AuthGate consumes this; feature code should never call supabase.auth
// directly, so auth plumbing can evolve in one place.
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signInWithEmail(email) {
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    signInWithEmail,
    signOut,
  };
}
