# 里程碑 5：Electron IPC 桥接

**状态**：⏳ 待开始
**预计耗时**：60 分钟
**依赖**：里程碑 3

## 目标
实现 Electron 主进程与渲染进程之间的 IPC 通信桥接，使渲染进程能够通过统一接口访问 SQLite 存储

## 任务清单

### 1. 在主进程中注册存储 IPC 处理器
- [ ] 修改 `electron/main.js`，添加存储适配器初始化：
  ```javascript
  const { app, BrowserWindow, ipcMain, dialog } = require('electron');
  const SQLiteAdapter = require('./storage/sqlite-adapter');

  // 全局存储适配器实例
  let storageAdapter = null;

  app.whenReady().then(async () => {
    // 初始化存储适配器
    storageAdapter = new SQLiteAdapter();
    await storageAdapter.initialize();

    // 注册 IPC 处理器
    registerStorageHandlers();

    createWindow();
  });

  app.on('before-quit', () => {
    if (storageAdapter) {
      storageAdapter.close();
    }
  });
  ```

### 2. 实现基础操作 IPC 处理器
- [ ] 在 `electron/main.js` 中添加 `registerStorageHandlers` 函数：
  ```javascript
  function registerStorageHandlers() {
    // 基础操作
    ipcMain.handle('storage:get', async (event, key) => {
      try {
        return await storageAdapter.get(key);
      } catch (error) {
        console.error('[IPC] storage:get 失败:', error);
        throw error;
      }
    });

    ipcMain.handle('storage:set', async (event, key, value) => {
      try {
        await storageAdapter.set(key, value);
      } catch (error) {
        console.error('[IPC] storage:set 失败:', error);
        throw error;
      }
    });

    ipcMain.handle('storage:delete', async (event, key) => {
      try {
        await storageAdapter.delete(key);
      } catch (error) {
        console.error('[IPC] storage:delete 失败:', error);
        throw error;
      }
    });

    ipcMain.handle('storage:clear', async () => {
      try {
        await storageAdapter.clear();
      } catch (error) {
        console.error('[IPC] storage:clear 失败:', error);
        throw error;
      }
    });
  }
  ```

### 3. 实现批量操作 IPC 处理器
- [ ] 添加批量操作处理器：
  ```javascript
  ipcMain.handle('storage:getMany', async (event, keys) => {
    try {
      const result = await storageAdapter.getMany(keys);
      // Map 转换为普通对象以便序列化
      return Object.fromEntries(result);
    } catch (error) {
      console.error('[IPC] storage:getMany 失败:', error);
      throw error;
    }
  });

  ipcMain.handle('storage:setMany', async (event, entries) => {
    try {
      // 普通对象转换为 Map
      const map = new Map(Object.entries(entries));
      await storageAdapter.setMany(map);
    } catch (error) {
      console.error('[IPC] storage:setMany 失败:', error);
      throw error;
    }
  });
  ```

### 4. 实现查询 IPC 处理器
- [ ] 添加查询处理器：
  ```javascript
  ipcMain.handle('storage:query', async (event, options) => {
    try {
      return await storageAdapter.query(options);
    } catch (error) {
      console.error('[IPC] storage:query 失败:', error);
      throw error;
    }
  });
  ```

### 5. 实现聊天会话 IPC 处理器
- [ ] 添加聊天会话处理器：
  ```javascript
  ipcMain.handle('storage:saveChatSession', async (event, session) => {
    try {
      await storageAdapter.saveChatSession(session);
    } catch (error) {
      console.error('[IPC] storage:saveChatSession 失败:', error);
      throw error;
    }
  });

  ipcMain.handle('storage:saveChatMessage', async (event, message) => {
    try {
      await storageAdapter.saveChatMessage(message);
    } catch (error) {
      console.error('[IPC] storage:saveChatMessage 失败:', error);
      throw error;
    }
  });

  ipcMain.handle('storage:getChatMessages', async (event, sessionId) => {
    try {
      return await storageAdapter.getChatMessages(sessionId);
    } catch (error) {
      console.error('[IPC] storage:getChatMessages 失败:', error);
      throw error;
    }
  });

  ipcMain.handle('storage:deleteChatSession', async (event, sessionId) => {
    try {
      await storageAdapter.deleteChatSession(sessionId);
    } catch (error) {
      console.error('[IPC] storage:deleteChatSession 失败:', error);
      throw error;
    }
  });
  ```

