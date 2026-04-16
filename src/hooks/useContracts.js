import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

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

// Sprint 2: supports multiple milestones per contract.
// payload.milestones is an array of { id?, title, budget_line_id, original_value }.
// Existing milestones (with id) are updated; new ones (without id) are inserted;
// milestones removed from the array are deleted.
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
        milestones = [],
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
        // Update existing contract
        const { error } = await supabase
          .from('contracts')
          .update(contractFields)
          .eq('id', id);
        if (error) throw error;
      } else {
        // Insert new contract
        const { data: created, error } = await supabase
          .from('contracts')
          .insert(contractFields)
          .select('id')
          .single();
        if (error) throw error;
        contractId = created.id;

        // Create a default "Main" section for new contracts
        const { data: section, error: secErr } = await supabase
          .from('contract_sections')
          .insert({ contract_id: contractId, title: 'Main', sort_order: 1 })
          .select('id')
          .single();
        if (secErr) throw secErr;

        // Insert all milestones under the default section
        if (milestones.length > 0) {
          const rows = milestones.map((m, i) => ({
            contract_id: contractId,
            section_id: section.id,
            budget_line_id: m.budget_line_id,
            title: m.title || 'Milestone',
            original_value: Number(m.original_value) || 0,
            status: 'Approved',
            sort_order: i + 1,
          }));
          const { error: mErr } = await supabase
            .from('contract_milestones')
            .insert(rows);
          if (mErr) throw mErr;
        }

        return contractId;
      }

      // --- Sync milestones for existing contracts ---

      // Fetch current milestones from DB
      const { data: existing, error: fetchErr } = await supabase
        .from('contract_milestones')
        .select('id')
        .eq('contract_id', contractId);
      if (fetchErr) throw fetchErr;

      const existingIds = new Set((existing || []).map((m) => m.id));
      const payloadIds = new Set(milestones.filter((m) => m.id).map((m) => m.id));

      // Delete removed milestones
      const toDelete = [...existingIds].filter((id) => !payloadIds.has(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('contract_milestones')
          .delete()
          .in('id', toDelete);
        if (delErr) throw delErr;
      }

      // Fetch default section for inserts
      const { data: sections } = await supabase
        .from('contract_sections')
        .select('id')
        .eq('contract_id', contractId)
        .order('sort_order')
        .limit(1);
      const defaultSectionId = sections?.[0]?.id || null;

      // Upsert milestones
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        const fields = {
          contract_id: contractId,
          section_id: m.section_id || defaultSectionId,
          budget_line_id: m.budget_line_id,
          title: m.title || 'Milestone',
          original_value: Number(m.original_value) || 0,
          sort_order: i + 1,
        };

        if (m.id && existingIds.has(m.id)) {
          const { error: updErr } = await supabase
            .from('contract_milestones')
            .update(fields)
            .eq('id', m.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('contract_milestones')
            .insert({ ...fields, status: 'Approved' });
          if (insErr) throw insErr;
        }
      }

      return contractId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.contracts(projectId) });
      qc.invalidateQueries({ queryKey: qk.budgetLines(projectId) });
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
