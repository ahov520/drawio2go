# 里程碑 4：IndexedDB 适配器实现

**状态**：⏳ 待开始
**预计耗时**：90 分钟
**依赖**：里程碑 2

## 目标
在 Web 环境中实现 IndexedDB 存储适配器，提供与 SQLite 适配器相同的接口

## 任务清单

### 1. 创建 IndexedDB 适配器基础结构
- [ ] 创建 `app/lib/storage/indexeddb-adapter.ts`：
  ```typescript
  import { openDB, IDBPDatabase } from 'idb';
  import type {
    StorageAdapter,
    QueryOptions,
    QueryResult,
    ChatSessionModel,
    ChatMessageModel,
    DiagramModel,
  } from './types';
  import { StorageError, StorageErrorCode } from './types';

  export class IndexedDBAdapter implements StorageAdapter {
    private db: IDBPDatabase | null = null;
    private isInitialized = false;
    private readonly DB_NAME = 'drawio2go';
    private readonly DB_VERSION = 1;

    async initialize(): Promise<void> {
      if (this.isInitialized) return;

      try {
        this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
          upgrade(db) {
            // 创建 chat_sessions 存储
            if (!db.objectStoreNames.contains('chat_sessions')) {
              const sessionsStore = db.createObjectStore('chat_sessions', {
                keyPath: 'id',
              });
              sessionsStore.createIndex('updated_at', 'updated_at');
            }

            // 创建 chat_messages 存储
            if (!db.objectStoreNames.contains('chat_messages')) {
              const messagesStore = db.createObjectStore('chat_messages', {
                keyPath: 'id',
              });
              messagesStore.createIndex('session_id', 'session_id');
              messagesStore.createIndex('created_at', 'created_at');
            }

            // 创建 diagrams 存储
            if (!db.objectStoreNames.contains('diagrams')) {
              db.createObjectStore('diagrams', { keyPath: 'id' });
            }

            // 创建 config 存储
            if (!db.objectStoreNames.contains('config')) {
              db.createObjectStore('config', { keyPath: 'key' });
            }
          },
        });

        this.isInitialized = true;
        console.log('[IndexedDB] 数据库初始化成功');
      } catch (error) {
        throw new StorageError(
          'IndexedDB 初始化失败',
          StorageErrorCode.CONNECTION_FAILED,
          error
        );
      }
    }

    async close(): Promise<void> {
      if (this.db) {
        this.db.close();
        this.isInitialized = false;
        console.log('[IndexedDB] 数据库已关闭');
      }
    }

    private ensureInitialized(): void {
      if (!this.isInitialized || !this.db) {
        throw new StorageError(
          'IndexedDB 适配器未初始化',
          StorageErrorCode.NOT_INITIALIZED
        );
      }
    }
  }
  ```

