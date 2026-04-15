import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { qk } from '../lib/queryClient.js';

// Sprint 1 is single-project. This hook returns the first project it
// finds, which will be Harbour View Apartments from the seed. Sprint 2
// introduces a project picker and this becomes useProjects(list) +
// useActiveProject(activeId).
export function useActiveProject() {
  return useQuery({
    queryKey: ['project', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
