# 里程碑 3：SQLite 适配器实现

**状态**：⏳ 待开始
**预计耗时**：90 分钟
**依赖**：里程碑 2

## 目标
在 Electron 主进程中实现 SQLite 存储适配器，提供完整的数据库操作功能

## 任务清单

### 1. 创建 SQLite 适配器基础结构
- [ ] 创建 `electron/storage/sqlite-adapter.js`：
  ```javascript
  const Database = require('better-sqlite3');
  const path = require('path');
  const { app } = require('electron');
  const fs = require('fs');

  class SQLiteAdapter {
    constructor() {
      this.db = null;
      this.isInitialized = false;
    }

    async initialize() {
      if (this.isInitialized) return;

      // 获取用户数据目录
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'drawio2go.db');

      // 确保目录存在
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });

      // 初始化数据库
      this.db = new Database(dbPath);

      // 启用外键约束
      this.db.pragma('foreign_keys = ON');

      // 创建表结构
      this.createTables();

      this.isInitialized = true;
      console.log('[SQLite] 数据库初始化成功:', dbPath);
    }

    createTables() {
      const schema = `
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

      this.db.exec(schema);
    }

    close() {
      if (this.db) {
        this.db.close();
        this.isInitialized = false;
        console.log('[SQLite] 数据库已关闭');
      }
    }
  }

  module.exports = SQLiteAdapter;
  ```

### 2. 实现基础操作方法
- [ ] 添加 `get` 方法：
  ```javascript
  async get(key) {
    this.ensureInitialized();

    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key);

    if (!row) return null;

    try {
      return JSON.parse(row.value);
    } catch (error) {
      console.error('[SQLite] JSON 解析失败:', error);
      return row.value;
    }
  }
  ```

- [ ] 添加 `set` 方法：
  ```javascript
  async set(key, value) {
    this.ensureInitialized();

    const jsonValue = typeof value === 'string'
      ? value
      : JSON.stringify(value);

    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);

    stmt.run(key, jsonValue, Date.now());
  }
  ```

- [ ] 添加 `delete` 方法：
  ```javascript
  async delete(key) {
    this.ensureInitialized();

    const stmt = this.db.prepare('DELETE FROM settings WHERE key = ?');
    stmt.run(key);
  }
  ```

- [ ] 添加 `clear` 方法：
  ```javascript
  async clear() {
    this.ensureInitialized();

    this.db.exec('DELETE FROM settings');
    this.db.exec('DELETE FROM chat_messages');
    this.db.exec('DELETE FROM chat_sessions');
    this.db.exec('DELETE FROM project_state');
    this.db.exec('DELETE FROM xml_versions');
  }
  ```

### 3. 实现批量操作方法
- [ ] 添加 `getMany` 方法：
  ```javascript
  async getMany(keys) {
    this.ensureInitialized();

    const placeholders = keys.map(() => '?').join(',');
    const stmt = this.db.prepare(
      `SELECT key, value FROM settings WHERE key IN (${placeholders})`
    );

    const rows = stmt.all(...keys);
    const result = new Map();

    for (const row of rows) {
      try {
        result.set(row.key, JSON.parse(row.value));
      } catch {
        result.set(row.key, row.value);
      }
    }

    return result;
  }
  ```

- [ ] 添加 `setMany` 方法：
  ```javascript
  async setMany(entries) {
    this.ensureInitialized();

    const insert = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);

    const transaction = this.db.transaction((items) => {
      const now = Date.now();
      for (const [key, value] of items) {
        const jsonValue = typeof value === 'string'
          ? value
          : JSON.stringify(value);
        insert.run(key, jsonValue, now);
      }
    });

    transaction(entries);
  }
  ```

### 4. 实现高级查询方法
- [ ] 添加 `query` 方法：
  ```javascript
  async query(options) {
    this.ensureInitialized();

    const { table, where, orderBy, limit, offset } = options;

    // 构建 WHERE 子句
    let whereClause = '';
    const params = [];

    if (where) {
      const conditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      });
      whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';
    }

    // 构建 ORDER BY 子句
    const orderClause = orderBy
      ? `ORDER BY ${orderBy.field} ${orderBy.direction.toUpperCase()}`
      : '';

    // 构建 LIMIT/OFFSET 子句
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const offsetClause = offset ? `OFFSET ${offset}` : '';

    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`;
    const countStmt = this.db.prepare(countQuery);
    const { total } = countStmt.get(...params);

    // 查询数据
    const dataQuery = `
      SELECT * FROM ${table}
      ${whereClause}
      ${orderClause}
      ${limitClause}
      ${offsetClause}
    `;
    const dataStmt = this.db.prepare(dataQuery);
    const data = dataStmt.all(...params);

    return {
      data,
      total,
      hasMore: offset + data.length < total,
    };
  }
  ```

### 5. 实现聊天会话专用方法
- [ ] 添加 `saveChatSession` 方法：
  ```javascript
  async saveChatSession(session) {
    this.ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT INTO chat_sessions (id, title, xml_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      session.id,
      session.title,
      session.xml_version,
      session.created_at,
      session.updated_at
    );
  }
  ```

