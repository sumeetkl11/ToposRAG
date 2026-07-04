import React, { useState } from 'react';
import { Database, Cpu, RefreshCw, FileText, Code2, HelpCircle } from 'lucide-react';
import { useAppStore } from '../store';

export default function ChatTab() {
  const activeRepository = useAppStore(state => state.activeRepository);
  const messages = useAppStore(state => state.messages);
  const sendChatMessage = useAppStore(state => state.sendChatMessage);
  const clearChat = useAppStore(state => state.clearChat);

  const [chatInput, setChatInput] = useState('');
  const [selectedCitation, setSelectedCitation] = useState<any>(null);

  const handleSendChat = async () => {
    if (!chatInput.trim() || !activeRepository) return;
    const text = chatInput;
    setChatInput('');
    await sendChatMessage(text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Column: Chat feed */}
      <div className="lg:col-span-7 flex flex-col h-[520px] bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Messages feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/40 flex flex-col">
          {!activeRepository ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 text-slate-500">
              <Database className="w-8 h-8 text-slate-700 animate-pulse" />
              <p className="text-xs font-semibold text-slate-400">No context codebase selected</p>
              <p className="text-[11px] text-slate-600 max-w-xs leading-normal">
                Select a registered codebase in the <strong>Codebases</strong> tab first to load its RAG context database.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                )}
                <div className="max-w-[85%] flex flex-col gap-2">
                  <div className={`px-4 py-2.5 rounded-xl text-xs leading-relaxed ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'}`}>
                    {msg.loading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        <span className="font-mono text-[11px] text-slate-500">Retrieving references from Neon DB & generating response...</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.citations.map((cit, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setSelectedCitation(cit)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${selectedCitation?.id === cit.id ? 'bg-blue-950 border-blue-600 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                        >
                          <FileText className="w-3 h-3" />
                          {cit.filePath.split('/').pop()} (Lines {cit.lineStart}-{cit.lineEnd})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input form */}
        {activeRepository && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder={`Ask ToposRAG about ${activeRepository.name} files, tables, or APIs...`}
              className="flex-1 bg-slate-900 text-slate-200 border border-slate-850 rounded-xl text-xs px-4 py-2.5 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
            >
              Ask AI
            </button>
            <button 
              onClick={clearChat}
              className="border border-slate-850 hover:bg-slate-900 text-slate-400 px-2 py-2.5 rounded-xl text-xs"
              title="Clear History"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Citation reference inspector */}
      <div className="lg:col-span-5 flex flex-col h-[520px] bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
            <Code2 className="w-4 h-4 text-blue-400" /> Reference Inspector: {selectedCitation ? selectedCitation.filePath.split('/').pop() : 'No selection'}
          </span>
          {selectedCitation && (
            <span className="text-[10px] bg-slate-850 text-blue-400 font-mono px-2 py-0.5 rounded">
              Similarity: {(selectedCitation.similarity * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {selectedCitation ? (
          <div className="flex-1 p-4 bg-slate-950 overflow-auto flex flex-col gap-4">
            <div className="flex-1 text-blue-200/90 whitespace-pre overflow-auto bg-slate-900/50 p-3 rounded-xl border border-slate-850 font-mono text-[11px]">
              {selectedCitation.content || `// Context Lines ${selectedCitation.lineStart} - ${selectedCitation.lineEnd} inside file: ${selectedCitation.filePath}\n\n// Embedded chunk matches user prompt semantically.`}
            </div>
            <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl text-[11px] text-slate-400 leading-normal shrink-0">
              <strong className="text-slate-200 block mb-1">RAG Context Processing:</strong>
              Semantically matched against Neon vector database with distance factor: <span className="text-emerald-400 font-bold font-mono">{(selectedCitation.similarity * 100).toFixed(2)}%</span>.
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2 text-slate-500">
            <HelpCircle className="w-8 h-8 text-slate-700 animate-pulse" />
            <span className="text-slate-400 text-xs">Click any file citation chip in the conversation history to load source contexts here.</span>
          </div>
        )}
      </div>

    </div>
  );
}
