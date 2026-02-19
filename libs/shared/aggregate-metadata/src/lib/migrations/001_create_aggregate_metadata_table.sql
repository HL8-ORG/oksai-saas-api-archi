-- ============================================================================
-- 聚合元数据表迁移
-- 创建时间: 2026-02-18
-- 描述: 创建 aggregate_metadata 表，用于存储跨域聚合根元数据
-- ============================================================================

-- 创建 aggregate_metadata 表
CREATE TABLE IF NOT EXISTS aggregate_metadata (
    -- 主键字段（复合主键）
    tenant_id       VARCHAR(255) NOT NULL,
    aggregate_type  VARCHAR(100) NOT NULL,
    aggregate_id    VARCHAR(255) NOT NULL,

    -- 基础审计字段
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255),
    deleted_at      TIMESTAMP,
    deleted_by      VARCHAR(255),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,

    -- 可分析扩展字段
    tags                JSONB,
    category            VARCHAR(100),
    analytics_dimensions JSONB,
    quality_score       INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    include_in_analytics BOOLEAN DEFAULT TRUE,

    -- AI 能力扩展字段
    embedding_status    VARCHAR(20),
    embedding_version   VARCHAR(50),
    embedding_id        VARCHAR(255),
    ai_metadata         JSONB,

    -- 可同步扩展字段
    external_ids    JSONB,
    data_source     VARCHAR(100),
    sync_status     VARCHAR(20),
    last_synced_at  TIMESTAMP,
    sync_version    INTEGER DEFAULT 1,
    etl_metadata    JSONB,

    -- 主键约束
    PRIMARY KEY (tenant_id, aggregate_type, aggregate_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_aggregate_metadata_tenant_type 
    ON aggregate_metadata (tenant_id, aggregate_type);

CREATE INDEX IF NOT EXISTS idx_aggregate_metadata_tenant_created 
    ON aggregate_metadata (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aggregate_metadata_tenant_deleted 
    ON aggregate_metadata (tenant_id, is_deleted);

-- 分类索引（用于按分类查询）
CREATE INDEX IF NOT EXISTS idx_aggregate_metadata_category 
    ON aggregate_metadata (tenant_id, category) 
    WHERE category IS NOT NULL;

-- 同步状态索引（用于查找需要同步的记录）
CREATE INDEX IF NOT EXISTS idx_aggregate_metadata_sync_status 
    ON aggregate_metadata (tenant_id, sync_status) 
    WHERE sync_status IS NOT NULL;

-- 嵌入状态索引（用于查找需要重新嵌入的记录）
CREATE INDEX IF NOT EXISTS idx_aggregate_metadata_embedding_status 
    ON aggregate_metadata (tenant_id, embedding_status) 
    WHERE embedding_status IS NOT NULL;

-- GIN 索引用于标签查询
CREATE INDEX IF NOT EXISTS idx_aggregate_metadata_tags_gin 
    ON aggregate_metadata USING GIN (tags) 
    WHERE tags IS NOT NULL;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_aggregate_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_aggregate_metadata_updated_at
    BEFORE UPDATE ON aggregate_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_aggregate_metadata_updated_at();

-- 添加注释
COMMENT ON TABLE aggregate_metadata IS '聚合根元数据表：存储所有聚合根的统一元数据，支持跨域查询';
COMMENT ON COLUMN aggregate_metadata.tenant_id IS '租户 ID（行级隔离）';
COMMENT ON COLUMN aggregate_metadata.aggregate_type IS '聚合类型（如 Tenant、User、Billing）';
COMMENT ON COLUMN aggregate_metadata.aggregate_id IS '聚合 ID';
COMMENT ON COLUMN aggregate_metadata.tags IS '标签列表（JSON 数组）';
COMMENT ON COLUMN aggregate_metadata.analytics_dimensions IS '分析维度（JSON 对象）';
COMMENT ON COLUMN aggregate_metadata.embedding_status IS '向量嵌入状态：PENDING/STALE/SYNCED/FAILED';
COMMENT ON COLUMN aggregate_metadata.sync_status IS '同步状态：SYNCED/PENDING/FAILED';
COMMENT ON COLUMN aggregate_metadata.external_ids IS '外部系统标识映射（JSON 对象）';
