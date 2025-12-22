# M3: 集成到历史记录列表

## 目标

将缩略图组件集成到 ConversationList，实现左侧缩略图布局。

## 修改文件

`/app/components/chat/ConversationList.tsx`

## 修改内容

### 1. 导入依赖

```typescript
import { useConversationSnapshot } from "@/app/hooks/useConversationSnapshot";
import { ConversationThumbnail } from "./ConversationThumbnail";
import { useCurrentProject } from "@/app/hooks/useCurrentProject"; // 获取当前项目
```

### 2. 修改 renderConversationCard 函数

在函数顶部添加快照加载逻辑：

```typescript
const renderConversationCard = (conv: Conversation, index: number) => {
  const fallbackTitle = t("conversations.defaultName", { number: index + 1 });
  const title = conv.title || fallbackTitle;
  const isSelected = selectedIds.has(conv.id);
  const relativeTime = formatRelativeTime(
    conv.updated_at ?? conv.created_at,
    t,
  );

  // 新增：加载对话快照
  const currentProject = useCurrentProject();
  const preview = useConversationSnapshot(
    conv.id,
    conv.active_xml_version_id, // 需确认字段名
    currentProject?.uuid ?? "default",
  );

  // ... 渲染逻辑
};
```

### 3. 修改卡片布局

在 `Card.Content` 内部开头添加缩略图：

```tsx
<Card.Root key={conv.id} className="history-card">
  <Card.Content className="history-card__content">
    {/* 新增：缩略图 */}
    <ConversationThumbnail
      svgDataUrl={preview?.svgDataUrl ?? null}
      loading={!preview}
      alt={title}
    />

    {selectionMode && (
      <Checkbox
        aria-label={t("aria.selectConversation", { title })}
        isSelected={isSelected}
        onChange={() => onToggleSelect(conv.id)}
      />
    )}

    <div className="history-card__body" ... >
      {/* 现有内容：标题、时间等 */}
    </div>
  </Card.Content>
</Card.Root>
```

### 4. 布局调整

卡片内容区布局：

```
[缩略图 96x64px] [选择框?] [标题+时间 flex:1]
```

- 缩略图固定宽度 96px
- 选择框（选择模式下显示）
- 标题区域自适应剩余空间

## 注意事项

### 1. 字段名确认

需要确认 Conversation 表中保存最后 xml_version_id 的字段名：

- 可能是 `active_xml_version_id`
- 或者需要从 Message 表查询最后一条消息的 `xml_version_id`

如果不存在直接字段，需要：

```typescript
const messages = await getMessages(conv.id);
const lastVersionId = messages
  .reverse()
  .find((m) => m.xml_version_id)?.xml_version_id;
```

### 2. 虚拟滚动兼容

ConversationList 使用 `@tanstack/react-virtual`：

- Hook 在虚拟项渲染时调用
- `loading="lazy"` 配合虚拟滚动优化性能
- 缓存机制避免重复加载

### 3. 性能优化

- 缩略图懒加载：浏览器原生 `loading="lazy"`
- 虚拟滚动：仅渲染可见区域
- LRU 缓存：Hook 内部缓存 Data URL

## 验收标准

- [ ] 缩略图正确显示在卡片左侧
- [ ] 选择模式下 Checkbox 位置正确
- [ ] 虚拟滚动正常工作
- [ ] 点击卡片行为不受影响
- [ ] 无预览时显示占位图标
- [ ] 加载过程流畅无卡顿
