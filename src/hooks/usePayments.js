import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

export function usePayments(projectId) {
  return useQuery({
    enabled: !!projectId,
    queryKey: qk.payments(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_claims')
        .select('*, contract:contracts!inner(id, title, project_id, retention_pct)')
        .eq('contract.project_id', projectId)
        .order('contract_id')
        .order('contract_payment_no', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSavePayment(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const fields = {
        contract_id: payload.contract_id,
        reference: payload.reference ?? null,
        title: payload.title ?? payload.reference ?? null,
        contract_payment_no: payload.contract_payment_no ?? null,
        status: payload.status || 'Draft',
        claim_amount: Number(payload.claim_amount) || 0,
        submitted_amount:
          payload.submitted_amount == null || payload.submitted_amount === ''
            ? null
            : Number(payload.submitted_amount),
        certified_amount: Number(payload.certified_amount) || 0,
        retention_amount: Number(payload.retention_amount) || 0,
        period_from: payload.period_from || null,
        period_to: payload.period_to || null,
        month: payload.month ?? null,
        date: payload.date || null,
      };

      if (payload.id) {
        const { data, error } = await supabase
          .from('payment_claims')
          .update(fields)
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('payment_claims')
        .insert(fields)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.payments(projectId) });
      qc.invalidateQueries({ queryKey: qk.contracts(projectId) });
    },
  });
}

export function useDeletePayment(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('payment_claims').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.payments(projectId) });
      qc.invalidateQueries({ queryKey: qk.contracts(projectId) });
    },
  });
}
