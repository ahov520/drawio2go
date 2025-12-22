# M6: 快照生成和级联删除

## 目标

实现对话快照的自动生成和级联删除逻辑。

## 任务清单

### 1. 创建快照生成工具

**新建文件**：`/app/lib/storage/conversation-snapshot.ts`

```typescript
export interface CreateSnapshotOptions {
  enabled: boolean                                      // 是否启用快照功能
  drawioEditorRef: React.RefObject<HTMLIFrameElement | null>
}

/**
 * 为对话创建缓存快照
 */
export async function createConversationSnapshot(
  conversationId: string,
  projectUuid: string,
  options: CreateSnapshotOptions
): Promise<string | null>
```

**核心逻辑**：

1. 检查 `enabled` 标志（根据用户设置）
2. 调用 `exportFirstPageSVG(drawioEditorRef)` 获取第一页 SVG
3. 使用 `compressSVG()` 进行 deflate-raw 压缩
4. 调用 `storage.upsertConversationSnapshot()` 保存（覆盖式）
5. 返回快照版本 ID，失败返回 `null`

**依赖**：

- `exportFirstPageSVG()` - 需实现（从 drawio 编辑器导出首页）
- `compressSVG()` - 需实现（deflate-raw 压缩）
- `getStorage()` - 获取存储实例
- `createLogger()` - 日志记录

### 2. 实现 SVG 导出工具

**新建文件**：`/app/lib/svg-export-utils.ts`

```typescript
/**
 * 从 drawio 编辑器导出第一页 SVG
 */
export async function exportFirstPageSVG(
  editorRef: React.RefObject<HTMLIFrameElement | null>
): Promise<string | null>
```

**实现思路**：

- 通过 postMessage 与 drawio iframe 通信
- 发送导出命令（参考现有的 XML 导出逻辑）
- 仅导出第一页（`pageIndex: 0`）
- 返回 SVG 文本

### 3. 实现 SVG 压缩工具

**修改文件**：`/app/lib/compression-utils.ts`

```typescript
/**
 * 压缩 SVG 文本为 Blob
 */
export async function compressSVG(svgText: string): Promise<Blob>

/**
 * 解压 SVG Blob 为文本
 */
export async function decompressSVG(blob: Blob | Buffer): Promise<string>
```

**使用库**：

- `pako` - deflate-raw 压缩（已有依赖）
- Web: 返回 `Blob`
- Electron: 返回 `Buffer`

### 4. 集成到 ChatSidebar

**文件**：`/app/components/ChatSidebar.tsx`

在 `onFinish` 回调中（约 1118 行，`updateStreamingFlag` 之前）添加：

```typescript
// 导入依赖
import { createConversationSnapshot } from "@/app/lib/storage/conversation-snapshot"
import { useStorageSettings } from "@/app/hooks/useStorageSettings"

// 在组件中
const { getVersionSettings } = useStorageSettings()

// 在 onFinish 回调中
const finalId = resolvedConversationId ?? ctx.conversationId

await updateStreamingFlag(finalId, false)

// ===== 新增：创建对话快照 =====
try {
  const versionSettings = await getVersionSettings()
  await createConversationSnapshot(finalId, currentProjectId, {
    enabled: versionSettings.conversationSnapshot,
    drawioEditorRef
  })
} catch (snapshotError) {
  logger.warn("创建对话快照失败", { conversationId: finalId, error: snapshotError })
}
// ===============================
```

**注意事项**：

- 需要确保 `drawioEditorRef` 可访问（从父组件传入）
- 快照创建失败不影响主流程（仅记录日志）
- 使用 try-catch 捕获异常

### 5. 级联删除对话快照

**文件**：确认删除对话的位置

可能的位置：
- `/app/components/chat/ChatHistoryView.tsx` 的 `onDeleteConversations`
- 或其父组件的删除处理逻辑

**修改内容**：

```typescript
const handleDeleteConversations = async (conversationIds: string[]) => {
  try {
    const storage = await getStorage()

    // 删除对话快照
    await storage.deleteConversationSnapshots(conversationIds)

    // 删除对话本身
    await storage.deleteConversations(conversationIds)

    // 更新 UI
    // ...
  } catch (error) {
    logger.error("删除对话失败", { conversationIds, error })
    // 错误处理
  }
}
```

**顺序说明**：

1. 先删除快照（防止孤立快照）
2. 再删除对话
3. 即使快照删除失败，对话仍可删除（快照可清理）

### 6. drawioEditorRef 访问

**问题**：ChatSidebar 可能无法直接访问编辑器 ref

**解决方案 1**：从父组件传入

```typescript
// 父组件
<ChatSidebar
  drawioEditorRef={editorRef}
  // ... 其他 props
/>
```

**解决方案 2**：使用 Context

```typescript
// Context 定义
const DrawioEditorContext = createContext<RefObject<HTMLIFrameElement | null>>(null)

// 父组件
<DrawioEditorContext.Provider value={editorRef}>
  <ChatSidebar ... />
</DrawioEditorContext.Provider>

// ChatSidebar 中
const editorRef = useContext(DrawioEditorContext)
```

## 错误处理

### 1. 导出失败

```typescript
if (!firstPageSvgText) {
  logger.warn("导出第一页 SVG 失败,跳过快照", { conversationId })
  return null
}
```

### 2. 压缩失败

```typescript
try {
  const compressedBlob = await compressSVG(firstPageSvgText)
} catch (error) {
  logger.error("压缩 SVG 失败", { conversationId, error })
  return null
}
```

### 3. 存储失败

```typescript
try {
  await storage.upsertConversationSnapshot(...)
} catch (error) {
  logger.error("保存快照失败", { conversationId, error })
  return null
}
```

## 日志记录

```typescript
logger.info("对话快照已创建", {
  conversationId,
  snapshotId,
  originalSize: firstPageSvgText.length,
  compressedSize: compressedBlob.size
})
```

## 验收标准

- [ ] AI 响应完成后自动创建快照
- [ ] 设置禁用时不创建快照
- [ ] 快照创建失败不影响对话流程
- [ ] 删除对话时同步删除快照
- [ ] SVG 导出和压缩正常工作
- [ ] 日志完整记录创建和删除过程
- [ ] drawioEditorRef 正确访问
