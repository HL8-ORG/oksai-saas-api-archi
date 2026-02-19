-- =====================================================
-- 事件溯源快照表迁移脚本
-- 创建时间：2026-02-19
-- 描述：为聚合快照提供存储能力，加速事件溯源重建
-- =====================================================

-- 创建快照表
CREATE TABLE IF NOT EXISTS event_store_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL,
    state JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- 唯一约束：每个聚合每个版本只能有一个快照
    CONSTRAINT uk_snapshot_aggregate_version UNIQUE (tenant_id, aggregate_type, aggregate_id, version)
);

-- 索引：按聚合查询最新快照
CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate 
ON event_store_snapshots(tenant_id, aggregate_type, aggregate_id, version DESC);

-- 索引：按创建时间查询（用于清理旧快照）
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at 
ON event_store_snapshots(created_at);

-- 注释
COMMENT ON TABLE event_store_snapshots IS '聚合快照表：存储聚合根在某一时刻的完整状态';
COMMENT ON COLUMN event_store_snapshots.id IS '快照唯一标识';
COMMENT ON COLUMN event_store_snapshots.tenant_id IS '租户 ID（行级隔离）';
COMMENT ON COLUMN event_store_snapshots.aggregate_type IS '聚合类型，如 Tenant、Billing';
COMMENT ON COLUMN event_store_snapshots.aggregate_id IS '聚合 ID';
COMMENT ON COLUMN event_store_snapshots.version IS '快照对应的聚合版本号';
COMMENT ON COLUMN event_store_snapshots.state IS '聚合状态（JSON 格式）';
COMMENT ON COLUMN event_store_snapshots.metadata IS '快照元数据（压缩算法、序列化格式等）';
COMMENT ON COLUMN event_store_snapshots.created_at IS '快照创建时间';
