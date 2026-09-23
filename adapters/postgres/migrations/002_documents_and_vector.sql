CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),workspace_id uuid,storage_key text NOT NULL,status text NOT NULL CHECK(status IN('QUARANTINED','SCANNING','APPROVED','REJECTED','PROCESSING','READY','FAILED')),filename text NOT NULL,mime_type text,size_bytes bigint NOT NULL CHECK(size_bytes>=0),sha256 text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX documents_tenant_workspace_idx ON documents(tenant_id,workspace_id,created_at DESC);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_documents ON documents USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE document_chunks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),workspace_id uuid,document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,chunk_index integer NOT NULL,content text NOT NULL,embedding vector(1536),metadata jsonb NOT NULL DEFAULT '{}',UNIQUE(document_id,chunk_index));
CREATE INDEX document_chunks_tenant_idx ON document_chunks(tenant_id,workspace_id,document_id);
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_document_chunks ON document_chunks USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
