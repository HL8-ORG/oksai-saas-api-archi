-- ====================================================================
-- 分析报表读模型表迁移脚本
-- ====================================================================
-- 创建日期: 2026-02-19
-- 版本: 1.0.0
-- 描述: 创建 analytics_reports 表，用于存储分析报表结果
-- ====================================================================

-- 创建分析报表表
CREATE TABLE IF NOT EXISTS analytics_reports (
    -- 主键字段
    tenant_id VARCHAR(255) NOT NULL,
    report_id VARCHAR(255) NOT NULL,

    -- 报表基本信息
    report_name VARCHAR(500) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,

    -- 报表配置
    report_config JSONB NOT NULL,

    -- 报表结果
    report_rows JSONB NOT NULL,
    report_summary JSONB,
    metadata JSONB,

    -- 审计字段
    created_by VARCHAR(255),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    -- 主键约束
    PRIMARY KEY (tenant_id, report_id)
);

-- 创建索引
CREATE INDEX idx_analytics_reports_type ON analytics_reports(tenant_id, report_type);
CREATE INDEX idx_analytics_reports_generated_at ON analytics_reports(tenant_id, generated_at);
CREATE INDEX idx_analytics_reports_expires_at ON analytics_reports(expires_at) WHERE expires_at IS NOT NULL;

-- 添加注释
COMMENT ON TABLE analytics_reports IS '分析报表读模型，存储生成的报表结果';
COMMENT ON COLUMN analytics_reports.tenant_id IS '租户 ID（行级隔离）';
COMMENT ON COLUMN analytics_reports.report_id IS '报表唯一标识';
COMMENT ON COLUMN analytics_reports.report_name IS '报表名称';
COMMENT ON COLUMN analytics_reports.report_type IS '报表类型（SUMMARY/TREND/QUALITY/COMPARISON）';
COMMENT ON COLUMN analytics_reports.generated_at IS '报表生成时间';
COMMENT ON COLUMN analytics_reports.expires_at IS '报表过期时间（用于缓存清理）';
COMMENT ON COLUMN analytics_reports.report_config IS '报表配置（JSON 格式）';
COMMENT ON COLUMN analytics_reports.report_rows IS '报表数据行（JSON 格式）';
COMMENT ON COLUMN analytics_reports.report_summary IS '报表汇总信息（JSON 格式）';
COMMENT ON COLUMN analytics_reports.metadata IS '报表元数据（JSON 格式）';
COMMENT ON COLUMN analytics_reports.created_by IS '报表创建者用户 ID';
COMMENT ON COLUMN analytics_reports.is_deleted IS '是否已删除';

-- ====================================================================
-- 数据清理函数（用于清理过期报表）
-- ====================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_reports
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

-- 创建定时任务扩展（如果不存在）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每天凌晨 2 点清理过期报表
SELECT cron.schedule(
    'cleanup_expired_analytics_reports',
    '0 2 * * *',
    $$SELECT cleanup_expired_reports()$$
);

-- ====================================================================
-- 授权（根据实际数据库用户调整）
-- ====================================================================

-- GRANT ALL PRIVILEGES ON TABLE analytics_reports TO your_app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_reports() TO your_app_user;

-- ====================================================================
-- 验证
-- ====================================================================

-- 验证表创建
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'analytics_reports'
    ) THEN
        RAISE EXCEPTION 'Table analytics_reports was not created successfully';
    END IF;
END $$;

-- 验证索引创建
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_analytics_reports_type'
    ) THEN
        RAISE EXCEPTION 'Index idx_analytics_reports_type was not created successfully';
    END IF;
END $$;

-- 输出成功消息
DO $$
BEGIN
    RAISE NOTICE 'Migration 012_create_analytics_reports completed successfully';
END $$;
