-- ============================================================================
-- 文档嵌入向量表迁移
-- 创建时间: 2026-02-18
-- 描述: 创建 document_embeddings 表，使用 PGVector 扩展存储向量
-- 前置条件: PostgreSQL 已安装 pgvector 扩展
-- ============================================================================

-- 启用 pgvector 扩展（如果未启用）
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建 document_embeddings 表
CREATE TABLE IF NOT EXISTS document_embeddings (
    -- 主键
    id              VARCHAR(255) PRIMARY KEY,

    -- 多租户隔离
    tenant_id       VARCHAR(255) NOT NULL,

    -- 聚合引用
    aggregate_type  VARCHAR(100) NOT NULL,
    aggregate_id    VARCHAR(255) NOT NULL,

    -- 向量数据
    embedding       vector(1536) NOT NULL,  -- 默认 1536 维（OpenAI text-embedding-3-small）

    -- 内容
    content         TEXT NOT NULL,

    -- 元数据
    metadata        JSONB,

    -- 审计字段
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,

    -- 约束
    CONSTRAINT uk_document_embeddings_tenant_aggregate
        UNIQUE (tenant_id, aggregate_type, aggregate_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_document_embeddings_tenant
    ON document_embeddings (tenant_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_tenant_type
    ON document_embeddings (tenant_id, aggregate_type);

-- 创建 HNSW 向量索引（用于近似最近邻搜索）
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector
    ON document_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 创建 GIN 索引用于元数据查询
CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata
    ON document_embeddings USING GIN (metadata)
    WHERE metadata IS NOT NULL;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_document_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_embeddings_updated_at
    BEFORE UPDATE ON document_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_document_embeddings_updated_at();

-- 添加注释
COMMENT ON TABLE document_embeddings IS '文档嵌入向量表：存储文档的向量表示，用于语义搜索';
COMMENT ON COLUMN document_embeddings.id IS '向量 ID';
COMMENT ON COLUMN document_embeddings.tenant_id IS '租户 ID（行级隔离）';
COMMENT ON COLUMN document_embeddings.aggregate_type IS '聚合类型（如 Document）';
COMMENT ON COLUMN document_embeddings.aggregate_id IS '聚合 ID';
COMMENT ON COLUMN document_embeddings.embedding IS '嵌入向量（使用 pgvector）';
COMMENT ON COLUMN document_embeddings.content IS '原始文本内容';
COMMENT ON COLUMN document_embeddings.metadata IS '元数据（JSON）';

-- ============================================================================
-- 向量搜索示例
-- ============================================================================

-- 相似度搜索（余弦距离）
-- SELECT id, content, metadata,
--        1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as score
-- FROM document_embeddings
-- WHERE tenant_id = 'xxx'
-- ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
-- LIMIT 10;
