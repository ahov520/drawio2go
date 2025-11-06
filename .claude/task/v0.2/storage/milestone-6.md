# 里程碑 6：聊天会话数据迁移

**状态**：⏳ 待开始
**预计耗时**：90 分钟
**依赖**：里程碑 2, 3, 4, 5

## 目标
将聊天会话管理从 localStorage 迁移到新的存储抽象层，实现关系型存储和异步操作

## 任务清单

### 1. 重构 useChatSessions Hook
- [ ] 修改 `app/hooks/useChatSessions.ts`，移除 localStorage 依赖：
  ```typescript
  'use client';

  import { useState, useEffect, useCallback } from 'react';
  import { v4 as uuidv4 } from 'uuid';
  import type { UIMessage } from '@/types/chat';
  import { getStorage } from '@/lib/storage';
  import type { ChatSessionModel, ChatMessageModel } from '@/lib/storage';
  import { TABLE_NAMES } from '@/lib/storage';

  export interface ChatSession {
    id: string;
    title: string;
    messages: UIMessage[];
    createdAt: number;
    updatedAt: number;
  }

  export interface ChatSessionsData {
    sessions: Record<string, ChatSession>;
    activeSessionId: string | null;
    sessionOrder: string[];
  }

  export function useChatSessions() {
    const [sessionsData, setSessionsData] = useState<ChatSessionsData>({
      sessions: {},
      activeSessionId: null,
      sessionOrder: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // 初始化：从存储加载会话
    useEffect(() => {
      async function loadSessions() {
        try {
          setIsLoading(true);
          const storage = await getStorage();

          // 查询所有会话（按更新时间倒序）
          const result = await storage.query<ChatSessionModel>({
            table: TABLE_NAMES.CHAT_SESSIONS,
            orderBy: { field: 'updated_at', direction: 'desc' },
          });

          // 加载每个会话的消息
          const sessions: Record<string, ChatSession> = {};
          const sessionOrder: string[] = [];

          for (const sessionModel of result.data) {
            const messages = await storage.getChatMessages(sessionModel.id);

            sessions[sessionModel.id] = {
              id: sessionModel.id,
              title: sessionModel.title,
              messages: messages.map(convertMessageModelToUI),
              createdAt: sessionModel.created_at,
              updatedAt: sessionModel.updated_at,
            };

            sessionOrder.push(sessionModel.id);
          }

          // 设置活动会话（最近更新的）
          const activeSessionId = sessionOrder[0] || null;

          setSessionsData({ sessions, activeSessionId, sessionOrder });
          setError(null);
        } catch (err) {
          console.error('[useChatSessions] 加载会话失败:', err);
          setError(err as Error);
        } finally {
          setIsLoading(false);
        }
      }

      loadSessions();
    }, []);

    // 保存会话到存储
    const saveSession = useCallback(async (session: ChatSession) => {
      try {
        const storage = await getStorage();

        // 保存会话元数据
        const sessionModel: ChatSessionModel = {
          id: session.id,
          title: session.title,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
        };
        await storage.saveChatSession(sessionModel);

        // 保存所有消息
        for (const message of session.messages) {
          const messageModel = convertUIMessageToModel(message, session.id);
          await storage.saveChatMessage(messageModel);
        }
      } catch (err) {
        console.error('[useChatSessions] 保存会话失败:', err);
        throw err;
      }
    }, []);

    // 创建新会话
    const createSession = useCallback(async () => {
      const newSession: ChatSession = {
        id: uuidv4(),
        title: '新对话',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await saveSession(newSession);

        setSessionsData((prev) => ({
          sessions: { ...prev.sessions, [newSession.id]: newSession },
          activeSessionId: newSession.id,
          sessionOrder: [newSession.id, ...prev.sessionOrder],
        }));

        return newSession.id;
      } catch (err) {
        console.error('[useChatSessions] 创建会话失败:', err);
        throw err;
      }
    }, [saveSession]);

    // 删除会话
    const deleteSession = useCallback(async (sessionId: string) => {
      try {
        const storage = await getStorage();
        await storage.deleteChatSession(sessionId);

        setSessionsData((prev) => {
          const newSessions = { ...prev.sessions };
          delete newSessions[sessionId];

          const newOrder = prev.sessionOrder.filter((id) => id !== sessionId);
          const newActiveId =
            prev.activeSessionId === sessionId
              ? newOrder[0] || null
              : prev.activeSessionId;

          return {
            sessions: newSessions,
            activeSessionId: newActiveId,
            sessionOrder: newOrder,
          };
        });
      } catch (err) {
        console.error('[useChatSessions] 删除会话失败:', err);
        throw err;
      }
    }, []);

    // 更新会话消息
    const updateSessionMessages = useCallback(
      async (sessionId: string, messages: UIMessage[]) => {
        try {
          const session = sessionsData.sessions[sessionId];
          if (!session) {
            throw new Error(`会话不存在: ${sessionId}`);
          }

          const updatedSession: ChatSession = {
            ...session,
            messages,
            updatedAt: Date.now(),
          };

          await saveSession(updatedSession);

          setSessionsData((prev) => ({
            ...prev,
            sessions: {
              ...prev.sessions,
              [sessionId]: updatedSession,
            },
            // 更新会话顺序（最近更新的排在前面）
            sessionOrder: [
              sessionId,
              ...prev.sessionOrder.filter((id) => id !== sessionId),
            ],
          }));
        } catch (err) {
          console.error('[useChatSessions] 更新消息失败:', err);
          throw err;
        }
      },
      [sessionsData.sessions, saveSession]
    );

    // 更新会话标题
    const updateSessionTitle = useCallback(
      async (sessionId: string, title: string) => {
        try {
          const session = sessionsData.sessions[sessionId];
          if (!session) {
            throw new Error(`会话不存在: ${sessionId}`);
          }

          const updatedSession: ChatSession = {
            ...session,
            title,
            updatedAt: Date.now(),
          };

          await saveSession(updatedSession);

          setSessionsData((prev) => ({
            ...prev,
            sessions: {
              ...prev.sessions,
              [sessionId]: updatedSession,
            },
          }));
        } catch (err) {
          console.error('[useChatSessions] 更新标题失败:', err);
          throw err;
        }
      },
      [sessionsData.sessions, saveSession]
    );

    // 切换活动会话
    const setActiveSession = useCallback((sessionId: string | null) => {
      setSessionsData((prev) => ({
        ...prev,
        activeSessionId: sessionId,
      }));
    }, []);

    return {
      sessionsData,
      isLoading,
      error,
      createSession,
      deleteSession,
      updateSessionMessages,
      updateSessionTitle,
      setActiveSession,
    };
  }

  // 辅助函数：将数据库模型转换为 UI 模型
  function convertMessageModelToUI(model: ChatMessageModel): UIMessage {
    const message: UIMessage = {
      id: model.id,
      role: model.role as 'user' | 'assistant' | 'system',
      content: model.content,
      createdAt: new Date(model.created_at),
    };

    // 解析 tool_invocations
    if (model.tool_invocations) {
      try {
        message.toolInvocations = JSON.parse(model.tool_invocations);
      } catch (err) {
        console.error('[useChatSessions] 解析 tool_invocations 失败:', err);
      }
    }

    return message;
  }

  // 辅助函数：将 UI 模型转换为数据库模型
  function convertUIMessageToModel(
    message: UIMessage,
    sessionId: string
  ): ChatMessageModel {
    return {
      id: message.id,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      tool_invocations: message.toolInvocations
        ? JSON.stringify(message.toolInvocations)
        : undefined,
      created_at: message.createdAt?.getTime() || Date.now(),
    };
  }
  ```

