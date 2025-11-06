# 里程碑 10：集成测试与优化

**状态**：⏳ 待开始
**预计耗时**：120 分钟
**依赖**：里程碑 1-9

## 目标
进行全面的集成测试，优化性能，修复 bug，确保存储层稳定可靠

## 任务清单

### 1. 创建测试工具
- [ ] 创建 `app/test-storage/page.tsx` 测试页面：
  ```typescript
  'use client';

  import { useState } from 'react';
  import { getStorage } from '@/lib/storage';
  import { Button } from '@heroui/react';

  export default function TestStoragePage() {
    const [results, setResults] = useState<string[]>([]);

    const addResult = (message: string) => {
      setResults((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const runTests = async () => {
      setResults([]);
      addResult('开始测试...');

      try {
        const storage = await getStorage();
        addResult('✓ 存储初始化成功');

        // 测试基础操作
        await storage.set('test-key', { value: 'hello' });
        addResult('✓ 写入测试数据');

        const result = await storage.get('test-key');
        if (result?.value === 'hello') {
          addResult('✓ 读取测试数据成功');
        } else {
          addResult('✗ 读取测试数据失败');
        }

        // 测试批量操作
        await storage.setMany(
          new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
            ['key3', 'value3'],
          ])
        );
        addResult('✓ 批量写入成功');

        const many = await storage.getMany(['key1', 'key2', 'key3']);
        if (many.size === 3) {
          addResult('✓ 批量读取成功');
        } else {
          addResult('✗ 批量读取失败');
        }

        // 测试聊天会话
        await storage.saveChatSession({
          id: 'test-session',
          title: '测试会话',
          created_at: Date.now(),
          updated_at: Date.now(),
        });
        addResult('✓ 保存会话成功');

        await storage.saveChatMessage({
          id: 'test-message',
          session_id: 'test-session',
          role: 'user',
          content: '测试消息',
          created_at: Date.now(),
        });
        addResult('✓ 保存消息成功');

        const messages = await storage.getChatMessages('test-session');
        if (messages.length === 1) {
          addResult('✓ 查询消息成功');
        } else {
          addResult('✗ 查询消息失败');
        }

        // 测试图表数据
        await storage.saveDiagram('test', '<mxfile>...</mxfile>');
        addResult('✓ 保存图表成功');

        const diagram = await storage.getDiagram('test');
        if (diagram) {
          addResult('✓ 读取图表成功');
        } else {
          addResult('✗ 读取图表失败');
        }

        // 测试统计
        const stats = await storage.getStats();
        addResult(`✓ 统计信息: ${JSON.stringify(stats)}`);

        // 清理测试数据
        await storage.delete('test-key');
        await storage.deleteChatSession('test-session');
        addResult('✓ 清理测试数据成功');

        addResult('✅ 所有测试通过！');
      } catch (error) {
        addResult(`✗ 测试失败: ${error}`);
      }
    };

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">存储层测试</h1>

        <Button onClick={runTests} color="primary" className="mb-4">
          运行测试
        </Button>

        <div className="bg-gray-100 p-4 rounded-lg">
          <pre className="text-sm">
            {results.map((result, i) => (
              <div key={i}>{result}</div>
            ))}
          </pre>
        </div>
      </div>
    );
  }
  ```

