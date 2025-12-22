# M1: 创建 useConversationSnapshot Hook

## 目标

创建用于加载对话快照预览图的 Hook，支持智能回退机制。

## 新建文件

`/app/hooks/useConversationSnapshot.ts`

## 接口设计

```typescript
interface SnapshotPreview {
  conversationId: string
  svgDataUrl: string | null         // Data URL 格式的 SVG
  xmlVersionId: string | null       // 回退的版本 ID（如果使用回退）
  isFromSnapshot: boolean           // true=对话快照, false=版本回退
}

function useConversationSnapshot(
  conversationId: string | undefined,
  xmlVersionId: string | undefined,    // 消息关联的版本 ID（回退用）
  projectUuid: string
): SnapshotPreview | null
```

## 核心逻辑

### 1. 加载对话快照（优先）

```typescript
const snapshot = await storage.getConversationSnapshot(conversationId, projectUuid)

if (snapshot?.preview_svg) {
  // 解压 SVG
  const svgText = await decompressSVG(snapshot.preview_svg)
  // 转换为 Data URL
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`

  return {
    conversationId,
    svgDataUrl,
    xmlVersionId: null,
    isFromSnapshot: true
  }
}
```

### 2. 回退到版本预览图

```typescript
if (xmlVersionId) {
  const version = await storage.getXMLVersionSVGData(xmlVersionId, projectUuid)

  if (version?.preview_svg) {
    const svgText = await decompressSVG(version.preview_svg)
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`

    return {
      conversationId,
      svgDataUrl,
      xmlVersionId,
      isFromSnapshot: false
    }
  }
}
```

### 3. 无预览可用

```typescript
return {
  conversationId,
  svgDataUrl: null,
  xmlVersionId: null,
  isFromSnapshot: false
}
```

## 状态管理

```typescript
const [preview, setPreview] = useState<SnapshotPreview | null>(null)

useEffect(() => {
  if (!conversationId) {
    setPreview(null)
    return
  }

  loadSnapshot()  // 执行上述逻辑
}, [conversationId, xmlVersionId, projectUuid])
```

## 依赖

- `getStorage()` - 获取存储实例
- `storage.getConversationSnapshot()` - 获取对话快照
- `storage.getXMLVersionSVGData()` - 获取版本 SVG（回退）
- `decompressSVG()` from `@/app/lib/compression-utils`

## 优化建议

### LRU 缓存（可选）

```typescript
const cache = new Map<string, SnapshotPreview>()  // 模块级缓存
const MAX_CACHE_SIZE = 50

// 缓存命中时直接返回
if (cache.has(conversationId)) {
  return cache.get(conversationId)
}

// 缓存存储时检查容量
if (cache.size >= MAX_CACHE_SIZE) {
  const firstKey = cache.keys().next().value
  cache.delete(firstKey)
}
cache.set(conversationId, preview)
```

## 验收标准

- [ ] Hook 能正确加载对话快照
- [ ] 快照不可用时正确回退到版本预览图
- [ ] 都不可用时返回 null
- [ ] `conversationId` 为空时不触发加载
- [ ] Data URL 格式正确，可直接用于 `<img src>`
