export * from './lib/setup-i18n-module';
export * from './lib/loader/multi-path-json.loader';
export * from './lib/validation/problem-details-response-body-formatter';

// 直接透传 nestjs-i18n 常用能力，避免 app 侧重复安装/查找导出入口
export { I18nValidationExceptionFilter, I18nValidationPipe, i18nValidationMessage } from 'nestjs-i18n';
