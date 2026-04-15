import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

// Stub for Sprint 2. The table + RLS policy exist; no UI yet.
export function useForecasts(projectId) {
  return useQuery({
    enabled: !!projectId,
    queryKey: qk.forecasts(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forecasts')
        .select('*, budget_line:budget_lines!inner(id, title, group:budget_groups!inner(category:budget_categories!inner(project_id)))')
        .eq('budget_line.group.category.project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });
}
