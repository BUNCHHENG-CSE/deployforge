-- ====================================================================
-- DeployForge PostgreSQL Initialization Script
-- Enables extensions, schema, indexes, and initial sandbox tenant
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    auth_mode VARCHAR(32) NOT NULL DEFAULT 'simulation',
    client_id VARCHAR(128),
    client_secret TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_simulation BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployment Jobs Table
CREATE TABLE IF NOT EXISTS deployment_jobs (
    job_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    publisher VARCHAR(255) NOT NULL,
    version VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    current_step VARCHAR(255) NOT NULL,
    target_group_id VARCHAR(128) NOT NULL,
    assignment_intent VARCHAR(32) NOT NULL DEFAULT 'required',
    architecture VARCHAR(32) DEFAULT 'x64',
    install_command TEXT NOT NULL,
    uninstall_command TEXT NOT NULL,
    install_behavior VARCHAR(32) DEFAULT 'system',
    device_restart_behavior VARCHAR(32) DEFAULT 'suppress',
    detection_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    intunewin_filename VARCHAR(255),
    intune_app_id VARCHAR(128),
    is_simulation BOOLEAN NOT NULL DEFAULT FALSE,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Custom Uploaded Packages Table
CREATE TABLE IF NOT EXISTS custom_packages (
    id VARCHAR(64) PRIMARY KEY,
    file_token VARCHAR(64) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    file_type VARCHAR(16) NOT NULL,
    engine VARCHAR(64) NOT NULL,
    analysis_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- High-Performance B-Tree & GIN Indexes ---
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_created ON deployment_jobs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON deployment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON deployment_jobs(created_at DESC);

-- GIN index for ultra-fast JSONB queries inside detection rules and logs
CREATE INDEX IF NOT EXISTS idx_jobs_detection_rules_gin ON deployment_jobs USING gin (detection_rules);
CREATE INDEX IF NOT EXISTS idx_packages_metadata_gin ON custom_packages USING gin (analysis_metadata);

-- Seed Default Contoso Sandbox Tenant
INSERT INTO tenants (id, display_name, auth_mode, is_simulation, created_at, updated_at)
VALUES (
    'tenant-simulated-contoso-corp',
    'Contoso Corp (Sandbox)',
    'simulation',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
