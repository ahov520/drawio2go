# 里程碑 4：聊天 UI 集成

**状态**：⏸️ 待执行
**预计耗时**：60 分钟
**依赖**：里程碑 1, 3

## 目标
更新 ChatSidebar 组件，连接到新的 Agent API 并展示工具调用过程

## 任务清单

### 1. 添加 LLM 配置加载逻辑
- [ ] 在 `ChatSidebar.tsx` 中添加配置状态：
  ```typescript
  const [llmConfig, setLlmConfig] = useState<any>(null);

  // 加载 LLM 配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('llmConfig');
      if (savedConfig) {
        try {
          setLlmConfig(JSON.parse(savedConfig));
        } catch (e) {
          console.error('加载 LLM 配置失败:', e);
        }
      }
    }
  }, []);
  ```

### 2. 更新 useChat hook 配置
- [ ] 修改现有的 `useChat` 调用：
  ```typescript
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: {
      llmConfig: llmConfig,
    },
    onError: (error) => {
      console.error('聊天错误:', error);
    },
  });
  ```

### 3. 更新消息渲染逻辑
- [ ] 修改消息列表渲染，支持显示工具调用：
  ```typescript
  {messages.map((message) => (
    <div
      key={message.id}
      className={`message ${
        message.role === "user" ? "message-user" : "message-ai"
      }`}
    >
      <div className="message-header">
        <span className="message-role">
          {message.role === "user" ? "你" : "AI"}
        </span>
        <span className="message-time">
          {new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* 文本内容 */}
      <div className="message-content">
        {message.content}
      </div>

      {/* 工具调用展示 */}
      {message.toolInvocations && message.toolInvocations.length > 0 && (
        <div className="tool-calls-container">
          {message.toolInvocations.map((tool: any, index: number) => (
            <div key={`${message.id}-tool-${index}`} className="tool-call-card">
              <div className="tool-header">
                <span className="tool-icon">🔧</span>
                <span className="tool-name">{tool.toolName}</span>
                <span className={`tool-status ${tool.state === 'result' ? 'tool-status-success' : 'tool-status-loading'}`}>
                  {tool.state === 'result' ? '✓ 完成' : '⏳ 执行中...'}
                </span>
              </div>

              {/* 工具参数 */}
              {Object.keys(tool.args).length > 0 && (
                <div className="tool-section">
                  <div className="tool-section-title">参数：</div>
                  <pre className="tool-params">
                    {JSON.stringify(tool.args, null, 2)}
                  </pre>
                </div>
              )}

              {/* 工具结果 */}
              {tool.state === 'result' && tool.result && (
                <div className="tool-section">
                  <div className="tool-section-title">结果：</div>
                  <pre className="tool-result">
                    {JSON.stringify(tool.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  ))}
  ```

### 4. 更新表单提交逻辑
- [ ] 修改 `handleSubmit` 函数，移除自定义逻辑：
  ```typescript
  // 删除原有的 handleSubmit 函数
  // 使用 useChat 提供的 handleSubmit

  <form onSubmit={handleSubmit} className="chat-input-container">
    <textarea
      placeholder="描述你想要对图表进行的修改，或上传（粘贴）图像来复制图表..."
      value={input}
      onChange={handleInputChange}  // 使用 useChat 的 handleInputChange
      className="chat-input-textarea"
      rows={3}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e);
        }
      }}
    />
  ```

### 5. 添加加载和错误状态
- [ ] 在空状态区域添加配置检查：
  ```typescript
  {messages.length === 0 ? (
    <div className="empty-state">
      {!llmConfig ? (
        <>
          <div className="empty-icon">⚙️</div>
          <p className="empty-text">请先配置 LLM 设置</p>
          <p className="empty-hint">点击右上角设置按钮进行配置</p>
        </>
      ) : (
        <>
          <div className="empty-icon">💬</div>
          <p className="empty-text">开始与 AI 助手对话</p>
          <p className="empty-hint">输入消息开始聊天</p>
        </>
      )}
    </div>
  ) : (
    // 消息列表
  )}
  ```

