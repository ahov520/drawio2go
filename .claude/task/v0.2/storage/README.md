# 抽象存储层重构任务规划 v0.2

## 项目目标
构建统一的抽象存储层，将所有存储请求（设置、DrawIO 数据、聊天记录等）路由到不同的存储后端：
- **Electron 环境**：使用 SQLite 数据库（better-sqlite3）
- **Web 环境**：使用 IndexedDB（idb 封装）

## 技术要求
1. ✅ 完全异步的现代化 API 设计
2. ✅ 使用 better-sqlite3 实现 SQLite 存储（Electron）
3. ✅ 使用 idb 实现 IndexedDB 存储（Web）
4. ✅ 关系型数据库设计（会话表 + 消息表）
5. ✅ 破坏性更改，不保留 localStorage 兼容性
6. ✅ 完整的类型安全保障
7. ✅ Electron IPC 通信桥接

## 里程碑总览

| 里程碑 | 文件 | 预计耗时 | 状态 | 依赖 | 核心内容 |
|--------|------|----------|------|------|----------|
| 1. 依赖安装与构建配置 | [milestone-1.md](./milestone-1.md) | 45 分钟 | ⏳ 待开始 | 无 | 安装依赖、配置 Electron 原生模块 |
| 2. 存储抽象层设计 | [milestone-2.md](./milestone-2.md) | 60 分钟 | ⏳ 待开始 | 1 | 接口定义、类型系统、数据库设计 |
| 3. SQLite 适配器实现 | [milestone-3.md](./milestone-3.md) | 90 分钟 | ⏳ 待开始 | 2 | Electron 主进程 SQLite 实现 |
| 4. IndexedDB 适配器实现 | [milestone-4.md](./milestone-4.md) | 90 分钟 | ⏳ 待开始 | 2 | Web 环境 IndexedDB 实现 |
| 5. Electron IPC 桥接 | [milestone-5.md](./milestone-5.md) | 60 分钟 | ⏳ 待开始 | 3 | 主进程与渲染进程通信 |
| 6. 聊天会话数据迁移 | [milestone-6.md](./milestone-6.md) | 90 分钟 | ⏳ 待开始 | 2, 3, 4, 5 | 重构 useChatSessions Hook |
| 7. DrawIO 数据迁移 | [milestone-7.md](./milestone-7.md) | 60 分钟 | ⏳ 待开始 | 2, 3, 4, 5 | 重构 drawio-tools.ts |
| 8. LLM 配置数据迁移 | [milestone-8.md](./milestone-8.md) | 45 分钟 | ⏳ 待开始 | 2, 3, 4, 5 | 重构 useLLMConfig Hook |
| 9. UI 组件适配 | [milestone-9.md](./milestone-9.md) | 90 分钟 | ⏳ 待开始 | 6, 7, 8 | 加载状态、错误处理、Skeleton |
| 10. 集成测试与优化 | [milestone-10.md](./milestone-10.md) | 120 分钟 | ⏳ 待开始 | 1-9 | 双端测试、性能优化、错误处理 |

**总预计耗时**：约 12 小时

## 推荐执行顺序

### 阶段 1：基础设施（里程碑 1-2）
```
里程碑 1（依赖安装） → 里程碑 2（抽象层设计）
```
**目标**：建立存储层的基础架构和类型系统

### 阶段 2：存储实现（里程碑 3-5）
```
里程碑 3（SQLite 适配器） ⟍
                            → 里程碑 5（IPC 桥接）
里程碑 4（IndexedDB 适配器）⟋
```
**目标**：实现双端存储后端和通信机制

### 阶段 3：数据迁移（里程碑 6-8）
```
里程碑 6（聊天数据） ⟍
里程碑 7（DrawIO 数据）→ 里程碑 9（UI 适配）
里程碑 8（配置数据） ⟋
```
**目标**：将现有代码迁移到新存储层

### 阶段 4：测试优化（里程碑 10）
```
里程碑 10（集成测试与优化）
```
**目标**：确保系统稳定性和性能

## 环境要求
- ✅ Node.js 18+ 和 pnpm
- ✅ Electron 38.x
- ✅ Next.js 15 + React 19
- 📦 需要安装：`better-sqlite3`, `idb`, `@types/better-sqlite3`
- 🔧 需要配置：Electron 原生模块构建