### 2. 更新 ChatInterface 组件
- [ ] 修改 `app/components/ChatInterface.tsx`，处理加载状态：
  ```typescript
  'use client';

  import { useChatSessions } from '@/hooks/useChatSessions';
  import { Spinner } from '@heroui/react';

  export function ChatInterface() {
    const {
      sessionsData,
      isLoading,
      error,
      createSession,
      updateSessionMessages,
      // ... 其他方法
    } = useChatSessions();

    // 加载状态
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" label="加载会话中..." />
        </div>
      );
    }

    // 错误状态
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-500 mb-4">加载会话失败</p>
            <p className="text-sm text-gray-500">{error.message}</p>
          </div>
        </div>
      );
    }

    // 正常渲染
    return (
      <div className="chat-interface">
        {/* 会话列表和聊天界面 */}
      </div>
    );
  }
  ```

### 3. 实现会话导入功能
- [ ] 添加从 JSON 导入会话的功能：
  ```typescript
  // 在 useChatSessions 中添加
  const importSessions = useCallback(
    async (jsonData: string) => {
      try {
        const imported: ChatSessionsData = JSON.parse(jsonData);

        // 验证数据格式
        if (!imported.sessions || !imported.sessionOrder) {
          throw new Error('无效的会话数据格式');
        }

        // 保存所有会话
        for (const session of Object.values(imported.sessions)) {
          await saveSession(session);
        }

        // 重新加载会话
        window.location.reload();
      } catch (err) {
        console.error('[useChatSessions] 导入会话失败:', err);
        throw err;
      }
    },
    [saveSession]
  );
  ```

