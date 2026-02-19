import { AIEnabledAggregateRoot, type EventStoreDomainEvent, EmbeddingStatus } from '@oksai/event-store';
import { DocumentId } from '../value-objects/document-id.value-object';
import { DocumentTitle } from '../value-objects/document-title.value-object';
import { DocumentContent } from '../value-objects/document-content.value-object';

/**
 * @description 文档领域事件类型
 */
type DocumentEvent = EventStoreDomainEvent;

/**
 * @description 文档状态枚举
 */
export enum DocumentStatus {
	/**
	 * 草稿
	 */
	DRAFT = 'DRAFT',

	/**
	 * 已发布
	 */
	PUBLISHED = 'PUBLISHED',

	/**
	 * 已归档
	 */
	ARCHIVED = 'ARCHIVED'
}

/**
 * @description 文档聚合根
 *
 * 继承 AIEnabledAggregateRoot，支持向量嵌入和智能检索
 *
 * 使用场景：
 * - 知识库文档管理
 * - 智能文档搜索
 * - 文档相似度推荐
 */
export class DocumentAggregate extends AIEnabledAggregateRoot<DocumentEvent> {
	private readonly _id: DocumentId;
	private _tenantId: string;
	private _title: DocumentTitle;
	private _content: DocumentContent;
	private _status: DocumentStatus;
	private _tags: string[] = [];
	private _category?: string;

	private constructor(id: DocumentId, tenantId: string, title: DocumentTitle, content: DocumentContent) {
		super();
		this._id = id;
		this._tenantId = tenantId;
		this._title = title;
		this._content = content;
		this._status = DocumentStatus.DRAFT;
	}

	// ==================== 工厂方法 ====================

	/**
	 * @description 创建新文档
	 */
	static create(id: DocumentId, tenantId: string, title: DocumentTitle, content: DocumentContent): DocumentAggregate {
		const doc = new DocumentAggregate(id, tenantId, title, content);

		doc.initAuditTimestamps();

		doc.addDomainEvent({
			eventType: 'DocumentCreated',
			aggregateId: id.toString(),
			occurredAt: doc.createdAt,
			eventData: {
				tenantId,
				title: title.getValue(),
				status: DocumentStatus.DRAFT
			},
			schemaVersion: 1
		});

		return doc;
	}

	/**
	 * @description 从历史事件重建
	 */
	static rehydrate(id: DocumentId, events: DocumentEvent[]): DocumentAggregate {
		const doc = new DocumentAggregate(id, '', DocumentTitle.of(''), DocumentContent.of(''));

		for (const e of events) {
			doc.apply(e);
			doc.version += 1;
		}

		doc.resetEventStateAfterRehydrate();
		return doc;
	}

	// ==================== 业务方法 ====================

	/**
	 * @description 更新内容
	 *
	 * 业务规则：
	 * - 内容变更后标记嵌入为过期
	 */
	updateContent(content: DocumentContent): void {
		if (this._content.equals(content)) return;

		this._content = content;
		this.markUpdated();
		this.markEmbeddingStale();

		this.addDomainEvent({
			eventType: 'DocumentContentUpdated',
			aggregateId: this._id.toString(),
			occurredAt: this.updatedAt,
			eventData: {
				contentLength: content.getLength()
			},
			schemaVersion: 1
		});
	}

	/**
	 * @description 更新标题
	 */
	updateTitle(title: DocumentTitle): void {
		if (this._title.equals(title)) return;

		this._title = title;
		this.markUpdated();

		this.addDomainEvent({
			eventType: 'DocumentTitleUpdated',
			aggregateId: this._id.toString(),
			occurredAt: this.updatedAt,
			eventData: {
				title: title.getValue()
			},
			schemaVersion: 1
		});
	}

	/**
	 * @description 发布文档
	 */
	publish(): void {
		if (this._status === DocumentStatus.PUBLISHED) return;

		this._status = DocumentStatus.PUBLISHED;
		this.markUpdated();

		this.addDomainEvent({
			eventType: 'DocumentPublished',
			aggregateId: this._id.toString(),
			occurredAt: this.updatedAt,
			eventData: {},
			schemaVersion: 1
		});
	}

	/**
	 * @description 归档文档
	 */
	archive(): void {
		if (this._status === DocumentStatus.ARCHIVED) return;

		this._status = DocumentStatus.ARCHIVED;
		this.markUpdated();

		this.addDomainEvent({
			eventType: 'DocumentArchived',
			aggregateId: this._id.toString(),
			occurredAt: this.updatedAt,
			eventData: {},
			schemaVersion: 1
		});
	}

	/**
	 * @description 添加标签
	 */
	addTag(tag: string): void {
		const normalizedTag = tag.trim().toLowerCase();
		if (this._tags.includes(normalizedTag)) return;

		this._tags.push(normalizedTag);
		this.markUpdated();
	}

	/**
	 * @description 移除标签
	 */
	removeTag(tag: string): void {
		const normalizedTag = tag.trim().toLowerCase();
		const index = this._tags.indexOf(normalizedTag);
		if (index >= 0) {
			this._tags.splice(index, 1);
			this.markUpdated();
		}
	}

	/**
	 * @description 设置分类
	 */
	setCategory(category: string): void {
		this._category = category;
		this.markUpdated();
	}

	// ==================== 事件应用 ====================

	protected apply(event: DocumentEvent): void {
		const data = event.eventData as any;

		switch (event.eventType) {
			case 'DocumentCreated':
				this._tenantId = data.tenantId;
				this._title = DocumentTitle.of(data.title);
				this._status = data.status as DocumentStatus;
				this._createdAt = event.occurredAt;
				this._updatedAt = event.occurredAt;
				break;

			case 'DocumentContentUpdated':
				this._updatedAt = event.occurredAt;
				break;

			case 'DocumentTitleUpdated':
				this._title = DocumentTitle.of(data.title);
				this._updatedAt = event.occurredAt;
				break;

			case 'DocumentPublished':
				this._status = DocumentStatus.PUBLISHED;
				this._updatedAt = event.occurredAt;
				break;

			case 'DocumentArchived':
				this._status = DocumentStatus.ARCHIVED;
				this._updatedAt = event.occurredAt;
				break;

			case 'DocumentEmbeddingUpdated':
				this._embeddingStatus = data.embeddingStatus;
				this._embeddingId = data.embeddingId;
				this._embeddingVersion = data.embeddingVersion;
				this._updatedAt = event.occurredAt;
				break;
		}
	}

	// ==================== Getters ====================

	get id(): DocumentId {
		return this._id;
	}

	get tenantId(): string {
		return this._tenantId;
	}

	get title(): DocumentTitle {
		return this._title;
	}

	get content(): DocumentContent {
		return this._content;
	}

	get status(): DocumentStatus {
		return this._status;
	}

	get tags(): string[] {
		return [...this._tags];
	}

	get category(): string | undefined {
		return this._category;
	}

	// 兼容旧 API
	getId(): DocumentId {
		return this._id;
	}

	getTenantId(): string {
		return this._tenantId;
	}
}