- [ ] 添加 `saveChatMessage` 方法：
  ```javascript
  async saveChatMessage(message) {
    this.ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT INTO chat_messages
        (id, session_id, role, content, tool_invocations, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        tool_invocations = excluded.tool_invocations
    `);

    stmt.run(
      message.id,
      message.session_id,
      message.role,
      message.content,
      message.tool_invocations || null,
      message.created_at
    );
  }
  ```

- [ ] 添加 `getChatMessages` 方法：
  ```javascript
  async getChatMessages(sessionId) {
    this.ensureInitialized();

    const stmt = this.db.prepare(`
      SELECT * FROM chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);

    return stmt.all(sessionId);
  }
  ```

- [ ] 添加 `deleteChatSession` 方法：
  ```javascript
  async deleteChatSession(sessionId) {
    this.ensureInitialized();

    // 外键约束会自动删除关联的消息
    const stmt = this.db.prepare('DELETE FROM chat_sessions WHERE id = ?');
    stmt.run(sessionId);
  }
  ```

### 6. XML 版本管理方法
> **注意**：图表数据管理已迁移到 XML 版本管理系统。
> 原 `saveDiagram()` 和 `getDiagram()` 方法已移除。
> 相关功能在 [里程碑 7：DrawIO 多版本管理实现](./milestone-7.md) 中实现。

### 7. 添加工具方法
- [ ] 添加 `ensureInitialized` 方法：
  ```javascript
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('SQLite 适配器未初始化，请先调用 initialize()');
    }
  }
  ```

- [ ] 添加 `vacuum` 方法（优化数据库）：
  ```javascript
  async vacuum() {
    this.ensureInitialized();
    this.db.exec('VACUUM');
    console.log('[SQLite] 数据库优化完成');
  }
  ```

- [ ] 添加 `getStats` 方法（获取统计信息）：
  ```javascript
  async getStats() {
    this.ensureInitialized();

    const sessions = this.db.prepare('SELECT COUNT(*) as count FROM chat_sessions').get();
    const messages = this.db.prepare('SELECT COUNT(*) as count FROM chat_messages').get();
    const xmlVersions = this.db.prepare('SELECT COUNT(*) as count FROM xml_versions').get();
    const settings = this.db.prepare('SELECT COUNT(*) as count FROM settings').get();

    return {
      sessions: sessions.count,
      messages: messages.count,
      xml_versions: xmlVersions.count,
      settings: settings.count,
    };
  }
  ```

## 验收标准
- [ ] SQLite 适配器成功初始化数据库
- [ ] 所有基础操作方法正常工作
- [ ] 批量操作使用事务保证原子性
- [ ] 查询方法支持分页和排序
- [ ] 聊天会话和消息正确关联
- [ ] 外键约束正常工作（级联删除）
- [ ] 错误处理完善

## 测试步骤
1. 创建测试脚本 `electron/test-sqlite.js`：
   ```javascript
   const SQLiteAdapter = require('./storage/sqlite-adapter');

   async function test() {
     const adapter = new SQLiteAdapter();
     await adapter.initialize();

     // 测试设置存储
     await adapter.set('test', { value: 'hello' });
     const result = await adapter.get('test');
     console.log('设置测试:', result);

     // 测试 XML 版本存储（需要先创建版本）
     // 注：完整的 XML 版本管理在里程碑 7 中实现

     // 测试会话存储（需要关联 XML 版本）
     await adapter.saveChatSession({
       id: 'test-session',
       title: '测试会话',
       xml_version: '1.0.0',
       created_at: Date.now(),
       updated_at: Date.now(),
     });

     // 测试消息存储
     await adapter.saveChatMessage({
       id: 'test-message',
       session_id: 'test-session',
       role: 'user',
       content: '你好',
       created_at: Date.now(),
     });

     // 查询消息
     const messages = await adapter.getChatMessages('test-session');
     console.log('消息查询:', messages);

     // 获取统计
     const stats = await adapter.getStats();
     console.log('统计信息:', stats);

     adapter.close();
   }

   test().catch(console.error);
   ```

2. 运行测试：
   ```bash
   node electron/test-sqlite.js
   ```

3. 验证数据库文件：
   ```bash
   sqlite3 ~/Library/Application\ Support/DrawIO2Go/drawio2go.db ".tables"
   ```

## 性能优化

### 1. 使用预编译语句
- 所有查询使用 `prepare()` 预编译
- 避免 SQL 注入风险

### 2. 使用事务
- 批量操作使用 `transaction()`
- 提升写入性能

### 3. 创建索引
- 为常用查询字段创建索引
- 定期运行 `VACUUM` 优化

## 注意事项
- better-sqlite3 是同步 API，但我们包装为异步以保持接口一致
- 数据库文件位于用户数据目录，跨平台兼容
- 外键约束需要手动启用：`PRAGMA foreign_keys = ON`
- 使用 `ON CONFLICT` 实现 upsert 操作
- 所有 JSON 数据存储为字符串

---

**下一步**：完成后继续 [里程碑 4：IndexedDB 适配器实现](./milestone-4.md)
