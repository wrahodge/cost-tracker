import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

// --- Queries ----------------------------------------------------------

export function useBudgetCategories(projectId) {
  return useQuery({
    enabled: !!projectId,
    queryKey: qk.budgetCategories(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgetGroups(projectId) {
  return useQuery({
    enabled: !!projectId,
    queryKey: qk.budgetGroups(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_groups')
        .select('*, category:budget_categories!inner(id, title, project_id, sort_order)')
        .eq('category.project_id', projectId)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgetLines(projectId) {
  return useQuery({
    enabled: !!projectId,
    queryKey: qk.budgetLines(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_lines')
        .select(
          '*, group:budget_groups!inner(id, title, sort_order, category:budget_categories!inner(id, title, project_id, sort_order))'
        )
        .eq('group.category.project_id', projectId)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// --- Mutations --------------------------------------------------------

export function useSaveBudgetLine(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (line) => {
      const payload = {
        group_id: line.group_id,
        code: line.code ?? null,
        title: line.title,
        original_amount: Number(line.original_amount) || 0,
        adjustments_in: Number(line.adjustments_in) || 0,
        adjustments_out: Number(line.adjustments_out) || 0,
        status: line.status ?? null,
        tag: line.tag ?? null,
        sort_order: line.sort_order ?? 0,
      };
      if (line.id) {
        const { data, error } = await supabase
          .from('budget_lines')
          .update(payload)
          .eq('id', line.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('budget_lines')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budgetLines(projectId) });
    },
  });
}

export function useDeleteBudgetLine(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('budget_lines').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      // Cascade may delete related milestones/variations, so invalidate
      // everything that could have referenced this row.
      qc.invalidateQueries({ queryKey: qk.budgetLines(projectId) });
      qc.invalidateQueries({ queryKey: qk.contracts(projectId) });
      qc.invalidateQueries({ queryKey: qk.variations(projectId) });
      qc.invalidateQueries({ queryKey: qk.forecasts(projectId) });
    },
  });
}
