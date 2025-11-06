# 里程碑 2：存储抽象层设计

**状态**：⏳ 待开始
**预计耗时**：60 分钟
**依赖**：里程碑 1

## 目标
设计统一的存储抽象层接口、类型系统和数据库表结构，为后续实现奠定基础

## 任务清单

### 1. 定义核心接口
- [ ] 在 `app/lib/storage/types.ts` 中定义 `StorageAdapter` 接口：
  ```typescript
  export interface StorageAdapter {
    // 基础操作
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;

    // 批量操作
    getMany<T>(keys: string[]): Promise<Map<string, T>>;
    setMany<T>(entries: Map<string, T>): Promise<void>;

    // 高级查询
    query<T>(options: QueryOptions): Promise<QueryResult<T>>;

    // 生命周期
    initialize(): Promise<void>;
    close(): Promise<void>;
  }
  ```

### 2. 定义查询接口
- [ ] 定义 `QueryOptions` 和 `QueryResult`：
  ```typescript
  export interface QueryOptions {
    table: string;
    where?: Record<string, unknown>;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
    limit?: number;
    offset?: number;
  }

  export interface QueryResult<T> {
    data: T[];
    total: number;
    hasMore: boolean;
  }
  ```

### 3. 定义数据模型
- [ ] 定义设置信息模型：
  ```typescript
  export interface SettingsModel {
    key: string;
    value: string; // JSON 字符串
    updated_at: number;
  }
  ```

- [ ] 定义XML版本模型：
  ```typescript
  export interface XmlVersionModel {
    version_id: string;      // 语义化版本号，如 "1.0.0"
    xml_content: string;     // DrawIO XML内容
    name: string;           // 版本名称/描述
    notes?: string;         // 版本备注
    created_at: number;
    updated_at: number;
  }
  ```

- [ ] 定义项目状态模型：
  ```typescript
  export interface ProjectStateModel {
    id: string;             // 固定为 'current'
    active_xml_version: string;  // 当前活动版本ID，默认 "1.0.0"
    active_session_id?: string;  // 当前活动会话ID
    last_modified: number;
  }
  ```

- [ ] 定义聊天会话模型：
  ```typescript
  export interface ChatSessionModel {
    id: string;
    title: string;
    xml_version: string;        // 会话创建时的XML版本
    created_at: number;
    updated_at: number;
  }

  export interface ChatMessageModel {
    id: string;
    session_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tool_invocations?: string; // JSON 字符串
    created_at: number;
  }
  ```