### 6. 实现图表数据 IPC 处理器
- [ ] 添加图表数据处理器：
  ```javascript
  ipcMain.handle('storage:saveDiagram', async (event, id, xmlContent) => {
    try {
      await storageAdapter.saveDiagram(id, xmlContent);
    } catch (error) {
      console.error('[IPC] storage:saveDiagram 失败:', error);
      throw error;
    }
  });

  ipcMain.handle('storage:getDiagram', async (event, id) => {
    try {
      return await storageAdapter.getDiagram(id);
    } catch (error) {
      console.error('[IPC] storage:getDiagram 失败:', error);
      throw error;
    }
  });
  ```

### 7. 实现工具方法 IPC 处理器
- [ ] 添加工具方法处理器：
  ```javascript
  ipcMain.handle('storage:getStats', async () => {
    try {
      return await storageAdapter.getStats();
    } catch (error) {
      console.error('[IPC] storage:getStats 失败:', error);
      throw error;
    }
  });

  ipcMain.handle('storage:vacuum', async () => {
    try {
      await storageAdapter.vacuum();
    } catch (error) {
      console.error('[IPC] storage:vacuum 失败:', error);
      throw error;
    }
  });
  ```

### 8. 在 preload 中暴露存储 API
- [ ] 修改 `electron/preload.js`，添加存储 API：
  ```javascript
  const { contextBridge, ipcRenderer } = require('electron');

  contextBridge.exposeInMainWorld('electron', {
    // 现有的 API...
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    saveDiagram: (xml, defaultPath) =>
      ipcRenderer.invoke('save-diagram', xml, defaultPath),
    // ... 其他现有 API

    // 新增：存储 API
    storage: {
      // 基础操作
      get: (key) => ipcRenderer.invoke('storage:get', key),
      set: (key, value) => ipcRenderer.invoke('storage:set', key, value),
      delete: (key) => ipcRenderer.invoke('storage:delete', key),
      clear: () => ipcRenderer.invoke('storage:clear'),

      // 批量操作
      getMany: (keys) => ipcRenderer.invoke('storage:getMany', keys),
      setMany: (entries) => ipcRenderer.invoke('storage:setMany', entries),

      // 查询
      query: (options) => ipcRenderer.invoke('storage:query', options),

      // 聊天会话
      saveChatSession: (session) =>
        ipcRenderer.invoke('storage:saveChatSession', session),
      saveChatMessage: (message) =>
        ipcRenderer.invoke('storage:saveChatMessage', message),
      getChatMessages: (sessionId) =>
        ipcRenderer.invoke('storage:getChatMessages', sessionId),
      deleteChatSession: (sessionId) =>
        ipcRenderer.invoke('storage:deleteChatSession', sessionId),

      // 图表数据
      saveDiagram: (id, xmlContent) =>
        ipcRenderer.invoke('storage:saveDiagram', id, xmlContent),
      getDiagram: (id) => ipcRenderer.invoke('storage:getDiagram', id),

      // 工具方法
      getStats: () => ipcRenderer.invoke('storage:getStats'),
      vacuum: () => ipcRenderer.invoke('storage:vacuum'),
    },
  });
  ```

