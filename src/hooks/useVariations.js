import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

export function useVariations(projectId) {
  return useQuery({
    enabled: !!projectId,
    queryKey: qk.variations(projectId),
    queryFn: async () => {
      // Filter by contracts belonging to the active project.
      const { data, error } = await supabase
        .from('variations')
        .select('*, contract:contracts!inner(id, title, project_id)')
        .eq('contract.project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveVariation(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const fields = {
        contract_id: payload.contract_id,
        budget_line_id: payload.budget_line_id ?? null,
        reference: payload.reference ?? null,
        title: payload.title,
        description: payload.description ?? null,
        contract_variation_no:
          payload.contract_variation_no == null || payload.contract_variation_no === ''
            ? null
            : Number(payload.contract_variation_no),
        variation_no: payload.variation_no ?? null,
        vo_no: payload.vo_no ?? null,
        vpr_no: payload.vpr_no ?? null,
        clause: payload.clause ?? null,
        status: payload.status || 'Pending',
        category: payload.category ?? null,
        date_received: payload.date_received || null,
        date_approved: payload.date_approved || null,
        date_rejected: payload.date_rejected || null,
        requested_amount:
          payload.requested_amount == null || payload.requested_amount === ''
            ? null
            : Number(payload.requested_amount),
        variation_amount: Number(payload.variation_amount) || 0,
        tax_percent: payload.tax_percent != null ? Number(payload.tax_percent) : 10,
        approved_by: payload.approved_by ?? null,
        days_claimed:
          payload.days_claimed == null || payload.days_claimed === ''
            ? null
            : Number(payload.days_claimed),
        days_approved:
          payload.days_approved == null || payload.days_approved === ''
            ? null
            : Number(payload.days_approved),
        notes: payload.notes ?? null,
      };

      if (payload.id) {
        const { data, error } = await supabase
          .from('variations')
          .update(fields)
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('variations')
        .insert(fields)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.variations(projectId) });
      // Variations feed contract revised sums + dashboard roll-ups.
      qc.invalidateQueries({ queryKey: qk.contracts(projectId) });
    },
  });
}

export function useDeleteVariation(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('variations').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.variations(projectId) });
      qc.invalidateQueries({ queryKey: qk.contracts(projectId) });
    },
  });
}