### 4. 实现会话导出功能
- [ ] 添加导出会话为 JSON 的功能：
  ```typescript
  // 在 useChatSessions 中添加
  const exportSessions = useCallback(() => {
    const jsonData = JSON.stringify(sessionsData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-sessions-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }, [sessionsData]);
  ```

### 5. 添加会话搜索功能
- [ ] 实现按标题或内容搜索会话：
  ```typescript
  const searchSessions = useCallback(
    async (keyword: string) => {
      try {
        const storage = await getStorage();

        // 查询所有会话
        const result = await storage.query<ChatSessionModel>({
          table: TABLE_NAMES.CHAT_SESSIONS,
        });

        // 在客户端过滤（标题匹配）
        const filtered = result.data.filter((session) =>
          session.title.toLowerCase().includes(keyword.toLowerCase())
        );

        return filtered.map((session) => session.id);
      } catch (err) {
        console.error('[useChatSessions] 搜索会话失败:', err);
        throw err;
      }
    },
    []
  );
  ```

### 6. 实现分页加载
- [ ] 添加分页加载会话的功能：
  ```typescript
  const loadMoreSessions = useCallback(
    async (offset: number, limit: number = 20) => {
      try {
        const storage = await getStorage();

        const result = await storage.query<ChatSessionModel>({
          table: TABLE_NAMES.CHAT_SESSIONS,
          orderBy: { field: 'updated_at', direction: 'desc' },
          limit,
          offset,
        });

        // 加载消息并更新状态
        const newSessions: Record<string, ChatSession> = {};
        const newOrder: string[] = [];

        for (const sessionModel of result.data) {
          const messages = await storage.getChatMessages(sessionModel.id);

          newSessions[sessionModel.id] = {
            id: sessionModel.id,
            title: sessionModel.title,
            messages: messages.map(convertMessageModelToUI),
            createdAt: sessionModel.created_at,
            updatedAt: sessionModel.updated_at,
          };

          newOrder.push(sessionModel.id);
        }

        setSessionsData((prev) => ({
          ...prev,
          sessions: { ...prev.sessions, ...newSessions },
          sessionOrder: [...prev.sessionOrder, ...newOrder],
        }));

        return result.hasMore;
      } catch (err) {
        console.error('[useChatSessions] 加载更多会话失败:', err);
        throw err;
      }
    },
    []
  );
  ```

## 验收标准
- [ ] 会话数据成功从存储加载
- [ ] 创建、删除、更新会话正常工作
- [ ] 消息正确关联到会话
- [ ] 加载状态和错误状态正确显示
- [ ] 会话导入导出功能正常
- [ ] 搜索和分页功能正常
- [ ] 性能良好（大量会话时）

## 测试步骤
1. 启动应用并打开聊天界面
2. 创建多个会话并发送消息
3. 切换会话，验证消息正确加载
4. 删除会话，验证级联删除
5. 导出会话为 JSON 文件
6. 清空数据后导入 JSON 文件
7. 测试搜索功能
8. 测试分页加载（创建 > 20 个会话）

## 性能优化

### 1. 懒加载消息
- 初始加载时只加载会话元数据
- 切换会话时才加载消息

### 2. 批量保存
- 使用事务批量保存消息
- 减少数据库写入次数

### 3. 缓存策略
- 已加载的会话保留在内存中
- 避免重复查询数据库

## 注意事项
- 所有存储操作都是异步的，需要正确处理 Promise
- 使用 `useCallback` 避免不必要的重新渲染
- 错误处理要完善，避免数据丢失
- 大量会话时考虑虚拟滚动优化性能

---

**下一步**：完成后继续 [里程碑 7：DrawIO 数据迁移](./milestone-7.md)
