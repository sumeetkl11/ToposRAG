import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export interface SystemRuntimeInfo {
  runtime: string;
  auth: string;
  port: string;
  apiBase: string;
  aiSdk: string;
  uptime?: number;
  platform?: string;
}

export interface SystemDatabaseInfo {
  status: 'connected' | 'disconnected';
  engine: string;
  provider: string;
  ssl: string;
  poolMax: string;
  extension: string;
}

export interface SystemTableInfo {
  table: string;
  note: string;
  rowCount: number;
  exists: boolean;
}

export interface SystemInfoResponse {
  success: boolean;
  runtime: SystemRuntimeInfo;
  database: SystemDatabaseInfo;
  tables: SystemTableInfo[];
}

/**
 * Fetch live system status, Node runtime info, and Neon DB table counts
 */
export async function getSystemInfo(): Promise<SystemInfoResponse> {
  const response = await axios.get<SystemInfoResponse>(`${API_BASE}/system/info`, {
    withCredentials: true
  });
  return response.data;
}