## 核心架构特性

### 🗄️ 统一存储抽象层
```typescript
interface StorageAdapter {
  // 基础操作
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>

  // 高级查询
  query<T>(options: QueryOptions): Promise<T[]>
}
```

### 🔀 双端路由机制
```
┌─────────────────────────────────────────────────────────┐
│                    存储抽象层                            │
│  统一接口：get/set/query/delete                         │
├─────────────────────────────────────────────────────────┤
│  Electron 环境        │  Web 环境                        │
│  - SQLite (主存储)    │  - IndexedDB (主存储)            │
│  - IPC 通信           │  - 直接调用                      │
└─────────────────────────────────────────────────────────┘
```

### 📊 关系型数据库设计
```sql
-- 聊天会话表
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)

-- 聊天消息表
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_invocations TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
)

-- 图表数据表
CREATE TABLE diagrams (
  id TEXT PRIMARY KEY DEFAULT 'current',
  xml_content TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)

-- 配置表
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
```

### 🎯 数据分层策略
1. **配置数据**（LLM 配置、UI 设置）
   - 小数据量，频繁读取
   - 存储在 `config` 表

2. **图表数据**（DrawIO XML）
   - 中等数据量，实时保存
   - 存储在 `diagrams` 表

3. **聊天数据**（会话、消息）
   - 大数据量，增长型
   - 关系型存储，支持复杂查询

## 破坏性变更说明

由于项目未上线，直接进行破坏性更改：

1. ❌ **删除所有 localStorage 调用**
2. ✅ **所有存储操作改为异步**
3. ✅ **组件需要处理加载状态**
4. ✅ **不保留向后兼容性**
5. ✅ **数据库优先设计**

## 预期收益

### 容量提升
- ❌ localStorage：5-10MB 限制
- ✅ SQLite/IndexedDB：无限制（受磁盘空间限制）

### 性能优化
- ❌ 同步操作阻塞 UI
- ✅ 异步操作，不阻塞渲染

### 查询能力
- ❌ 无法搜索历史消息
- ✅ 支持 SQL 查询、分页、排序

### 数据安全
- ❌ 无备份机制
- ✅ 支持导出、备份、事务

### 用户体验
- ❌ 大型图表可能超出限制
- ✅ 支持任意大小的图表和海量会话

## 风险控制

### 技术风险
1. **Electron 原生模块编译**
   - 风险：不同平台需要单独构建
   - 缓解：使用 electron-builder 自动处理

2. **异步改造工作量**
   - 风险：所有 Hook 需要改造
   - 缓解：分阶段迁移，逐步验证

3. **IPC 通信复杂度**
   - 风险：主进程与渲染进程通信可能出错
   - 缓解：完整的错误处理和类型定义

### 测试策略
1. **单元测试**：每个适配器独立测试
2. **集成测试**：双端存储一致性测试
3. **性能测试**：大数据量压力测试
4. **兼容性测试**：跨平台构建测试

## 快速开始

### 开发环境准备
```bash
# 安装依赖
pnpm install

# 开发模式（自动重载）
pnpm run dev

# 构建 Electron 应用
pnpm run build:electron
```

### 测试存储功能
```bash
# 测试 SQLite（Electron 环境）
pnpm run dev:electron

# 测试 IndexedDB（Web 环境）
pnpm run dev
```

### 验证数据迁移
```bash
# 1. 启动应用
# 2. 打开开发者工具
# 3. 查看 Application > IndexedDB（Web）或数据库文件（Electron）
# 4. 验证数据结构和内容
```

## 项目状态

**⏳ 抽象存储层重构 v0.2 待开始**

**计划成果**：
- 🗄️ 统一的存储抽象层
- 🔀 双端路由机制（SQLite + IndexedDB）
- 📊 关系型数据库设计
- 🚀 完全异步的现代化 API
- 🎯 破坏性更改，不保留旧兼容性
- 🛠️ 完整的类型安全保障

---

*创建时间: 2025-11-06*
*版本: v0.2*
*状态: ⏳ 待开始*
