import { create } from 'zustand';

interface PlaygroundVisibilityState {
  isVisible: boolean;
  toggle: () => void;
  show: () => void;
  hide: () => void;
}

export const usePlaygroundVisibility = create<PlaygroundVisibilityState>((set) => ({
  isVisible: true,
  toggle: () => set((state) => ({ isVisible: !state.isVisible })),
  show: () => set({ isVisible: true }),
  hide: () => set({ isVisible: false }),
}));
