import React from 'react';
import { Cpu, Sparkles, Database, Lock, ShieldCheck } from 'lucide-react';
import { useAuthStore } from './useAuthStore';

export default function Login() {
  const { loginWithGoogle, loginWithGitHub } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Subtle background glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col gap-8">
        
        {/* Header Layout */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/10 border border-blue-400/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Welcome to ToposRAG
            </h1>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">
              Local Analytics Agent • Neon database core
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="flex flex-col gap-3 p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Database className="w-4 h-4 text-blue-500" />
            <span>Neon DB Core Storage</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Local AI-Powered RAG Analytics</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Secure JWT Cookie Sessions</span>
          </div>
        </div>

        {/* Login Brand Action Buttons */}
        <div className="flex flex-col gap-3.5">
          {/* Sign in with Google */}
          <button
            onClick={loginWithGoogle}
            className="w-full h-11 px-4 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-semibold text-sm flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-lg shadow-black/20 hover:shadow-white/5 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 15.02 1 12 1 7.37 1 3.42 3.66 1.5 7.57l3.92 3.04C6.39 7.74 8.96 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.71-4.92 3.71-8.6z"
              />
              <path
                fill="#FBBC05"
                d="M5.42 14.54c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.5 6.87C.54 8.79 0 10.94 0 13s.54 4.21 1.5 6.13l3.92-3.59z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.04 0-5.61-2.7-6.58-5.57L1.5 16.79C3.42 20.34 7.37 23 12 23z"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Sign in with GitHub */}
          <button
            onClick={loginWithGitHub}
            className="w-full h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 text-slate-100 font-semibold text-sm flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-lg shadow-black/10 hover:shadow-slate-700/10 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-slate-600 text-xs font-mono">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>End-to-End Encryption Enabled</span>
      </div>
    </div>
  );
}