### 9. 创建渲染进程 SQLite 适配器包装器
- [ ] 创建 `app/lib/storage/electron-sqlite-adapter.ts`：
  ```typescript
  import type {
    StorageAdapter,
    QueryOptions,
    QueryResult,
    ChatSessionModel,
    ChatMessageModel,
    DiagramModel,
  } from './types';
  import { StorageError, StorageErrorCode } from './types';

  declare global {
    interface Window {
      electron?: {
        storage: {
          get: (key: string) => Promise<any>;
          set: (key: string, value: any) => Promise<void>;
          delete: (key: string) => Promise<void>;
          clear: () => Promise<void>;
          getMany: (keys: string[]) => Promise<Record<string, any>>;
          setMany: (entries: Record<string, any>) => Promise<void>;
          query: (options: QueryOptions) => Promise<QueryResult<any>>;
          saveChatSession: (session: ChatSessionModel) => Promise<void>;
          saveChatMessage: (message: ChatMessageModel) => Promise<void>;
          getChatMessages: (sessionId: string) => Promise<ChatMessageModel[]>;
          deleteChatSession: (sessionId: string) => Promise<void>;
          saveDiagram: (id: string, xmlContent: string) => Promise<void>;
          getDiagram: (id: string) => Promise<DiagramModel | null>;
          getStats: () => Promise<{
            sessions: number;
            messages: number;
            diagrams: number;
          }>;
          vacuum: () => Promise<void>;
        };
      };
    }
  }

  export class ElectronSQLiteAdapter implements StorageAdapter {
    private isInitialized = false;

    async initialize(): Promise<void> {
      if (this.isInitialized) return;

      if (!window.electron?.storage) {
        throw new StorageError(
          'Electron 存储 API 不可用',
          StorageErrorCode.NOT_INITIALIZED
        );
      }

      this.isInitialized = true;
      console.log('[ElectronSQLite] 适配器初始化成功');
    }

    async close(): Promise<void> {
      this.isInitialized = false;
    }

    private ensureInitialized(): void {
      if (!this.isInitialized) {
        throw new StorageError(
          'Electron SQLite 适配器未初始化',
          StorageErrorCode.NOT_INITIALIZED
        );
      }
    }

    async get<T>(key: string): Promise<T | null> {
      this.ensureInitialized();
      return window.electron!.storage.get(key);
    }

    async set<T>(key: string, value: T): Promise<void> {
      this.ensureInitialized();
      return window.electron!.storage.set(key, value);
    }

    async delete(key: string): Promise<void> {
      this.ensureInitialized();
      return window.electron!.storage.delete(key);
    }

    async clear(): Promise<void> {
      this.ensureInitialized();
      return window.electron!.storage.clear();
    }

    async getMany<T>(keys: string[]): Promise<Map<string, T>> {
      this.ensureInitialized();
      const result = await window.electron!.storage.getMany(keys);
      return new Map(Object.entries(result));
    }

    async setMany<T>(entries: Map<string, T>): Promise<void> {
      this.ensureInitialized();
      const obj = Object.fromEntries(entries);
      return window.electron!.storage.setMany(obj);
    }

    async query<T>(options: QueryOptions): Promise<QueryResult<T>> {
      this.ensureInitialized();
      return window.electron!.storage.query(options);
    }

    // 聊天会话方法
    async saveChatSession(session: ChatSessionModel): Promise<void> {
      this.ensureInitialized();
      return window.electron!.storage.saveChatSession(session);
    }

    async saveChatMessage(message: ChatMessageModel): Promise<void> {
      this.ensureInitialized();
      return window.electron!.storage.saveChatMessage(message);
    }

    async getChatMessages(sessionId: string): Promise<ChatMessageModel[]> {
      this.ensureInitialized();
      return window.electron!.storage.getChatMessages(sessionId);
    }

    async deleteChatSession(sessionId: string): Promise<void> {
      this.ensureInitialized();
      return window.electron!.storage.deleteChatSession(sessionId);
    }

    // 图表数据方法
    async saveDiagram(id: string, xmlContent: string): Promise<void> {
      this.ensureInitialized();
      return window.electron!.storage.saveDiagram(id, xmlContent);
    }

    async getDiagram(id: string): Promise<DiagramModel | null> {
      this.ensureInitialized();
      return window.electron!.storage.getDiagram(id);
    }

    // 工具方法
    async getStats(): Promise<{
      sessions: number;
      messages: number;
      diagrams: number;
    }> {
      this.ensureInitialized();
      return window.electron!.storage.getStats();
    }

    async vacuum(): Promise<void> {
      this.ensureInitialized();
      return window.electron!.storage.vacuum();
    }
  }
  ```