### 2. 实现基础操作方法
- [ ] 添加 `get` 方法：
  ```typescript
  async get<T>(key: string): Promise<T | null> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('config', 'readonly');
      const store = tx.objectStore('config');
      const result = await store.get(key);

      if (!result) return null;

      // 解析 JSON 值
      try {
        return JSON.parse(result.value);
      } catch {
        return result.value;
      }
    } catch (error) {
      throw new StorageError(
        `获取配置失败: ${key}`,
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

- [ ] 添加 `set` 方法：
  ```typescript
  async set<T>(key: string, value: T): Promise<void> {
    this.ensureInitialized();

    try {
      const jsonValue =
        typeof value === 'string' ? value : JSON.stringify(value);

      const tx = this.db!.transaction('config', 'readwrite');
      const store = tx.objectStore('config');
      await store.put({ key, value: jsonValue });
      await tx.done;
    } catch (error) {
      throw new StorageError(
        `保存配置失败: ${key}`,
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

- [ ] 添加 `delete` 方法：
  ```typescript
  async delete(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('config', 'readwrite');
      const store = tx.objectStore('config');
      await store.delete(key);
      await tx.done;
    } catch (error) {
      throw new StorageError(
        `删除配置失败: ${key}`,
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

- [ ] 添加 `clear` 方法：
  ```typescript
  async clear(): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction(
        ['config', 'chat_sessions', 'chat_messages', 'diagrams'],
        'readwrite'
      );

      await Promise.all([
        tx.objectStore('config').clear(),
        tx.objectStore('chat_sessions').clear(),
        tx.objectStore('chat_messages').clear(),
        tx.objectStore('diagrams').clear(),
      ]);

      await tx.done;
    } catch (error) {
      throw new StorageError(
        '清空数据失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

### 3. 实现批量操作方法
- [ ] 添加 `getMany` 方法：
  ```typescript
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('config', 'readonly');
      const store = tx.objectStore('config');

      const results = await Promise.all(
        keys.map((key) => store.get(key))
      );

      const map = new Map<string, T>();
      results.forEach((result, index) => {
        if (result) {
          try {
            map.set(keys[index], JSON.parse(result.value));
          } catch {
            map.set(keys[index], result.value);
          }
        }
      });

      return map;
    } catch (error) {
      throw new StorageError(
        '批量获取配置失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

- [ ] 添加 `setMany` 方法：
  ```typescript
  async setMany<T>(entries: Map<string, T>): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('config', 'readwrite');
      const store = tx.objectStore('config');

      const promises = Array.from(entries.entries()).map(([key, value]) => {
        const jsonValue =
          typeof value === 'string' ? value : JSON.stringify(value);
        return store.put({ key, value: jsonValue });
      });

      await Promise.all(promises);
      await tx.done;
    } catch (error) {
      throw new StorageError(
        '批量保存配置失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

### 4. 实现高级查询方法
- [ ] 添加 `query` 方法：
  ```typescript
  async query<T>(options: QueryOptions): Promise<QueryResult<T>> {
    this.ensureInitialized();

    try {
      const { table, where, orderBy, limit, offset = 0 } = options;

      const tx = this.db!.transaction(table, 'readonly');
      const store = tx.objectStore(table);

      // 获取所有数据
      let allData: T[] = await store.getAll();

      // 应用 WHERE 过滤
      if (where) {
        allData = allData.filter((item: any) => {
          return Object.entries(where).every(
            ([key, value]) => item[key] === value
          );
        });
      }

      // 应用排序
      if (orderBy) {
        allData.sort((a: any, b: any) => {
          const aVal = a[orderBy.field];
          const bVal = b[orderBy.field];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return orderBy.direction === 'asc' ? comparison : -comparison;
        });
      }

      const total = allData.length;

      // 应用分页
      const start = offset;
      const end = limit ? start + limit : undefined;
      const data = allData.slice(start, end);

      return {
        data,
        total,
        hasMore: end ? end < total : false,
      };
    } catch (error) {
      throw new StorageError(
        `查询失败: ${options.table}`,
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

### 5. 实现聊天会话专用方法
- [ ] 添加 `saveChatSession` 方法：
  ```typescript
  async saveChatSession(session: ChatSessionModel): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('chat_sessions', 'readwrite');
      await tx.objectStore('chat_sessions').put(session);
      await tx.done;
    } catch (error) {
      throw new StorageError(
        '保存会话失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

- [ ] 添加 `saveChatMessage` 方法：
  ```typescript
  async saveChatMessage(message: ChatMessageModel): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('chat_messages', 'readwrite');
      await tx.objectStore('chat_messages').put(message);
      await tx.done;
    } catch (error) {
      throw new StorageError(
        '保存消息失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

- [ ] 添加 `getChatMessages` 方法：
  ```typescript
  async getChatMessages(sessionId: string): Promise<ChatMessageModel[]> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('chat_messages', 'readonly');
      const store = tx.objectStore('chat_messages');
      const index = store.index('session_id');

      const messages = await index.getAll(sessionId);

      // 按创建时间排序
      return messages.sort((a, b) => a.created_at - b.created_at);
    } catch (error) {
      throw new StorageError(
        '获取消息失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

- [ ] 添加 `deleteChatSession` 方法（手动级联删除）：
  ```typescript
  async deleteChatSession(sessionId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction(
        ['chat_sessions', 'chat_messages'],
        'readwrite'
      );

      // 删除会话
      await tx.objectStore('chat_sessions').delete(sessionId);

      // 手动删除关联消息（IndexedDB 不支持外键）
      const messagesStore = tx.objectStore('chat_messages');
      const index = messagesStore.index('session_id');
      const messages = await index.getAllKeys(sessionId);

      await Promise.all(messages.map((key) => messagesStore.delete(key)));

      await tx.done;
    } catch (error) {
      throw new StorageError(
        '删除会话失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

### 6. 实现图表数据专用方法
- [ ] 添加 `saveDiagram` 方法：
  ```typescript
  async saveDiagram(id: string, xmlContent: string): Promise<void> {
    this.ensureInitialized();

    try {
      const diagram: DiagramModel = {
        id,
        xml_content: xmlContent,
        updated_at: Date.now(),
      };

      const tx = this.db!.transaction('diagrams', 'readwrite');
      await tx.objectStore('diagrams').put(diagram);
      await tx.done;
    } catch (error) {
      throw new StorageError(
        '保存图表失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

- [ ] 添加 `getDiagram` 方法：
  ```typescript
  async getDiagram(id: string): Promise<DiagramModel | null> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('diagrams', 'readonly');
      const result = await tx.objectStore('diagrams').get(id);
      return result || null;
    } catch (error) {
      throw new StorageError(
        '获取图表失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

### 7. 添加工具方法
- [ ] 添加 `getStats` 方法：
  ```typescript
  async getStats(): Promise<{
    sessions: number;
    messages: number;
    diagrams: number;
  }> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction(
        ['chat_sessions', 'chat_messages', 'diagrams'],
        'readonly'
      );

      const [sessions, messages, diagrams] = await Promise.all([
        tx.objectStore('chat_sessions').count(),
        tx.objectStore('chat_messages').count(),
        tx.objectStore('diagrams').count(),
      ]);

      return { sessions, messages, diagrams };
    } catch (error) {
      throw new StorageError(
        '获取统计信息失败',
        StorageErrorCode.QUERY_FAILED,
        error
      );
    }
  }
  ```

## 验收标准
- [ ] IndexedDB 适配器成功初始化数据库
- [ ] 所有基础操作方法正常工作
- [ ] 批量操作正确实现
- [ ] 查询方法支持分页和排序
- [ ] 聊天会话和消息正确关联
- [ ] 手动级联删除正常工作
- [ ] 错误处理完善，使用统一的 StorageError

## 测试步骤
1. 创建测试页面 `app/test-storage/page.tsx`：
   ```typescript
   'use client';

   import { useEffect, useState } from 'react';
   import { IndexedDBAdapter } from '@/lib/storage/indexeddb-adapter';

   export default function TestStoragePage() {
     const [result, setResult] = useState<string>('');

     useEffect(() => {
       async function test() {
         const adapter = new IndexedDBAdapter();
         await adapter.initialize();

         // 测试配置存储
         await adapter.set('test', { value: 'hello' });
         const config = await adapter.get('test');
         console.log('配置测试:', config);

         // 测试会话存储
         await adapter.saveChatSession({
           id: 'test-session',
           title: '测试会话',
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

         setResult(JSON.stringify(stats, null, 2));
       }

       test().catch(console.error);
     }, []);

     return (
       <div className="p-8">
         <h1 className="text-2xl font-bold mb-4">IndexedDB 测试</h1>
         <pre className="bg-gray-100 p-4 rounded">{result}</pre>
       </div>
     );
   }
   ```

2. 访问 `http://localhost:3000/test-storage`

3. 打开浏览器开发者工具 > Application > IndexedDB

4. 验证数据结构和内容

## IndexedDB 特性说明

### 1. 异步 API
- 所有操作都是异步的
- 使用 `idb` 库简化 Promise 处理

### 2. 事务机制
- 读操作使用 `readonly` 事务
- 写操作使用 `readwrite` 事务
- 多表操作需要在同一事务中

### 3. 索引查询
- 使用 `index.getAll()` 按索引查询
- 比全表扫描更高效

### 4. 手动级联删除
- IndexedDB 不支持外键约束
- 需要在应用层实现级联删除

## 注意事项
- IndexedDB 存储在浏览器中，用户可以清除
- 不同域名的数据是隔离的
- 存储容量受浏览器限制（通常 > 50MB）
- 使用 `idb` 库简化 IndexedDB API

---

**下一步**：完成后继续 [里程碑 5：Electron IPC 桥接](./milestone-5.md)