### 4. 定义数据库表结构
- [ ] 创建 `app/lib/storage/schema.ts`：
  ```typescript
  export const SQLITE_SCHEMA = `
    -- 设置信息表
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- XML版本表
    CREATE TABLE IF NOT EXISTS xml_versions (
      version_id TEXT PRIMARY KEY,
      xml_content TEXT NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 项目状态表
    CREATE TABLE IF NOT EXISTS project_state (
      id TEXT PRIMARY KEY DEFAULT 'current',
      active_xml_version TEXT NOT NULL DEFAULT '1.0.0',
      active_session_id TEXT,
      last_modified INTEGER NOT NULL,
      FOREIGN KEY (active_xml_version) REFERENCES xml_versions(version_id)
    );

    -- 聊天会话表
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      xml_version TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (xml_version) REFERENCES xml_versions(version_id)
    );

    -- 聊天消息表
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      tool_invocations TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_settings_updated_at
      ON settings(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_xml_versions_created_at
      ON xml_versions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_xml_versions_updated_at
      ON xml_versions(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_xml_version
      ON chat_sessions(xml_version);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id
      ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at
      ON chat_messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at
      ON chat_sessions(updated_at DESC);
  `;

  export const INDEXEDDB_SCHEMA = {
    name: 'drawio2go',
    version: 1,
    stores: [
      {
        name: 'settings',
        keyPath: 'key',
        indexes: [
          { name: 'updated_at', keyPath: 'updated_at' },
        ],
      },
      {
        name: 'xml_versions',
        keyPath: 'version_id',
        indexes: [
          { name: 'created_at', keyPath: 'created_at' },
          { name: 'updated_at', keyPath: 'updated_at' },
        ],
      },
      {
        name: 'project_state',
        keyPath: 'id',
      },
      {
        name: 'chat_sessions',
        keyPath: 'id',
        indexes: [
          { name: 'xml_version', keyPath: 'xml_version' },
          { name: 'updated_at', keyPath: 'updated_at' },
        ],
      },
      {
        name: 'chat_messages',
        keyPath: 'id',
        indexes: [
          { name: 'session_id', keyPath: 'session_id' },
          { name: 'created_at', keyPath: 'created_at' },
        ],
      },
    ],
  };
  ```

### 5. 定义存储键常量
- [ ] 创建 `app/lib/storage/keys.ts`：
  ```typescript
  // 设置信息键
  export const SETTINGS_KEYS = {
    LLM_CONFIG: 'llmConfig',
    DEFAULT_PATH: 'defaultPath',
    SIDEBAR_WIDTH: 'unifiedSidebarWidth',
  } as const;

  // XML版本相关键
  export const XML_VERSION_KEYS = {
    DEFAULT_VERSION: '1.0.0',  // 默认版本号
  } as const;

  // 项目状态键
  export const PROJECT_STATE_KEYS = {
    CURRENT: 'current',  // 项目状态记录ID
  } as const;

  // 表名
  export const TABLE_NAMES = {
    SETTINGS: 'settings',
    XML_VERSIONS: 'xml_versions',
    PROJECT_STATE: 'project_state',
    CHAT_SESSIONS: 'chat_sessions',
    CHAT_MESSAGES: 'chat_messages',
  } as const;
  ```

### 6. 定义错误类型
- [ ] 在 `app/lib/storage/types.ts` 中定义错误类：
  ```typescript
  export class StorageError extends Error {
    constructor(
      message: string,
      public code: StorageErrorCode,
      public cause?: unknown
    ) {
      super(message);
      this.name = 'StorageError';
    }
  }

  export enum StorageErrorCode {
    NOT_INITIALIZED = 'NOT_INITIALIZED',
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    QUERY_FAILED = 'QUERY_FAILED',
    NOT_FOUND = 'NOT_FOUND',
    INVALID_DATA = 'INVALID_DATA',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  }
  ```

### 7. 定义环境检测工具
- [ ] 创建 `app/lib/storage/utils.ts`：
  ```typescript
  export function isElectron(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.electron !== 'undefined'
    );
  }

  export function getStorageAdapter(): 'sqlite' | 'indexeddb' {
    return isElectron() ? 'sqlite' : 'indexeddb';
  }

  export function validateModel<T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ): T {
    return schema.parse(data);
  }
  ```

### 8. 定义 Zod 验证模式
- [ ] 在 `app/lib/storage/types.ts` 中添加验证模式：
  ```typescript
  import { z } from 'zod';

  export const SettingsSchema = z.object({
    key: z.string(),
    value: z.string(),
    updated_at: z.number().int().positive(),
  });

  export const XmlVersionSchema = z.object({
    version_id: z.string().regex(/^\d+\.\d+\.\d+$/), // 语义化版本号
    xml_content: z.string(),
    name: z.string().min(1).max(200),
    notes: z.string().optional(),
    created_at: z.number().int().positive(),
    updated_at: z.number().int().positive(),
  });

  export const ProjectStateSchema = z.object({
    id: z.string(),
    active_xml_version: z.string(),
    active_session_id: z.string().optional(),
    last_modified: z.number().int().positive(),
  });

  export const ChatSessionSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    xml_version: z.string(),
    created_at: z.number().int().positive(),
    updated_at: z.number().int().positive(),
  });

  export const ChatMessageSchema = z.object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    tool_invocations: z.string().optional(),
    created_at: z.number().int().positive(),
  });
  ```

### 9. 创建统一导出文件
- [ ] 在 `app/lib/storage/index.ts` 中导出所有类型：
  ```typescript
  export * from './types';
  export * from './schema';
  export * from './keys';
  export * from './utils';
  ```

## 验收标准
- [ ] 所有接口定义完整且类型安全
- [ ] 数据库表结构设计合理，包含必要的索引
- [ ] 数据模型与表结构一致
- [ ] 错误类型定义完整
- [ ] 环境检测工具正确实现
- [ ] Zod 验证模式覆盖所有数据模型
- [ ] TypeScript 编译无错误
- [ ] 支持多版本XML管理的数据结构
- [ ] 分级存储架构清晰明确

## 测试步骤
1. 运行 `pnpm run type-check` 验证类型定义
2. 检查 `app/lib/storage/types.ts` 是否导出所有必要类型
3. 检查 `app/lib/storage/schema.ts` 中的 SQL 语法是否正确
4. 验证 Zod 模式是否与数据模型匹配
5. 测试环境检测函数：
   ```typescript
   console.log('当前环境:', getStorageAdapter());
   ```

## 设计原则

### 1. 接口优先
- 先定义接口，再实现具体适配器
- 确保 SQLite 和 IndexedDB 适配器实现相同接口

### 2. 类型安全
- 使用 TypeScript 泛型确保类型推断
- 使用 Zod 进行运行时验证

### 3. 关系型设计
- 会话和消息分表存储
- 使用外键约束保证数据完整性
- 创建索引优化查询性能

### 4. 可扩展性
- 预留扩展字段（如 tool_invocations）
- 支持批量操作提升性能
- 支持分页查询处理大数据量

## 数据库设计说明

### 表关系
```
xml_versions (1) ──< (N) chat_sessions
project_state (1) ── (1) xml_versions (当前活动版本)
chat_sessions (1) ──< (N) chat_messages
settings (独立) - 存储配置信息
```

### 索引策略
- `idx_settings_updated_at`：加速设置查询排序
- `idx_xml_versions_created_at`：加速按创建时间排序版本
- `idx_xml_versions_updated_at`：加速按更新时间排序版本
- `idx_sessions_xml_version`：加速按XML版本查询会话
- `idx_messages_session_id`：加速按会话查询消息
- `idx_messages_created_at`：加速按时间排序
- `idx_sessions_updated_at`：加速会话列表排序

### 数据类型选择
- `TEXT`：字符串数据（ID、版本号、标题、内容、XML）
- `INTEGER`：时间戳（Unix 毫秒）
- `JSON 字符串`：复杂对象（settings value、tool_invocations）

### 分级存储架构
1. **设置信息**：独立表存储，键值对形式
2. **工程信息**：
   - XML版本管理：支持多版本存储和切换
   - 项目状态：跟踪当前活动版本和会话
   - 聊天历史：关联XML版本，支持历史追溯

## 注意事项
- 所有时间戳使用 Unix 毫秒（`Date.now()`）
- JSON 数据存储为字符串，读取时需要解析
- 外键约束在 SQLite 中需要手动启用：`PRAGMA foreign_keys = ON`
- IndexedDB 不支持外键，需要在应用层处理级联删除
- 版本号遵循语义化版本规范（如 1.0.0, 1.1.2, 2.3.21）
- 默认所有DrawIO操作定向到版本 "1.0.0"
- 会话创建时记录对应的XML版本，支持历史追溯
- DrawIO相关功能的重写实现详见 [里程碑 7：DrawIO 多版本管理实现](./milestone-7.md)

---

**下一步**：完成后继续 [里程碑 3：SQLite 适配器实现](./milestone-3.md)
