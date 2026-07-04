-- ==========================================
-- ToposRAG - PostgreSQL Database Initialization
-- ==========================================

-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop tables if they already exist (to support clean reset/seeding)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS documentation CASCADE;
DROP TABLE IF EXISTS dependency_edges CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS repositories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 0. Users Table
-- Stores user authentication profiles, supporting OAuth login options.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    auth_provider VARCHAR(50) NOT NULL, -- 'google' or 'github'
    provider_id VARCHAR(255) NOT NULL, -- social user identifier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_provider_id UNIQUE (auth_provider, provider_id)
);

-- 1. Repositories Table
-- Stores metadata about the codebase repositories registered in the application.
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    git_branch TEXT,
    commit_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Files Table
-- Track individual source files within each indexed repository.
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    language VARCHAR(50),
    checksum TEXT,
    size_bytes BIGINT,
    last_modified TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_repo_file_path UNIQUE (repository_id, file_path)
);

-- 3. Chunks Table
-- Semantic text chunks generated from code files, including their embeddings.
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    line_start INTEGER,
    line_end INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Dependency Edges Table
-- Maps structural code relationships (IMPORTS, CALLS, EXTENDS, etc.) between files.
CREATE TABLE dependency_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    source_file UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    target_file UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- e.g., IMPORTS, EXPORTS, CALLS, EXTENDS, IMPLEMENTS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Documentation Table
-- Stores generated documentation for repositories.
CREATE TABLE documentation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    document_type VARCHAR(100),
    markdown TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Chat Sessions Table
-- Stores developer chat sessions.
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Chat Messages Table
-- Stores individual message exchanges in a chat session.
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- Indexing Strategy
-- ==========================================

-- Standard B-Tree Indexes for rapid lookups and join performance
CREATE INDEX idx_files_repo ON files(repository_id);
CREATE INDEX idx_chunks_repo ON chunks(repository_id);
CREATE INDEX idx_chunks_file ON chunks(file_id);
CREATE INDEX idx_dependency_source ON dependency_edges(source_file);
CREATE INDEX idx_dependency_target ON dependency_edges(target_file);
CREATE INDEX idx_documentation_repo ON documentation(repository_id);
CREATE INDEX idx_chat_sessions_repo ON chat_sessions(repository_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);

-- HNSW Vector Index for Cosine Distance Similarity Search
-- Configured for vector size 768 matching Gemini's text-embedding-004
CREATE INDEX idx_chunks_embedding
ON chunks
USING hnsw (embedding vector_cosine_ops);
