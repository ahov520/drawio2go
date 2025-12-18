# Milestone 8: 完成前端工具执行闭环

## 目标

打通"前端执行工具 + 后端纯代理转发"的完整闭环，移除 `/api/chat` 端点，统一为 `/api/ai-proxy` 单一入口。

## 前置条件

- Milestone 1-7 已完成（Socket.IO 已移除，前端工具定义已实现，useAIChat Hook 已创建）

## 当前问题

根据 2025-12-18 审查结果，存在以下关键缺失：

### 问题 1: 工具闭环未打通

- `useAIChat` 在 `prepareSendMessagesRequest` 中发送了 `tools` schema
- 但 `/api/ai-proxy` **不处理/转发 `tools` 字段**
- `streamText()` 调用中**没有传入 tools**
- **结果**：模型无法返回 tool-call，前端 `onToolCall` 不会被触发

### 问题 2: Hook 切换未完成

- `ChatSidebar` 仍使用内部的 `useChat`，发送到默认端点 `/api/chat`
- `useAIChat` 仅在 `app/page.tsx` 中作为"能力验证与占位"，未实际接管主链路

### 问题 3: 两条重复链路

| 链路        | 端点            | 工具执行 | 状态       |
| ----------- | --------------- | -------- | ---------- |
| ChatSidebar | `/api/chat`     | 无       | 当前主链路 |
| useAIChat   | `/api/ai-proxy` | 前端     | 占位验证   |

## 用户决策

- **BFF 定义**：纯透传模式（后端尽量简化，不做业务逻辑）
- **端点选择**：只保留 `/api/ai-proxy`，移除 `/api/chat`

## 修改内容

### 8.1 修改 `/api/ai-proxy` 支持 tools 转发

**文件**: `app/api/ai-proxy/route.ts`

**修改要点**:

1. 在请求类型中添加 `tools` 字段
2. 在 `validateRequest` 中处理 `tools`（可选字段）
3. 将前端传入的 JSON Schema 转换为 AI SDK 的 Tool 格式
4. 在 `streamText()` 调用中传入 `tools`

**工具 Schema 格式**（前端发送）:

```typescript
{
  [toolName]: {
    description?: string;
    inputJsonSchema: object;  // JSON Schema 格式
  }
}
```

### 8.2 切换 ChatSidebar 使用 `/api/ai-proxy`

**文件**: `app/components/ChatSidebar.tsx`

**修改要点**:

1. 修改 `chatTransport` 的 `api` 指向 `/api/ai-proxy`
2. 在 `prepareSendMessagesRequest` 中添加 `tools` schema
3. 集成前端工具执行（导入 `createFrontendDrawioTools`）
4. 在 `useChat` 中添加 `onToolCall` 回调

**关键考虑**:

- 保留现有的会话管理逻辑（useChatSessionsController）
- 保留消息同步、网络状态、锁机制等
- 工具执行复用 `useAIChat` 中的 `executeToolCall` 逻辑

### 8.3 移除 `/api/chat` 端点

**删除文件**:

- `app/api/chat/route.ts`
- `app/api/chat/helpers/` 目录（如果不再被其他模块使用）

**清理引用**:

- 搜索并移除所有对 `/api/chat` 的引用
- 更新相关测试（如有）

### 8.4 清理相关代码

**清理内容**:

- `app/lib/chat-run-registry.ts` - 评估是否仍需要
- `app/api/chat/cancel/`、`app/api/chat/status/`、`app/api/chat/unload/` - 空目录清理
- 移除 `app/api/chat/helpers/` 中仅被 `/api/chat` 使用的模块
- 更新 `app/api/AGENTS.md` 文档

## 架构变化

```
【当前】                              【目标】
ChatSidebar                           ChatSidebar
    ↓                                     ↓
内部 useChat                          内部 useChat + onToolCall
    ↓                                     ↓
/api/chat (无工具)                    /api/ai-proxy (with tools)
                                          ↓
useAIChat (占位)                      AI Provider
    ↓                                     ↓
/api/ai-proxy                         返回 tool-call
    ↓                                     ↓
(tools 未被处理)                      ChatSidebar.onToolCall
                                          ↓
                                      前端执行工具 (frontend-tools.ts)
                                          ↓
                                      addToolResult → 继续对话
```

## 验收标准

- [ ] `/api/ai-proxy` 能接收并转发 tools schema 给 AI 模型
- [ ] ChatSidebar 发送请求到 `/api/ai-proxy`
- [ ] AI 模型返回 tool-call 时，前端能正确执行工具
- [ ] 工具执行结果能回传并继续对话
- [ ] `/api/chat` 端点已移除
- [ ] 无残留的未使用代码
- [ ] `pnpm build` 构建成功
- [ ] 聊天功能端到端正常工作

## 风险与注意事项

1. **ChatSidebar 复杂度高**（1793 行）：需要谨慎修改，保留会话管理逻辑
2. **会话状态同步**：确保工具执行期间消息状态正确同步
3. **错误处理**：工具执行失败时的回滚和错误提示
4. **取消机制**：确保 stop() 能同时取消网络请求和工具执行
5. **向后兼容**：如有外部依赖 `/api/chat`，需要评估影响

## 相关文件

- `app/api/ai-proxy/route.ts` - BFF 代理端点（需修改）
- `app/components/ChatSidebar.tsx` - 聊天侧边栏（需修改）
- `app/hooks/useAIChat.ts` - AI 聊天 Hook（参考实现）
- `app/lib/frontend-tools.ts` - 前端工具定义（复用）
- `app/api/chat/route.ts` - 旧端点（待删除）
