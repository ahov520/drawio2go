# 里程碑 9：UI 组件适配

**状态**：⏳ 待开始
**预计耗时**：90 分钟
**依赖**：里程碑 6, 7, 8

## 目标
适配所有 UI 组件以支持异步存储操作，添加加载状态、错误处理和用户反馈

## 任务清单

### 1. 创建通用加载组件
- [ ] 创建 `app/components/LoadingState.tsx`：
  ```typescript
  import { Spinner } from '@heroui/react';

  interface LoadingStateProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
  }

  export function LoadingState({
    message = '加载中...',
    size = 'lg',
  }: LoadingStateProps) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size={size} />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    );
  }
  ```

### 2. 创建通用错误组件
- [ ] 创建 `app/components/ErrorState.tsx`：
  ```typescript
  import { Button } from '@heroui/react';

  interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    onReset?: () => void;
  }

  export function ErrorState({
    title = '加载失败',
    message,
    onRetry,
    onReset,
  }: ErrorStateProps) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-500 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-4">{message}</p>
        </div>

        <div className="flex gap-2">
          {onRetry && (
            <Button onClick={onRetry} color="primary">
              重试
            </Button>
          )}
          {onReset && (
            <Button onClick={onReset} variant="ghost">
              重置
            </Button>
          )}
        </div>
      </div>
    );
  }
  ```

