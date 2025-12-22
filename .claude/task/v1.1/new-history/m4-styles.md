# M4: 样式完善

## 目标

为缩略图组件添加完整样式，确保与现有历史记录卡片风格一致。

## 修改文件

`/app/styles/components/chat-history.css`

## 新增样式

### 1. 卡片内容区调整

```css
.history-card__content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}
```

### 2. 缩略图样式

```css
.conversation-thumbnail {
  width: 96px;
  height: 64px;
  object-fit: contain;
  border-radius: var(--radius);
  background-color: var(--color-background-secondary);
  border: 1px solid var(--color-border);
}
```

**设计说明**：

- 宽高比约 3:2（96x64px）
- `object-fit: contain` 保持 SVG 比例
- 圆角使用主题变量
- 边框和背景色跟随主题

### 3. 占位符样式

```css
.conversation-thumbnail-placeholder {
  width: 96px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  background-color: var(--color-background-tertiary);
  border: 1px dashed var(--color-border);
}
```

**设计说明**：

- 虚线边框（`dashed`）区分无预览状态
- 三级背景色（更浅）
- 图标居中显示

### 4. 骨架屏样式

```css
.conversation-thumbnail-skeleton {
  width: 96px;
  height: 64px;
  border-radius: var(--radius);
}
```

**设计说明**：

- 与缩略图相同尺寸和圆角
- 骨架屏动画由 HeroUI Skeleton 组件提供

### 5. 历史卡片主体区域

```css
.history-card__body {
  flex: 1;
  min-width: 0; /* 防止文本溢出 */
}
```

**设计说明**：

- `flex: 1` 占据剩余空间
- `min-width: 0` 配合 `text-overflow: ellipsis` 实现文本截断

### 6. 响应式适配（可选）

```css
@media (max-width: 576px) {
  .conversation-thumbnail,
  .conversation-thumbnail-placeholder,
  .conversation-thumbnail-skeleton {
    width: 64px;
    height: 48px;
  }

  .history-card__content {
    gap: 8px;
    padding: 8px;
  }
}
```

**设计说明**：

- 小屏幕下缩小缩略图尺寸
- 减小间距以节省空间

## 深色模式

使用 CSS 变量自动适配深色模式：

- `--color-background-secondary` - 深色模式下自动调整
- `--color-border` - 边框色跟随主题
- `--color-background-tertiary` - 占位符背景

## 验收标准

- [ ] 缩略图样式与卡片风格一致
- [ ] 深色模式下正常显示
- [ ] 响应式布局正常
- [ ] 边框和圆角与设计稿一致
- [ ] 文本截断正常工作