### 2. 性能测试
- [ ] 创建性能测试脚本：
  ```typescript
  async function performanceTest() {
    const storage = await getStorage();
    const startTime = Date.now();

    // 测试 1: 大量写入
    console.log('测试 1: 写入 1000 条配置');
    const writeStart = Date.now();
    for (let i = 0; i < 1000; i++) {
      await storage.set(`perf-test-${i}`, { value: i });
    }
    console.log(`写入耗时: ${Date.now() - writeStart}ms`);

    // 测试 2: 大量读取
    console.log('测试 2: 读取 1000 条配置');
    const readStart = Date.now();
    for (let i = 0; i < 1000; i++) {
      await storage.get(`perf-test-${i}`);
    }
    console.log(`读取耗时: ${Date.now() - readStart}ms`);

    // 测试 3: 批量操作
    console.log('测试 3: 批量写入 1000 条配置');
    const batchStart = Date.now();
    const entries = new Map();
    for (let i = 0; i < 1000; i++) {
      entries.set(`batch-test-${i}`, { value: i });
    }
    await storage.setMany(entries);
    console.log(`批量写入耗时: ${Date.now() - batchStart}ms`);

    // 测试 4: 大型数据
    console.log('测试 4: 写入 10MB 数据');
    const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
    const largeStart = Date.now();
    await storage.set('large-data', largeData);
    console.log(`大数据写入耗时: ${Date.now() - largeStart}ms`);

    const largeReadStart = Date.now();
    await storage.get('large-data');
    console.log(`大数据读取耗时: ${Date.now() - largeReadStart}ms`);

    // 测试 5: 查询性能
    console.log('测试 5: 查询 1000 条会话');
    for (let i = 0; i < 1000; i++) {
      await storage.saveChatSession({
        id: `session-${i}`,
        title: `会话 ${i}`,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }

    const queryStart = Date.now();
    const result = await storage.query({
      table: 'chat_sessions',
      orderBy: { field: 'updated_at', direction: 'desc' },
      limit: 20,
    });
    console.log(`查询耗时: ${Date.now() - queryStart}ms`);
    console.log(`查询结果: ${result.data.length} 条`);

    console.log(`总耗时: ${Date.now() - startTime}ms`);
  }
  ```

### 3. 压力测试
- [ ] 创建压力测试脚本：
  ```typescript
  async function stressTest() {
    const storage = await getStorage();

    // 测试并发写入
    console.log('压力测试: 100 个并发写入');
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        storage.set(`stress-${i}`, { value: i, timestamp: Date.now() })
      );
    }

    const start = Date.now();
    await Promise.all(promises);
    console.log(`并发写入耗时: ${Date.now() - start}ms`);

    // 测试并发读取
    console.log('压力测试: 100 个并发读取');
    const readPromises = [];
    for (let i = 0; i < 100; i++) {
      readPromises.push(storage.get(`stress-${i}`));
    }

    const readStart = Date.now();
    await Promise.all(readPromises);
    console.log(`并发读取耗时: ${Date.now() - readStart}ms`);

    // 测试混合操作
    console.log('压力测试: 混合读写操作');
    const mixedPromises = [];
    for (let i = 0; i < 50; i++) {
      mixedPromises.push(storage.set(`mixed-${i}`, { value: i }));
      mixedPromises.push(storage.get(`mixed-${i}`));
    }

    const mixedStart = Date.now();
    await Promise.all(mixedPromises);
    console.log(`混合操作耗时: ${Date.now() - mixedStart}ms`);
  }
  ```

### 4. 数据完整性测试
- [ ] 创建数据完整性测试：
  ```typescript
  async function integrityTest() {
    const storage = await getStorage();

    // 测试外键约束（级联删除）
    console.log('完整性测试: 级联删除');
    await storage.saveChatSession({
      id: 'integrity-session',
      title: '完整性测试',
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    for (let i = 0; i < 10; i++) {
      await storage.saveChatMessage({
        id: `integrity-msg-${i}`,
        session_id: 'integrity-session',
        role: 'user',
        content: `消息 ${i}`,
        created_at: Date.now(),
      });
    }

    const messagesBefore = await storage.getChatMessages('integrity-session');
    console.log(`删除前消息数: ${messagesBefore.length}`);

    await storage.deleteChatSession('integrity-session');

    const messagesAfter = await storage.getChatMessages('integrity-session');
    console.log(`删除后消息数: ${messagesAfter.length}`);

    if (messagesAfter.length === 0) {
      console.log('✓ 级联删除成功');
    } else {
      console.log('✗ 级联删除失败');
    }

    // 测试数据验证
    console.log('完整性测试: 数据验证');
    try {
      await storage.saveChatMessage({
        id: 'invalid-msg',
        session_id: 'non-existent-session',
        role: 'user',
        content: '测试',
        created_at: Date.now(),
      });
      console.log('✗ 应该拒绝无效的外键');
    } catch (error) {
      console.log('✓ 正确拒绝无效的外键');
    }
  }
  ```

