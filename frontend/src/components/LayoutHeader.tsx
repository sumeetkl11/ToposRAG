import React from 'react';
import { Cpu } from 'lucide-react';
import { useAuthStore } from '../useAuthStore';

export default function LayoutHeader() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">ToposRAG</h1>
            <p className="text-[10px] font-mono text-slate-500">LOCAL ANALYTICS AGENT • NEON CORE</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 max-w-[150px] truncate" title={user.name || user.email}>
                {user.name || user.email}
              </span>
              <button
                onClick={logout}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/50 text-slate-300 hover:text-white text-[10px] font-mono tracking-wider uppercase transition-all cursor-pointer transform active:scale-95"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