- [ ] 在消息列表末尾添加加载提示：
  ```typescript
  {isLoading && (
    <div className="message message-ai">
      <div className="message-header">
        <span className="message-role">AI</span>
      </div>
      <div className="message-content loading-dots">
        正在思考<span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
      </div>
    </div>
  )}
  ```

- [ ] 添加错误提示：
  ```typescript
  {error && (
    <div className="error-banner">
      <span className="error-icon">⚠️</span>
      <span className="error-message">{error.message}</span>
    </div>
  )}
  ```

### 6. 更新发送按钮状态
- [ ] 修改发送按钮的 `isDisabled` 属性：
  ```typescript
  <Button
    type="submit"
    variant="primary"
    size="sm"
    isDisabled={!input.trim() || !llmConfig || isLoading}
    className="chat-send-button button-primary"
  >
    {isLoading ? (
      <span>发送中...</span>
    ) : (
      <>
        <svg>...</svg>
        发送
      </>
    )}
  </Button>
  ```

### 7. 添加样式（在 globals.css 中）
- [ ] 添加工具调用相关样式：
  ```css
  /* 工具调用容器 */
  .tool-calls-container {
    margin-top: 12px;
  }

  /* 工具调用卡片 */
  .tool-call-card {
    background: rgba(51, 136, 187, 0.05);
    border-left: 3px solid #3388BB;
    padding: 12px;
    margin: 8px 0;
    border-radius: 4px;
    font-size: 13px;
  }

  /* 工具头部 */
  .tool-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .tool-icon {
    font-size: 16px;
  }

  .tool-name {
    flex: 1;
    color: #3388BB;
  }

  .tool-status {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
  }

  .tool-status-success {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .tool-status-loading {
    background: rgba(251, 146, 60, 0.1);
    color: #fb923c;
  }

  /* 工具内容区域 */
  .tool-section {
    margin-top: 8px;
  }

  .tool-section-title {
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tool-params,
  .tool-result {
    background: rgba(0, 0, 0, 0.03);
    padding: 8px;
    border-radius: 4px;
    font-size: 11px;
    font-family: 'Courier New', monospace;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
  }

  /* 加载动画 */
  .loading-dots {
    display: inline-flex;
    align-items: center;
  }

  .loading-dots .dot {
    animation: loading-dot 1.4s infinite;
  }

  .loading-dots .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading-dots .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes loading-dot {
    0%, 80%, 100% {
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
  }

  /* 错误提示 */
  .error-banner {
    background: rgba(239, 68, 68, 0.1);
    border-left: 3px solid #ef4444;
    padding: 12px;
    margin: 8px 0;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .error-icon {
    font-size: 18px;
  }

  .error-message {
    flex: 1;
    color: #ef4444;
    font-size: 13px;
  }
  ```

## 验收标准
- [ ] 聊天界面能正确连接到 `/api/chat`
- [ ] LLM 配置能从 localStorage 加载
- [ ] 未配置时显示提示信息
- [ ] 用户消息正确显示
- [ ] AI 回复正确显示
- [ ] 工具调用卡片正确显示（名称、参数、结果）
- [ ] 工具状态（执行中/完成）正确显示
- [ ] 加载状态动画正常
- [ ] 错误提示正确显示
- [ ] 发送按钮在未配置/加载中时禁用
- [ ] 消息自动滚动到底部

## 测试步骤
1. 打开应用，确保已配置 LLM 设置
2. 打开聊天侧边栏
3. 发送消息："Hello"
4. 观察 AI 回复
5. 发送消息："获取当前图表的 XML"
6. 观察工具调用过程
7. 检查工具调用卡片是否显示参数和结果
8. 测试加载状态
9. 测试错误情况（如配置错误的 API Key）

## 注意事项
- **配置检查**：在发送前确保 `llmConfig` 已加载
- **工具结果**：使用 `JSON.stringify` 格式化显示
- **滚动行为**：保持现有的自动滚动逻辑
- **样式一致性**：保持与现有消息样式的一致性
- **无障碍**：确保工具调用卡片对屏幕阅读器友好

---

**下一步**：完成后继续 [里程碑 5：类型定义与优化](./milestone-5.md)