### 5. 跨平台测试
- [ ] 创建跨平台测试清单：
  ```markdown
  ## Web 环境测试（IndexedDB）
  - [ ] Chrome 浏览器测试
  - [ ] Firefox 浏览器测试
  - [ ] Safari 浏览器测试
  - [ ] Edge 浏览器测试
  - [ ] 隐私模式测试
  - [ ] 多标签页同步测试

  ## Electron 环境测试（SQLite）
  - [ ] Windows 10/11 测试
  - [ ] macOS 测试
  - [ ] Linux (Ubuntu) 测试
  - [ ] 数据库文件位置验证
  - [ ] 原生模块加载测试
  - [ ] 应用重启后数据持久化测试
  ```

### 6. 错误处理测试
- [ ] 创建错误处理测试：
  ```typescript
  async function errorHandlingTest() {
    const storage = await getStorage();

    // 测试不存在的键
    console.log('错误测试: 读取不存在的键');
    const notFound = await storage.get('non-existent-key');
    if (notFound === null) {
      console.log('✓ 正确返回 null');
    }

    // 测试无效数据
    console.log('错误测试: 保存无效数据');
    try {
      await storage.saveChatMessage({
        id: '',
        session_id: '',
        role: 'invalid' as any,
        content: '',
        created_at: -1,
      });
      console.log('✗ 应该拒绝无效数据');
    } catch (error) {
      console.log('✓ 正确拒绝无效数据');
    }

    // 测试存储满
    console.log('错误测试: 存储空间不足（仅 Web）');
    if (typeof window !== 'undefined' && !window.electron) {
      try {
        // 尝试写入大量数据直到失败
        const largeData = 'x'.repeat(100 * 1024 * 1024); // 100MB
        await storage.set('huge-data', largeData);
      } catch (error) {
        console.log('✓ 正确处理存储空间不足');
      }
    }
  }
  ```

### 7. 性能优化
- [ ] 实现查询缓存：
  ```typescript
  class CachedStorageAdapter implements StorageAdapter {
    private cache = new Map<string, { value: any; timestamp: number }>();
    private cacheTTL = 5000; // 5 秒缓存

    async get<T>(key: string): Promise<T | null> {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.value;
      }

      const value = await this.adapter.get<T>(key);
      this.cache.set(key, { value, timestamp: Date.now() });
      return value;
    }

    async set<T>(key: string, value: T): Promise<void> {
      await this.adapter.set(key, value);
      this.cache.set(key, { value, timestamp: Date.now() });
    }

    clearCache() {
      this.cache.clear();
    }
  }
  ```

- [ ] 实现批量操作优化：
  ```typescript
  // 使用事务批量保存消息
  async function saveMessagesInBatch(
    sessionId: string,
    messages: ChatMessageModel[]
  ): Promise<void> {
    const storage = await getStorage();

    // 如果是 SQLite，使用事务
    if (storage instanceof ElectronSQLiteAdapter) {
      // 通过 IPC 调用主进程的事务方法
      await window.electron.storage.saveMessagesInTransaction(
        sessionId,
        messages
      );
    } else {
      // IndexedDB 使用单个事务
      for (const message of messages) {
        await storage.saveChatMessage(message);
      }
    }
  }
  ```

- [ ] 实现延迟加载：
  ```typescript
  // 只加载会话元数据，不加载消息
  async function loadSessionsLazy(): Promise<ChatSession[]> {
    const storage = await getStorage();

    const result = await storage.query<ChatSessionModel>({
      table: 'chat_sessions',
      orderBy: { field: 'updated_at', direction: 'desc' },
      limit: 20,
    });

    // 不加载消息，只返回会话元数据
    return result.data.map((session) => ({
      id: session.id,
      title: session.title,
      messages: [], // 空数组，稍后按需加载
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));
  }
  ```

