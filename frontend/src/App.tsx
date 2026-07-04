import React, { useState } from 'react';
import { Database, Server, MessageSquare, Network } from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';

// Import modular dashboard tab panels and layout shells
import LayoutHeader from './components/LayoutHeader';
import LayoutFooter from './components/LayoutFooter';
import CodebasesTab from './components/CodebasesTab';
import ServerDetailsTab from './components/ServerDetailsTab';
import ChatTab from './components/ChatTab';
import GraphTab from './components/GraphTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'repositories' | 'express' | 'chat' | 'graph'>('repositories');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500/30 selection:text-blue-200">
        
        {/* Logo banner headers */}
        <LayoutHeader />

        {/* Primary Dashboard Layout Grid */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
          
          {/* Navigation Tabs Bar */}
          <div className="flex border-b border-slate-800 gap-1 bg-slate-900/20 p-1 rounded-xl max-w-lg self-start">
            <button 
              onClick={() => setActiveTab('repositories')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'repositories' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
            >
              <Database className="w-4 h-4" /> Codebases
            </button>
            <button 
              onClick={() => setActiveTab('express')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'express' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
            >
              <Server className="w-4 h-4" /> Server Details
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
            >
              <MessageSquare className="w-4 h-4" /> RAG Chat
            </button>
            <button 
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'graph' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
            >
              <Network className="w-4 h-4" /> Flow Graph
            </button>
          </div>

          {/* Modular Dashboard Panels Grid */}
          <section className="flex-1 min-h-[500px]">
            {activeTab === 'repositories' && <CodebasesTab />}
            {activeTab === 'express' && <ServerDetailsTab />}
            {activeTab === 'chat' && <ChatTab />}
            {activeTab === 'graph' && <GraphTab />}
          </section>

        </main>
        
        {/* Footer credits and information */}
        <LayoutFooter />

      </div>
    </ProtectedRoute>
  );
}
