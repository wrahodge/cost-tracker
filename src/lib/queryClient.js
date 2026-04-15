import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is remote and small — refetch on focus is fine.
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Keys are namespaced so future features (multi-project) can add a
// project-id prefix without rewriting every usage.
export const qk = {
  session: ['session'],
  project: (projectId) => ['project', projectId],
  budgetCategories: (projectId) => ['budget', 'categories', projectId],
  budgetGroups: (projectId) => ['budget', 'groups', projectId],
  budgetLines: (projectId) => ['budget', 'lines', projectId],
  contracts: (projectId) => ['contracts', projectId],
  sections: (projectId) => ['sections', projectId],
  milestones: (projectId) => ['milestones', projectId],
  variations: (projectId) => ['variations', projectId],
  payments: (projectId) => ['payments', projectId],
  forecasts: (projectId) => ['forecasts', projectId],
};
