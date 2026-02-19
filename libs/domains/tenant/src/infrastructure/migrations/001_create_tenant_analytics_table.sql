-- =====================================================
-- 租户分析读模型表迁移脚本
-- 创建时间：2026-02-19
-- 描述：为租户分析投影提供读模型存储
-- =====================================================

-- 创建租户分析读模型表
CREATE TABLE IF NOT EXISTS tenant_analytics_read_model (
    tenant_id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    member_count INTEGER NOT NULL DEFAULT 0,
    active_user_count INTEGER NOT NULL DEFAULT 0,
    data_import_count BIGINT NOT NULL DEFAULT 0,
    analysis_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE
);

-- 索引：按状态查询
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_status 
ON tenant_analytics_read_model(status);

-- 索引：按创建时间查询
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_created_at 
ON tenant_analytics_read_model(created_at);

-- 索引：按最后活跃时间查询
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_last_active_at 
ON tenant_analytics_read_model(last_active_at DESC);

-- 索引：按成员数排序
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_member_count 
ON tenant_analytics_read_model(member_count DESC);

-- 注释
COMMENT ON TABLE tenant_analytics_read_model IS '租户分析读模型：存储租户的统计数据';
COMMENT ON COLUMN tenant_analytics_read_model.tenant_id IS '租户 ID（主键）';
COMMENT ON COLUMN tenant_analytics_read_model.name IS '租户名称';
COMMENT ON COLUMN tenant_analytics_read_model.status IS '租户状态：active/suspended/pending';
COMMENT ON COLUMN tenant_analytics_read_model.member_count IS '成员数量';
COMMENT ON COLUMN tenant_analytics_read_model.active_user_count IS '活跃用户数';
COMMENT ON COLUMN tenant_analytics_read_model.data_import_count IS '数据导入次数';
COMMENT ON COLUMN tenant_analytics_read_model.analysis_count IS '分析查询次数';
COMMENT ON COLUMN tenant_analytics_read_model.created_at IS '创建时间';
COMMENT ON COLUMN tenant_analytics_read_model.updated_at IS '最后更新时间';
COMMENT ON COLUMN tenant_analytics_read_model.last_active_at IS '最后活跃时间';
