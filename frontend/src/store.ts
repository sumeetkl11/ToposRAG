import { create } from 'zustand';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export interface Repository {
  id: string;
  name: string;
  root_path: string;
  git_branch?: string;
  commit_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface CodebaseFile {
  id: string;
  repository_id: string;
  file_path: string;
  language: string;
  checksum: string;
  size_bytes: number;
  last_modified: string;
}

export interface GraphEdge {
  id: string;
  relationship_type: string;
  source_file: string;
  target_file: string;
  source_path: string;
  target_path: string;
}

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  loading?: boolean;
  error?: boolean;
  citations?: {
    id: string;
    filePath: string;
    language: string;
    lineStart: number;
    lineEnd: number;
    similarity: string;
  }[];
}

interface AppState {
  repositories: Repository[];
  activeRepository: Repository | null;
  files: CodebaseFile[];
  edges: GraphEdge[];
  messages: ChatMessage[];
  
  // Loading & operational states
  loadingRepos: boolean;
  loadingDetails: boolean;
  loadingGraph: boolean;
  ingesting: boolean;
  ingestError: string | null;
  
  // Actions
  fetchRepositories: () => Promise<void>;
  selectRepository: (repoId: string) => Promise<void>;
  registerRepository: (name: string, rootPath: string) => Promise<Repository | null>;
  deleteRepository: (repoId: string) => Promise<void>;
  fetchGraph: (repoId: string) => Promise<void>;
  sendChatMessage: (prompt: string) => Promise<void>;
  clearChat: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  repositories: [],
  activeRepository: null,
  files: [],
  edges: [],
  messages: [
    {
      sender: 'assistant',
      text: 'Hello! I am **ToposRAG**. Ask me any question about the files, table layouts, or dependencies of your indexed codebase!'
    }
  ],
  
  loadingRepos: false,
  loadingDetails: false,
  loadingGraph: false,
  ingesting: false,
  ingestError: null,

  fetchRepositories: async () => {
    set({ loadingRepos: true });
    try {
      const res = await axios.get(`${API_BASE}/ingest`);
      set({ repositories: res.data.repositories || [] });
    } catch (err: any) {
      console.error('Failed to load repositories:', err.message);
    } finally {
      set({ loadingRepos: false });
    }
  },

  selectRepository: async (repoId: string) => {
    set({ loadingDetails: true, activeRepository: null, files: [] });
    try {
      const res = await axios.get(`${API_BASE}/ingest/${repoId}`);
      if (res.data.success) {
        set({ 
          activeRepository: res.data.repository,
          files: res.data.files || [] 
        });
        // Auto-fetch dependency graph for this repo
        await get().fetchGraph(repoId);
      }
    } catch (err: any) {
      console.error('Failed to load repository details:', err.message);
    } finally {
      set({ loadingDetails: false });
    }
  },

  registerRepository: async (name: string, rootPath: string) => {
    set({ ingesting: true, ingestError: null });
    try {
      const res = await axios.post(`${API_BASE}/ingest`, { name, rootPath });
      if (res.data.success) {
        await get().fetchRepositories();
        const repo = res.data.repository;
        set({ activeRepository: repo });
        return repo;
      }
      // API returned success:false with a message
      set({ ingestError: res.data.message || 'Registration failed.' });
      return null;
    } catch (err: any) {
      const data = err.response?.data;
      // Surface Zod field-level validation details if present
      if (data?.details?.length) {
        const fieldErrors = (data.details as any[]).map((d) => `${d.field}: ${d.message}`).join(' | ');
        set({ ingestError: `Validation error — ${fieldErrors}` });
      } else {
        const msg = data?.message || err.message || 'Failed to ingest repository';
        set({ ingestError: msg });
      }
      return null;
    } finally {
      set({ ingesting: false });
    }
  },

  deleteRepository: async (repoId: string) => {
    try {
      const res = await axios.delete(`${API_BASE}/ingest/${repoId}`);
      if (res.data.success) {
        const active = get().activeRepository;
        if (active && active.id === repoId) {
          set({ activeRepository: null, files: [], edges: [] });
        }
        await get().fetchRepositories();
      }
    } catch (err: any) {
      console.error('Failed to delete repository:', err.message);
    }
  },

  fetchGraph: async (repoId: string) => {
    set({ loadingGraph: true });
    try {
      const res = await axios.get(`${API_BASE}/ingest/${repoId}/graph`);
      if (res.data.success) {
        set({ edges: res.data.edges || [] });
      }
    } catch (err: any) {
      console.error('Failed to fetch dependency graph:', err.message);
    } finally {
      set({ loadingGraph: false });
    }
  },

  sendChatMessage: async (prompt: string) => {
    const active = get().activeRepository;
    if (!active) return;
    
    // Append user message
    const userMsg: ChatMessage = { sender: 'user', text: prompt };
    set(state => ({ messages: [...state.messages, userMsg] }));

    // Append pending assistant message
    const pendingMsgId = get().messages.length;
    const pendingMsg: ChatMessage = { sender: 'assistant', text: 'Thinking...', loading: true };
    set(state => ({ messages: [...state.messages, pendingMsg] }));

    try {
      const res = await axios.post(`${API_BASE}/chat/query`, {
        repositoryId: active.id,
        prompt
      });

      set(state => {
        const updated = [...state.messages];
        if (res.data.success) {
          updated[pendingMsgId] = {
            sender: 'assistant',
            text: res.data.answer,
            citations: res.data.references || []
          };
        } else {
          updated[pendingMsgId] = {
            sender: 'assistant',
            text: res.data.message || 'Something went wrong.',
            error: true
          };
        }
        return { messages: updated };
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error executing query';
      set(state => {
        const updated = [...state.messages];
        updated[pendingMsgId] = {
          sender: 'assistant',
          text: `Failed to retrieve answer: ${msg}`,
          error: true
        };
        return { messages: updated };
      });
    }
  },

  clearChat: () => {
    set({
      messages: [
        {
          sender: 'assistant',
          text: 'Hello! I am **ToposRAG**. Ask me any question about the files, table layouts, or dependencies of your indexed codebase!'
        }
      ]
    });
  }
}));
