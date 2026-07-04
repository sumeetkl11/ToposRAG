import React from 'react';
import { Server, Database, Layers, BookOpen, Cpu, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

// Define static card arrays outside render scope to avoid unnecessary memory allocations on every render
const API_ROUTES = [
  { method: 'GET',    path: '/api/health' },
  { method: 'GET',    path: '/api/system/stats' },
  { method: 'GET',    path: '/api/ingest' },
  { method: 'POST',   path: '/api/ingest' },
  { method: 'DELETE', path: '/api/ingest/:id' },
  { method: 'POST',   path: '/api/chat/query' },
  { method: 'GET',    path: '/api/auth/me' },
  { method: 'GET',    path: '/api/auth/google' },
  { method: 'GET',    path: '/api/auth/github' },
  { method: 'POST',   path: '/api/auth/logout' },
];

const FRONTEND_STACK = [
  { label: 'Framework', value: 'React 19 + Vite 6' },
  { label: 'Language',  value: 'TypeScript 5.8' },
  { label: 'Styling',   value: 'Tailwind CSS v4' },
  { label: 'State',     value: 'Zustand' },
  { label: 'HTTP',      value: 'Axios (withCredentials)' },
  { label: 'Graph',     value: '@xyflow/react' },
  { label: 'Port',      value: ':3000' },
];

const SECURITY_INFO = [
  { label: 'OAuth Providers', value: 'Google + GitHub' },
  { label: 'Token Storage',   value: 'HttpOnly Cookie' },
  { label: 'JWT Expiry',      value: '7 days' },
  { label: 'CSRF Guard',      value: 'Passport state param' },
  { label: 'Session Store',   value: 'express-session' },
  { label: 'CORS Origin',     value: 'localhost:3000 only' },
];

export default function ServerDetailsTab() {
  const activeRepositoryId = useWorkspaceStore(state => state.activeRepositoryId);

  // TanStack Query to fetch system stats, automatically refetching when activeRepositoryId changes
  const { data: systemInfo, isLoading, isFetching } = useQuery({
    queryKey: ['server-stats', activeRepositoryId],
    queryFn: async () => {
      const url = activeRepositoryId
        ? `http://localhost:5000/api/system/stats?repoId=${activeRepositoryId}`
        : 'http://localhost:5000/api/system/stats';
      const res = await axios.get(url, { withCredentials: true });
      return res.data;
    }
  });

  const renderSystemSkeleton = (rows: number) => (
    <div className="space-y-3 animate-pulse py-1">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-900">
          <div className="h-3 bg-slate-850 rounded w-1/4"></div>
          <div className="h-3 bg-slate-800 rounded w-5/12"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

      {/* Card: Backend Stack */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-bold text-sm text-white">Backend Runtime</h3>
        </div>
        <div className="space-y-2 text-xs font-mono">
          {isLoading || !systemInfo ? (
            renderSystemSkeleton(5)
          ) : (
            [
              { label: 'Runtime', value: systemInfo.runtime.runtime },
              { label: 'Auth', value: systemInfo.runtime.auth },
              { label: 'Port', value: systemInfo.runtime.port },
              { label: 'API Base', value: systemInfo.runtime.apiBase },
              { label: 'AI SDK', value: systemInfo.runtime.aiSdk },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-900">
                <span className="text-slate-500">{label}</span>
                <span className={`text-blue-300 transition-all ${isFetching ? 'animate-pulse opacity-60' : ''}`}>{value}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Card: Database */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center">
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="font-bold text-sm text-white">Neon Database</h3>
        </div>
        <div className="space-y-2 text-xs font-mono">
          {isLoading || !systemInfo ? (
            renderSystemSkeleton(5)
          ) : (
            [
              { label: 'Engine', value: systemInfo.database.engine },
              { label: 'Provider', value: systemInfo.database.provider },
              { label: 'SSL', value: systemInfo.database.ssl },
              { label: 'Pool max', value: systemInfo.database.poolMax },
              { label: 'Extension', value: systemInfo.database.extension },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-900">
                <span className="text-slate-500">{label}</span>
                <span className={`text-emerald-300 transition-all ${isFetching ? 'animate-pulse opacity-60' : ''}`}>{value}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Card: API Routes */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="font-bold text-sm text-white">API Routes</h3>
        </div>
        <div className="space-y-2 text-xs font-mono">
          {API_ROUTES.map(({ method, path: p }) => (
            <div key={p} className="flex items-center gap-2 py-1 border-b border-slate-900">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                method === 'GET' ? 'bg-emerald-950 text-emerald-400' :
                method === 'POST' ? 'bg-blue-950 text-blue-400' :
                'bg-red-950 text-red-400'
              }`}>{method}</span>
              <span className="text-slate-400">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card: Database Schema Tables */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="font-bold text-sm text-white">Schema Tables</h3>
        </div>
        <div className="space-y-2 text-xs font-mono">
          {isLoading || !systemInfo ? (
            renderSystemSkeleton(8)
          ) : (
            systemInfo.tables.map(({ table, note, rowCount, exists }) => (
              <div key={table} className="flex justify-between items-center py-1.5 border-b border-slate-900">
                <span className="text-amber-300 font-medium flex items-center gap-1.5">
                  {table}
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all ${
                    exists ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' : 'bg-red-950/40 text-red-400 border border-red-500/10'
                  } ${isFetching ? 'animate-pulse opacity-60' : ''}`}>
                    {rowCount} rows
                  </span>
                </span>
                <span className="text-slate-500 text-[10px]">{note}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Card: Frontend Stack */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-bold text-sm text-white">Frontend Stack</h3>
        </div>
        <div className="space-y-2 text-xs font-mono">
          {FRONTEND_STACK.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-900">
              <span className="text-slate-500">{label}</span>
              <span className="text-purple-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card: Security */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-rose-400" />
          </div>
          <h3 className="font-bold text-sm text-white">Security</h3>
        </div>
        <div className="space-y-2 text-xs font-mono">
          {SECURITY_INFO.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-900">
              <span className="text-slate-500">{label}</span>
              <span className="text-rose-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
