import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  GitFork, 
  X, 
  FileText 
} from 'lucide-react';
import { useAppStore } from '../store';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export default function CodebasesTab() {
  const repositories = useAppStore(state => state.repositories);
  const activeRepository = useAppStore(state => state.activeRepository);
  const files = useAppStore(state => state.files);
  const loadingRepos = useAppStore(state => state.loadingRepos);
  const loadingDetails = useAppStore(state => state.loadingDetails);
  const ingesting = useAppStore(state => state.ingesting);
  const ingestError = useAppStore(state => state.ingestError);

  const fetchRepositories = useAppStore(state => state.fetchRepositories);
  const selectRepository = useAppStore(state => state.selectRepository);
  const registerRepository = useAppStore(state => state.registerRepository);
  const deleteRepository = useAppStore(state => state.deleteRepository);

  const activeRepositoryId = useWorkspaceStore(state => state.activeRepositoryId);
  const setActiveRepositoryId = useWorkspaceStore(state => state.setActiveRepositoryId);

  // Form states
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPath, setNewRepoPath] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Ensure success message timer is cleared cleanly on component unmount
  useEffect(() => {
    if (formSuccess) {
      const timer = setTimeout(() => setFormSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [formSuccess]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim() || !newRepoPath.trim()) return;
    
    setFormSuccess(false);
    const repo = await registerRepository(newRepoName, newRepoPath);
    if (repo) {
      setFormSuccess(true);
      setNewRepoName('');
      setNewRepoPath('');
      if (repo.id) {
        selectRepository(repo.id);
        setActiveRepositoryId(repo.id);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Column: Register repository form */}
      <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col shadow-xl">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-blue-400" /> Register Codebase
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Register a local repository to scan, parse imports, and generate vector embeddings inside your Neon database.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 flex-1">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium block">Repository Name</label>
            <input 
              type="text" 
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              placeholder="e.g. My RAG Project"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium block">Absolute Filesystem Path</label>
            <input 
              type="text" 
              value={newRepoPath}
              onChange={(e) => setNewRepoPath(e.target.value)}
              placeholder="e.g. C:\MyCode\project or /home/dev/project"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-colors font-mono"
              required
            />
          </div>

          {ingestError && (
            <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{ingestError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex gap-2 items-center">
              <CheckCircle2 className="w-4 h-4" />
              <span>Codebase registered successfully!</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={ingesting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {ingesting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting & Indexing...
              </>
            ) : (
              <>
                Register & Scan <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: List of codebases in DB */}
      <div className="lg:col-span-8 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
        <div>
          <h3 className="font-bold text-sm text-white">Registered Codebases</h3>
          <p className="text-xs text-slate-500 mt-1">Select a database project context to view parsed files and query code chunks.</p>
        </div>

        {loadingRepos ? (
          <div className="flex-1 flex items-center justify-center py-20 gap-2 text-slate-500 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Querying Neon Database...</span>
          </div>
        ) : repositories.length === 0 ? (
          <div className="flex-1 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 py-20 gap-3">
            <Database className="w-8 h-8 text-slate-700" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">No registered codebases</p>
              <p className="text-[11px] text-slate-600 max-w-xs leading-normal">Enter a local codebase name and path in the form to parse and store file chunks in Neon DB.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <div 
                key={repo.id}
                onClick={() => {
                  selectRepository(repo.id);
                  setActiveRepositoryId(repo.id);
                }}
                className={`border rounded-xl p-4 cursor-pointer hover:border-blue-500/50 hover:bg-slate-900/30 transition-all flex flex-col gap-3 group relative ${activeRepository?.id === repo.id ? 'border-blue-600 bg-blue-950/10' : 'border-slate-800 bg-slate-950/20'}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-xs text-slate-200 group-hover:text-blue-400 transition-colors">{repo.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono break-all">{repo.root_path}</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this repository and all chunks?')) {
                        deleteRepository(repo.id);
                        if (activeRepositoryId === repo.id) {
                          setActiveRepositoryId(null);
                        }
                      }
                    }}
                    className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-slate-900 shrink-0"
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-3 text-[10px] text-slate-500 font-mono mt-auto pt-2 border-t border-slate-900">
                  <span className="flex items-center gap-1"><GitFork className="w-3 h-3 text-slate-600" /> {repo.git_branch || 'main'}</span>
                  <span>Modified: {new Date(repo.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Display selected repository files */}
        {activeRepository && (
          <div className="border-t border-slate-800 pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-xs text-slate-300">
                File Directory - <span className="text-blue-400 font-mono text-[11px]">{activeRepository.name}</span>
              </h4>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">{files.length} Files Parsed</span>
            </div>

            {loadingDetails ? (
              <div className="flex justify-center items-center py-6 gap-2 text-slate-600 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Querying tables...</span>
              </div>
            ) : files.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-600 italic">No files parsed yet. Check scanner service logs for indexing operations.</p>
            ) : (
              <div className="bg-slate-950/60 rounded-xl border border-slate-800 max-h-48 overflow-y-auto divide-y divide-slate-900 font-mono text-[11px]">
                {files.map((file) => (
                  <div key={file.id} className="p-2.5 flex justify-between items-center text-slate-400 hover:text-slate-200">
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      {file.file_path}
                    </span>
                    <div className="flex gap-4 items-center shrink-0">
                      <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 capitalize">{file.language}</span>
                      <span className="text-slate-600 text-[10px]">{(file.size_bytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
