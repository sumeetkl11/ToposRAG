import { create } from 'zustand';

interface WorkspaceState {
  activeRepositoryId: string | null;
  setActiveRepositoryId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeRepositoryId: null,
  setActiveRepositoryId: (id) => set({ activeRepositoryId: id }),
}));
