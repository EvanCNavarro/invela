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
    queryFn: async () => {
      const response = await fetch("/api/tasks/counts");
      if (!response.ok) {
        throw new Error("Failed to fetch task counts");
      }
      return response.json();
    },
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
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
          : "bg-muted-foreground text-background"}
      `}
    >
      {count > 99 ? "99+" : count}
    </div>
  );
}