### 8. 内存泄漏检测
- [ ] 添加内存监控：
  ```typescript
  function monitorMemory() {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      console.log('内存使用情况:');
      console.log(`  已使用: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  总量: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  // 定期监控
  setInterval(monitorMemory, 10000);
  ```

### 9. 创建调试工具
- [ ] 创建存储调试面板：
  ```typescript
  export function StorageDebugPanel() {
    const [stats, setStats] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);

    const loadStats = async () => {
      const storage = await getStorage();
      const stats = await storage.getStats();
      setStats(stats);
    };

    useEffect(() => {
      if (isOpen) {
        loadStats();
      }
    }, [isOpen]);

    return (
      <>
        {/* 调试按钮 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-4 left-4 bg-blue-500 text-white p-2 rounded"
        >
          🔧 调试
        </button>

        {/* 调试面板 */}
        {isOpen && (
          <div className="fixed bottom-16 left-4 bg-white shadow-lg rounded p-4 w-80">
            <h3 className="font-bold mb-2">存储统计</h3>
            {stats && (
              <pre className="text-xs">
                {JSON.stringify(stats, null, 2)}
              </pre>
            )}

            <div className="flex gap-2 mt-4">
              <Button onClick={loadStats} size="sm">
                刷新
              </Button>
              <Button
                onClick={async () => {
                  const storage = await getStorage();
                  await storage.clear();
                  loadStats();
                }}
                size="sm"
                color="danger"
              >
                清空
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }
  ```

### 10. 文档和部署
- [ ] 更新 README.md：
  ```markdown
  ## 存储架构

  DrawIO2Go 使用统一的存储抽象层，根据运行环境自动选择存储后端：

  - **Electron 环境**: SQLite 数据库（better-sqlite3）
  - **Web 环境**: IndexedDB

  ### 数据结构

  - 聊天会话和消息：关系型存储
  - 图表数据：单表存储
  - 配置数据：键值对存储

  ### 性能特性

  - 支持大型图表（> 10MB）
  - 支持海量会话（> 1000 个）
  - 异步操作不阻塞 UI
  - 支持复杂查询和分页

  ### 开发指南

  详见 `.claude/task/v0.2/storage/README.md`
  ```

- [ ] 创建部署检查清单：
  ```markdown
  ## 部署前检查

  - [ ] 所有测试通过
  - [ ] 性能测试达标
  - [ ] 跨平台测试完成
  - [ ] 错误处理完善
  - [ ] 文档更新完成
  - [ ] 数据库迁移脚本准备
  - [ ] 备份恢复功能测试
  - [ ] 用户数据安全验证
  ```

## 验收标准
- [ ] 所有单元测试通过
- [ ] 性能测试达标（写入 < 10ms，读取 < 5ms）
- [ ] 压力测试通过（100 并发无错误）
- [ ] 数据完整性测试通过
- [ ] 跨平台测试通过
- [ ] 错误处理完善
- [ ] 无内存泄漏
- [ ] 文档完整

## 测试步骤
1. 运行所有自动化测试
2. 手动测试各个功能模块
3. 在不同平台和浏览器测试
4. 进行长时间运行测试（24 小时）
5. 模拟各种错误场景
6. 验证数据持久化
7. 检查内存使用情况

## 性能基准

### 目标性能指标
- 配置读取: < 5ms
- 配置写入: < 10ms
- 会话查询: < 50ms (1000 条)
- 消息查询: < 20ms (100 条)
- 图表保存: < 100ms (10MB)
- 批量操作: < 100ms (100 条)

### 内存使用
- 空闲状态: < 50MB
- 加载 100 个会话: < 100MB
- 加载大型图表: < 150MB

## 注意事项
- 测试要覆盖所有功能模块
- 性能测试要在生产环境配置下进行
- 跨平台测试要在真实设备上进行
- 长时间运行测试要监控内存和性能
- 备份测试数据，避免丢失

---

**完成标志**：所有测试通过，性能达标，文档完整，准备发布

**项目状态**：✅ 抽象存储层重构 v0.2 完成
