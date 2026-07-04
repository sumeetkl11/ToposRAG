import React from 'react';
import { Database, RefreshCw, Network, BookOpen } from 'lucide-react';
import { useAppStore } from '../store';

export default function GraphTab() {
  const activeRepository = useAppStore(state => state.activeRepository);
  const edges = useAppStore(state => state.edges);
  const loadingGraph = useAppStore(state => state.loadingGraph);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Column: Interactive Graph List/Display */}
      <div className="lg:col-span-8 bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col h-[520px] relative overflow-hidden shadow-xl gap-6">
        <div>
          <h3 className="font-bold text-sm text-white">Dependency Map</h3>
          <p className="text-xs text-slate-500 mt-1">Directed relations extracted from codebase AST imports.</p>
        </div>

        {!activeRepository ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 text-slate-500">
            <Database className="w-8 h-8 text-slate-700" />
            <p className="text-xs font-semibold text-slate-400">No codebase context selected</p>
            <p className="text-[11px] text-slate-600 max-w-xs">Select a codebase in the Codebases tab first to render dependencies.</p>
          </div>
        ) : loadingGraph ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Loading graph mapping...</span>
          </div>
        ) : edges.length === 0 ? (
          <div className="flex-1 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center text-center p-6 gap-2 text-slate-500">
            <Network className="w-6 h-6 text-slate-700" />
            <p className="text-xs font-semibold text-slate-400">No dependency edges parsed</p>
            <p className="text-[11px] text-slate-600 max-w-xs leading-normal">
              No import relationships were stored in database tables for this codebase context yet. Run scanner ingestion.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {edges.map((edge) => (
              <div 
                key={edge.id}
                className="bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 flex items-center justify-between font-mono text-xs text-slate-400"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-400">{edge.source_path.split('/').pop()}</span>
                  <span className="text-slate-600 font-sans">➜</span>
                  <span className="text-indigo-400">{edge.target_path.split('/').pop()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-500">
                    {edge.relationship_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Graph details */}
      <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div>
          <h3 className="font-bold text-sm text-white">AST Analyzer Specs</h3>
          <p className="text-xs text-slate-500 mt-1">Understanding DFS code cycle checks.</p>
        </div>

        <div className="bg-slate-950/80 p-4 border border-slate-900 rounded-xl text-xs space-y-3 leading-relaxed text-slate-400">
          <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
            <BookOpen className="w-4.5 h-4.5 text-blue-400" /> Cycle Detection Checks
          </h4>
          <p className="text-[11px]">
            The parser checks codebase dependencies using a Depth-First Search recursion layout. If back-references are discovered, they are marked as circular dependencies, flagging circular loops inside the relational graph to prevent runtime import complications.
          </p>
        </div>
      </div>

    </div>
  );
}
