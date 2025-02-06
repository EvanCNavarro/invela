import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface TaskCounts {
  myTasksCount: number;
  forOthersCount: number;
}

export function useTaskCounts() {
  const { user } = useAuth();

  return useQuery<TaskCounts>({
    queryKey: ["/api/tasks/counts"],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data fresh for 15 seconds
  });
}

export function TaskCountBadge({ count, isActive = false }: { count: number; isActive?: boolean }) {
  if (count === 0) return null;

  return (
    <div
      className={`
        ml-1.5 px-1.5 min-w-[20px] h-5 
        inline-flex items-center justify-center
        rounded-full text-xs font-medium
        ${isActive 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted-foreground/90 text-background"}
      `}
    >
      {count > 99 ? "99+" : count}
    </div>
  );
}