### 10. 创建统一的存储工厂
- [ ] 修改 `app/lib/storage/index.ts`：
  ```typescript
  import { ElectronSQLiteAdapter } from './electron-sqlite-adapter';
  import { IndexedDBAdapter } from './indexeddb-adapter';
  import type { StorageAdapter } from './types';
  import { isElectron } from './utils';

  let storageInstance: StorageAdapter | null = null;

  export async function getStorage(): Promise<StorageAdapter> {
    if (storageInstance) {
      return storageInstance;
    }

    const adapter = isElectron()
      ? new ElectronSQLiteAdapter()
      : new IndexedDBAdapter();

    await adapter.initialize();
    storageInstance = adapter;

    return storageInstance;
  }

  export * from './types';
  export * from './keys';
  export * from './utils';
  ```

## 验收标准
- [ ] IPC 处理器正确注册并响应
- [ ] 渲染进程能够通过 `window.electron.storage` 访问存储
- [ ] 所有存储操作正确转发到主进程
- [ ] 错误正确传播到渲染进程
- [ ] `getStorage()` 工厂函数根据环境返回正确的适配器
- [ ] 类型定义完整且正确

## 测试步骤
1. 启动 Electron 应用：
   ```bash
   pnpm run dev:electron
   ```

2. 在渲染进程中测试存储：
   ```typescript
   import { getStorage } from '@/lib/storage';

   async function test() {
     const storage = await getStorage();

     // 测试配置存储
     await storage.set('test', { value: 'hello' });
     const result = await storage.get('test');
     console.log('配置测试:', result);

     // 测试统计
     const stats = await storage.getStats();
     console.log('统计信息:', stats);
   }

   test();
   ```

3. 打开开发者工具查看日志

4. 验证数据库文件：
   ```bash
   # macOS
   sqlite3 ~/Library/Application\ Support/DrawIO2Go/drawio2go.db ".tables"

   # Linux
   sqlite3 ~/.config/DrawIO2Go/drawio2go.db ".tables"

   # Windows
   sqlite3 %APPDATA%\DrawIO2Go\drawio2go.db ".tables"
   ```

## IPC 通信流程

```
┌─────────────────────────────────────────────────────────┐
│                    渲染进程                              │
│  ElectronSQLiteAdapter                                  │
│    ↓ window.electron.storage.get('key')                │
├─────────────────────────────────────────────────────────┤
│                    Preload                              │
│  ipcRenderer.invoke('storage:get', 'key')               │
├─────────────────────────────────────────────────────────┤
│                    主进程                                │
│  ipcMain.handle('storage:get', ...)                     │
│    ↓ storageAdapter.get('key')                          │
│  SQLiteAdapter                                          │
│    ↓ db.prepare('SELECT ...').get()                     │
│  SQLite 数据库                                           │
└─────────────────────────────────────────────────────────┘
```

## 注意事项
- IPC 通信是异步的，所有方法返回 Promise
- Map 对象需要转换为普通对象才能序列化
- 错误对象需要正确序列化和反序列化
- 主进程在应用退出时需要关闭数据库连接
- 使用 `contextBridge` 确保安全的 IPC 通信

---

**下一步**：完成后继续 [里程碑 6：聊天会话数据迁移](./milestone-6.md)
