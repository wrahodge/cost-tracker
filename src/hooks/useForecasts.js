import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

export function useForecasts(projectId) {
  return useQuery({
    enabled: !!projectId,
    queryKey: qk.forecasts(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forecasts')
        .select(
          '*, budget_line:budget_lines!inner(id, title, code, group:budget_groups!inner(category:budget_categories!inner(project_id)))'
        )
        .eq('budget_line.group.category.project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveForecast(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const fields = {
        budget_line_id: payload.budget_line_id,
        title: payload.title,
        amount: Number(payload.amount) || 0,
        notes: payload.notes ?? null,
      };

      if (payload.id) {
        const { data, error } = await supabase
          .from('forecasts')
          .update(fields)
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('forecasts')
        .insert(fields)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.forecasts(projectId) });
    },
  });
}

export function useDeleteForecast(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('forecasts').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.forecasts(projectId) });
    },
  });
}
