-- Expand phase: add tenant/workspace composite foreign keys without changing existing columns.
-- Nullable workspace_id continues to represent tenant-global records.
ALTER TABLE resources
  ADD CONSTRAINT resources_tenant_workspace_fk
  FOREIGN KEY (tenant_id, workspace_id) REFERENCES workspaces(tenant_id, id) NOT VALID;
ALTER TABLE resources VALIDATE CONSTRAINT resources_tenant_workspace_fk;

ALTER TABLE documents
  ADD CONSTRAINT documents_tenant_workspace_fk
  FOREIGN KEY (tenant_id, workspace_id) REFERENCES workspaces(tenant_id, id) NOT VALID;
ALTER TABLE documents VALIDATE CONSTRAINT documents_tenant_workspace_fk;

ALTER TABLE document_chunks
  ADD CONSTRAINT document_chunks_tenant_workspace_fk
  FOREIGN KEY (tenant_id, workspace_id) REFERENCES workspaces(tenant_id, id) NOT VALID;
ALTER TABLE document_chunks VALIDATE CONSTRAINT document_chunks_tenant_workspace_fk;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_tenant_workspace_fk
  FOREIGN KEY (tenant_id, workspace_id) REFERENCES workspaces(tenant_id, id) NOT VALID;
ALTER TABLE jobs VALIDATE CONSTRAINT jobs_tenant_workspace_fk;
