import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryKeys } from '@/lib/queryClient';
import type { Task, TaskStatus } from '@shared/types/tasks';
import { TaskStatus as TaskStatusEnum } from '@shared/types/tasks';

interface UpdateTaskStatusData {
  taskId: number;
  status: TaskStatus;
}

export function useTasks(filters?: Record<string, any>) {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks(filters),
    queryFn: () => apiRequest('GET', '/api/tasks', filters ? { filters } : undefined)
  });
}

export function useTask(taskId: string | number) {
  return useQuery<Task>({
    queryKey: queryKeys.task(taskId),
    queryFn: () => apiRequest('GET', `/api/tasks/${taskId}`)
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: UpdateTaskStatusData) => {
      return apiRequest<Task>('PATCH', `/api/tasks/${taskId}`, { status });
    },
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.task(taskId) });
      
      // Snapshot the previous value
      const previousTask = queryClient.getQueryData<Task>(queryKeys.task(taskId));
      
      // Optimistically update the cache
      if (previousTask) {
        queryClient.setQueryData<Task>(queryKeys.task(taskId), {
          ...previousTask,
          status,
          // Calculate progress based on status
          progress: status === TaskStatusEnum.COMPLETED ? 100 : previousTask.progress,
          updated_at: new Date().toISOString(),
        });
      }
      
      return { previousTask };
    },
    onError: (err, { taskId }, context) => {
      // If the mutation fails, restore the previous value
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.task(taskId), context.previousTask);
      }
    },
    onSettled: (_, __, { taskId }) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
    },
  });
} 