CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE tenants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE workspaces(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id));
CREATE INDEX workspaces_tenant_idx ON workspaces(tenant_id);

CREATE TABLE resources(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),workspace_id uuid,resource_type text NOT NULL,payload jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX resources_tenant_workspace_idx ON resources(tenant_id,workspace_id,created_at DESC);

CREATE TABLE idempotency_keys(key text PRIMARY KEY,response_body bytea NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX idempotency_expiry_idx ON idempotency_keys(expires_at);

CREATE TABLE outbox_events(id uuid PRIMARY KEY,event_type text NOT NULL,event_version integer NOT NULL,tenant_id uuid NOT NULL,workspace_id uuid,correlation_id text NOT NULL,causation_id text,source text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz,attempts integer NOT NULL DEFAULT 0);
CREATE INDEX outbox_unpublished_idx ON outbox_events(created_at) WHERE published_at IS NULL;
CREATE INDEX outbox_tenant_idx ON outbox_events(tenant_id,created_at);

CREATE TABLE inbox_events(event_id uuid PRIMARY KEY,consumer_name text NOT NULL,tenant_id uuid NOT NULL,processed_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;ALTER TABLE resources ENABLE ROW LEVEL SECURITY;ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;ALTER TABLE inbox_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_workspaces ON workspaces USING (tenant_id::text=current_setting('app.tenant_id',true));
CREATE POLICY tenant_resources ON resources USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
CREATE POLICY tenant_outbox ON outbox_events USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
CREATE POLICY tenant_inbox ON inbox_events USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
