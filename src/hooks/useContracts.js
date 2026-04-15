import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

// Returns contracts with nested sections and milestones. Milestones
// include their budget_line_id so the UI can derive contract sums and
// show budget-line names without a second query.
export function useContracts(projectId) {
  return useQuery({
    enabled: !!projectId,
    queryKey: qk.contracts(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(
          `*,
           contract_sections(id, title, sort_order),
           contract_milestones(id, contract_id, section_id, budget_line_id, title, original_value, status, sort_order)`
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Sprint 1 shim: one section + one milestone per contract. Sprint 2
// replaces this with a richer editor that supports multi-section /
// multi-milestone contracts.
export function useSaveContract(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const {
        id,
        title,
        reference,
        vendor,
        status,
        retention_pct,
        contract_standard,
        date_approved,
        // Shim: single-milestone fields
        budget_line_id,
        original_value,
      } = payload;

      const contractFields = {
        project_id: projectId,
        title,
        reference: reference ?? null,
        vendor: vendor ?? title,
        status: status || 'Pending',
        retention_pct: Number(retention_pct) || 0,
        contract_standard: contract_standard ?? null,
        date_approved: date_approved || null,
      };

      let contractId = id;

      if (id) {
        const { error } = await supabase
          .from('contracts')
          .update(contractFields)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('contracts')
          .insert(contractFields)
          .select('id')
          .single();
        if (error) throw error;
        contractId = created.id;

        // Auto-create the single "Main" section + milestone.
        const { data: section, error: secErr } = await supabase
          .from('contract_sections')
          .insert({ contract_id: contractId, title: 'Main', sort_order: 1 })
          .select('id')
          .single();
        if (secErr) throw secErr;

        const { error: mErr } = await supabase.from('contract_milestones').insert({
          contract_id: contractId,
          section_id: section.id,
          budget_line_id,
          title: 'Main',
          original_value: Number(original_value) || 0,
          status: 'Approved',
          sort_order: 1,
        });
        if (mErr) throw mErr;

        return contractId;
      }

      // For updates we may also need to sync the shim milestone
      // (edit original sum / budget line). Find the first milestone
      // and update it.
      const { data: milestones, error: mFetchErr } = await supabase
        .from('contract_milestones')
        .select('id')
        .eq('contract_id', contractId)
        .order('sort_order')
        .limit(1);
      if (mFetchErr) throw mFetchErr;

      if (milestones && milestones.length > 0) {
        const { error: mUpdErr } = await supabase
          .from('contract_milestones')
          .update({
            budget_line_id,
            original_value: Number(original_value) || 0,
          })
          .eq('id', milestones[0].id);
        if (mUpdErr) throw mUpdErr;
      }

      return contractId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.contracts(projectId) });
    },
  });
}

export function useDeleteContract(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.contracts(projectId) });
      qc.invalidateQueries({ queryKey: qk.variations(projectId) });
      qc.invalidateQueries({ queryKey: qk.payments(projectId) });
    },
  });
}
