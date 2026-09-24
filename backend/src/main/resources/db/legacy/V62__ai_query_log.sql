-- Elykia IA — journal des requêtes (Phase 2 : stats admin, SQL rejetés)
CREATE TABLE IF NOT EXISTS ai_query_log (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL,
    username VARCHAR(100),
    conversation_id UUID,
    question TEXT NOT NULL,
    intent VARCHAR(20),
    status VARCHAR(20) NOT NULL,
    sql_text TEXT,
    error_message TEXT,
    duration_ms BIGINT,
    sources_hit INT,
    row_count INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_query_log_created
    ON ai_query_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_query_log_status_created
    ON ai_query_log (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_query_log_user_created
    ON ai_query_log (user_id, created_at DESC);
