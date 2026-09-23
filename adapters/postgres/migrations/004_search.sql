-- PostgreSQL full-text fallback for SearchPort. Kept tenant scoped and RLS protected.
CREATE INDEX IF NOT EXISTS document_chunks_fts_idx
  ON document_chunks USING GIN (to_tsvector('simple', content));
CREATE INDEX IF NOT EXISTS document_chunks_search_scope_idx
  ON document_chunks (tenant_id, workspace_id, id);

-- Optional title/filename lookup remains bounded to tenant documents.
CREATE INDEX IF NOT EXISTS documents_filename_fts_idx
  ON documents USING GIN (to_tsvector('simple', filename));
