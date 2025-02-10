import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isExpanded: true,
      setIsExpanded: (expanded) => set({ isExpanded: expanded }),
      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
    }),
    {
      name: 'sidebar-storage',
    }
  )
);
