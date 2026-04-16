import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

// ---------------------------------------------------------------------------
// Milestone line items
// ---------------------------------------------------------------------------

export function usePaymentLineItems(paymentId) {
  return useQuery({
    enabled: !!paymentId,
    queryKey: qk.paymentLineItems(paymentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_line_items')
        .select('*')
        .eq('payment_claim_id', paymentId)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSavePaymentLineItems(paymentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items) => {
      // Delete existing items, then insert fresh set
      const { error: delErr } = await supabase
        .from('payment_line_items')
        .delete()
        .eq('payment_claim_id', paymentId);
      if (delErr) throw delErr;

      if (!items || items.length === 0) return [];

      const rows = items.map((it) => ({
        payment_claim_id: paymentId,
        contract_milestone_id: it.contract_milestone_id,
        approved_value: Number(it.approved_value) || 0,
        this_payment: Number(it.this_payment) || 0,
        previous_total: Number(it.previous_total) || 0,
        percent_complete: Number(it.percent_complete) || 0,
        submitted_amount:
          it.submitted_amount == null || it.submitted_amount === ''
            ? null
            : Number(it.submitted_amount),
      }));

      const { data, error } = await supabase
        .from('payment_line_items')
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.paymentLineItems(paymentId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Variation line items
// ---------------------------------------------------------------------------

export function usePaymentVariationItems(paymentId) {
  return useQuery({
    enabled: !!paymentId,
    queryKey: qk.paymentVariationItems(paymentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_variation_items')
        .select('*')
        .eq('payment_claim_id', paymentId)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSavePaymentVariationItems(paymentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items) => {
      const { error: delErr } = await supabase
        .from('payment_variation_items')
        .delete()
        .eq('payment_claim_id', paymentId);
      if (delErr) throw delErr;

      if (!items || items.length === 0) return [];

      const rows = items.map((it) => ({
        payment_claim_id: paymentId,
        variation_id: it.variation_id,
        approved_value: Number(it.approved_value) || 0,
        this_payment: Number(it.this_payment) || 0,
        previous_total: Number(it.previous_total) || 0,
        percent_complete: Number(it.percent_complete) || 0,
        submitted_amount:
          it.submitted_amount == null || it.submitted_amount === ''
            ? null
            : Number(it.submitted_amount),
      }));

      const { data, error } = await supabase
        .from('payment_variation_items')
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.paymentVariationItems(paymentId) });
    },
  });
}
