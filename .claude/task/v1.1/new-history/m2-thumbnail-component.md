# M2: 创建 ConversationThumbnail 组件

## 目标

创建可复用的缩略图展示组件，支持加载状态、占位符和预览展示。

## 新建文件

`/app/components/chat/ConversationThumbnail.tsx`

## Props 设计

```typescript
interface ConversationThumbnailProps {
  svgDataUrl: string | null; // 预览图 Data URL
  loading?: boolean; // 是否加载中
  alt?: string; // 图片 alt 文本
}
```

**设计说明**：

- 组件为**展示组件**（presentational），不包含数据加载逻辑
- 父组件通过 Hook 获取数据，传入 `svgDataUrl`
- 简化职责，便于测试和复用

## 渲染状态

### 1. 加载中

```tsx
{
  loading && (
    <Skeleton className="conversation-thumbnail-skeleton">
      <div className="h-16 w-24 rounded bg-default-200" />
    </Skeleton>
  );
}
```

### 2. 无预览图

```tsx
{
  !loading && !svgDataUrl && (
    <div className="conversation-thumbnail-placeholder">
      <FileQuestion size={20} className="text-default-400" />
    </div>
  );
}
```

- 虚线边框
- 图标居中
- 使用 `lucide-react` 的 `FileQuestion` 图标

### 3. 有预览图

```tsx
{
  !loading && svgDataUrl && (
    <img
      src={svgDataUrl}
      alt={alt || "对话预览图"}
      className="conversation-thumbnail"
      loading="lazy"
    />
  );
}
```

- `loading="lazy"` - 浏览器原生懒加载
- `object-fit: contain` - 保持 SVG 比例
- 白色背景（SVG 默认）

## 样式类名

- `.conversation-thumbnail` - 预览图容器
- `.conversation-thumbnail-placeholder` - 占位符
- `.conversation-thumbnail-skeleton` - 骨架屏

## 依赖

- `@heroui/react` - Skeleton 组件
- `lucide-react` - FileQuestion 图标

## 使用示例

```tsx
import { useConversationSnapshot } from "@/app/hooks/useConversationSnapshot";
import { ConversationThumbnail } from "./ConversationThumbnail";

function ConversationCard({ conv }) {
  const preview = useConversationSnapshot(
    conv.id,
    conv.active_xml_version_id,
    projectUuid,
  );

  return (
    <ConversationThumbnail
      svgDataUrl={preview?.svgDataUrl ?? null}
      loading={!preview}
      alt={conv.title}
    />
  );
}
```

## 验收标准

- [ ] 三种状态正确渲染（加载中/无预览/有预览）
- [ ] 懒加载正常工作
- [ ] 组件为纯展示组件，无副作用
- [ ] 样式与设计稿一致
