import { create } from 'zustand';
import { getSystemInfo, SystemInfoResponse } from '../services/api';

interface SystemState {
  systemInfo: SystemInfoResponse | null;
  loading: boolean;
  error: string | null;
  fetchSystemInfo: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  systemInfo: null,
  loading: false,
  error: null,
  fetchSystemInfo: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getSystemInfo();
      if (data.success) {
        set({ systemInfo: data, loading: false });
      } else {
        set({ error: 'Failed to fetch system information', loading: false });
      }
    } catch (err: any) {
      console.error('Failed to load system info:', err.message);
      set({ 
        error: err.response?.data?.message || err.message || 'Failed to connect to the backend system api.', 
        loading: false 
      });
    }
  }
}));