### 3. 创建 Skeleton 加载占位符
- [ ] 创建 `app/components/ChatSkeleton.tsx`：
  ```typescript
  import { Skeleton } from '@heroui/react';

  export function ChatSkeleton() {
    return (
      <div className="flex flex-col gap-4 p-4">
        {/* 会话列表骨架 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* 消息列表骨架 */}
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-20 w-3/4 rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end">
            <Skeleton className="h-20 w-3/4 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] 创建 `app/components/SettingsSkeleton.tsx`：
  ```typescript
  import { Skeleton } from '@heroui/react';

  export function SettingsSkeleton() {
    return (
      <div className="flex flex-col gap-6 p-6">
        {/* 表单字段骨架 */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}

        {/* 按钮骨架 */}
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    );
  }
  ```

### 4. 更新主页面组件
- [ ] 修改 `app/page.tsx`，添加完整的状态处理：
  ```typescript
  'use client';

  import { useDrawioData } from '@/hooks/useDrawioData';
  import { LoadingState } from '@/components/LoadingState';
  import { ErrorState } from '@/components/ErrorState';
  import { DrawioEditor } from '@/components/DrawioEditor';

  export default function Home() {
    const { xml, isLoading, error, saveDiagram, clearDiagram } =
      useDrawioData();

    // 加载状态
    if (isLoading) {
      return <LoadingState message="加载图表中..." />;
    }

    // 错误状态
    if (error) {
      return (
        <ErrorState
          title="加载图表失败"
          message={error.message}
          onRetry={() => window.location.reload()}
          onReset={clearDiagram}
        />
      );
    }

    return (
      <div className="flex h-screen">
        <DrawioEditor initialXml={xml} onSave={saveDiagram} />
      </div>
    );
  }
  ```

### 5. 更新 ChatInterface 组件
- [ ] 修改 `app/components/ChatInterface.tsx`，添加 Skeleton 和错误处理：
  ```typescript
  'use client';

  import { useChatSessions } from '@/hooks/useChatSessions';
  import { ChatSkeleton } from '@/components/ChatSkeleton';
  import { ErrorState } from '@/components/ErrorState';

  export function ChatInterface() {
    const {
      sessionsData,
      isLoading,
      error,
      createSession,
      deleteSession,
      updateSessionMessages,
    } = useChatSessions();

    // 加载状态
    if (isLoading) {
      return <ChatSkeleton />;
    }

    // 错误状态
    if (error) {
      return (
        <ErrorState
          title="加载会话失败"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      );
    }

    // 空状态
    if (sessionsData.sessionOrder.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-gray-500">还没有会话</p>
          <Button onClick={createSession} color="primary">
            创建新会话
          </Button>
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

### 6. 更新 SettingsSidebar 组件
- [ ] 修改 `app/components/SettingsSidebar.tsx`，添加保存状态反馈：
  ```typescript
  'use client';

  import { useState } from 'react';
  import { useLLMConfig } from '@/hooks/useLLMConfig';
  import { SettingsSkeleton } from '@/components/SettingsSkeleton';
  import { ErrorState } from '@/components/ErrorState';
  import { Button } from '@heroui/react';

  export function SettingsSidebar() {
    const { config, isLoading, error, saveConfig, resetConfig } =
      useLLMConfig();
    const [localConfig, setLocalConfig] = useState(config);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // 加载状态
    if (isLoading) {
      return <SettingsSkeleton />;
    }

    // 错误状态
    if (error) {
      return (
        <ErrorState
          title="加载配置失败"
          message={error.message}
          onReset={resetConfig}
        />
      );
    }

    // 保存处理
    const handleSave = async () => {
      try {
        setIsSaving(true);
        setSaveSuccess(false);
        await saveConfig(localConfig);
        setSaveSuccess(true);

        // 3 秒后隐藏成功提示
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        console.error('保存配置失败:', err);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="settings-sidebar p-6">
        {/* 配置表单 */}
        <form className="flex flex-col gap-6">
          {/* 配置项... */}
        </form>

        {/* 保存按钮 */}
        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleSave}
            color="primary"
            isLoading={isSaving}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存配置'}
          </Button>

          <Button onClick={resetConfig} variant="ghost" disabled={isSaving}>
            重置
          </Button>
        </div>

        {/* 成功提示 */}
        {saveSuccess && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg">
            ✓ 配置保存成功
          </div>
        )}
      </div>
    );
  }
  ```

### 7. 添加操作确认对话框
- [ ] 创建 `app/components/ConfirmDialog.tsx`：
  ```typescript
  import { Button } from '@heroui/react';

  interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDangerous?: boolean;
  }

  export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = '确认',
    cancelText = '取消',
    onConfirm,
    onCancel,
    isDangerous = false,
  }: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>

          <div className="flex gap-2 justify-end">
            <Button onClick={onCancel} variant="ghost">
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              color={isDangerous ? 'danger' : 'primary'}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] 在删除操作中使用确认对话框：
  ```typescript
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (sessionToDelete) {
      await deleteSession(sessionToDelete);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
    }
  };

  return (
    <>
      {/* 删除按钮 */}
      <Button onClick={() => handleDeleteClick(session.id)}>删除</Button>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除会话"
        message="确定要删除这个会话吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        isDangerous
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
  ```

### 8. 添加 Toast 通知组件
- [ ] 创建 `app/components/Toast.tsx`：
  ```typescript
  'use client';

  import { createContext, useContext, useState, useCallback } from 'react';

  interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  }

  interface ToastContextValue {
    showToast: (type: Toast['type'], message: string) => void;
  }

  const ToastContext = createContext<ToastContextValue | null>(null);

  export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback(
      (type: Toast['type'], message: string) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, type, message }]);

        // 3 秒后自动移除
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
      },
      []
    );

    return (
      <ToastContext.Provider value={{ showToast }}>
        {children}

        {/* Toast 容器 */}
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`
                px-4 py-3 rounded-lg shadow-lg
                ${
                  toast.type === 'success'
                    ? 'bg-green-500 text-white'
                    : toast.type === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
                }
              `}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    );
  }

  export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
      throw new Error('useToast must be used within ToastProvider');
    }
    return context;
  }
  ```

- [ ] 在根布局中添加 ToastProvider：
  ```typescript
  // app/layout.tsx
  import { ToastProvider } from '@/components/Toast';

  export default function RootLayout({ children }) {
    return (
      <html>
        <body>
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    );
  }
  ```

- [ ] 在组件中使用 Toast：
  ```typescript
  import { useToast } from '@/components/Toast';

  export function MyComponent() {
    const { showToast } = useToast();

    const handleSave = async () => {
      try {
        await saveData();
        showToast('success', '保存成功');
      } catch (err) {
        showToast('error', '保存失败');
      }
    };

    return <Button onClick={handleSave}>保存</Button>;
  }
  ```

## 验收标准
- [ ] 所有组件正确显示加载状态
- [ ] 错误状态有友好的提示和重试选项
- [ ] Skeleton 占位符样式美观
- [ ] 操作成功有明确的反馈
- [ ] 危险操作有确认对话框
- [ ] Toast 通知正常工作

## 测试步骤
1. 启动应用，观察各个页面的加载状态
2. 模拟存储错误，验证错误状态显示
3. 测试保存操作的反馈
4. 测试删除操作的确认对话框
5. 测试 Toast 通知

## 用户体验优化

### 1. 加载状态
- 使用 Skeleton 而不是 Spinner（更自然）
- 加载时间 > 500ms 才显示加载状态

### 2. 错误处理
- 提供明确的错误信息
- 提供重试和重置选项
- 记录错误日志便于调试

### 3. 操作反馈
- 保存成功显示 Toast
- 危险操作显示确认对话框
- 按钮显示加载状态

## 注意事项
- 所有异步操作都要有加载状态
- 错误信息要对用户友好
- 避免阻塞 UI 的同步操作
- 考虑无障碍访问（ARIA 标签）

---

**下一步**：完成后继续 [里程碑 10：集成测试与优化](./milestone-10.md)
