-- ====================================================================
-- 分析报表读模型表回滚脚本
-- ====================================================================
-- 创建日期: 2026-02-19
-- 版本: 1.0.0
-- 描述: 回滚 analytics_reports 表的创建
-- ====================================================================

-- 取消定时任务
SELECT cron.unschedule('cleanup_expired_analytics_reports');

-- 删除函数
DROP FUNCTION IF EXISTS cleanup_expired_reports();

-- 删除表
DROP TABLE IF EXISTS analytics_reports CASCADE;

-- 输出成功消息
DO $$
BEGIN
    RAISE NOTICE 'Rollback 013_rollback_analytics_reports completed successfully';
END $$;
