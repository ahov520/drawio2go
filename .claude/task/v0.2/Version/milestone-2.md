# 里程碑 2：UI 组件开发

**状态**：⏳ 待开始
**预计耗时**：75 分钟
**依赖**：里程碑 1

## 目标

创建版本侧边栏的所有 UI 组件，包括 WIP 指示器、版本时间线、版本卡片和创建版本对话框。

## 任务清单

### 1. 创建版本侧边栏主组件

- [ ] 创建 `app/components/VersionSidebar.tsx`：

```tsx
"use client";

import React from "react";
import { Button } from "@heroui/react";
import { WIPIndicator } from "./version/WIPIndicator";
import { VersionTimeline } from "./version/VersionTimeline";
import { CreateVersionDialog } from "./version/CreateVersionDialog";
import { useStorageXMLVersions } from "@/hooks/useStorageXMLVersions";
import { History, Save } from "lucide-react";

interface VersionSidebarProps {
  projectUuid: string | null;
  onVersionRestore?: (versionId: string) => void;
}

export function VersionSidebar({
  projectUuid,
  onVersionRestore,
}: VersionSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const { getAllXMLVersions } = useStorageXMLVersions();
  const [versions, setVersions] = React.useState<XMLVersion[]>([]);

  // 加载版本列表
  React.useEffect(() => {
    if (!projectUuid) return;

    const loadVersions = async () => {
      const allVersions = await getAllXMLVersions(projectUuid);
      setVersions(allVersions);
    };

    loadVersions();
  }, [projectUuid, getAllXMLVersions]);

  if (!projectUuid) {
    return (
      <div className="version-sidebar">
        <div className="empty-state">
          <History className="w-12 h-12 text-gray-400" />
          <p className="text-gray-500 mt-4">请先选择一个项目</p>
        </div>
      </div>
    );
  }

  return (
    <div className="version-sidebar">
      {/* 顶部标题和操作按钮 */}
      <div className="sidebar-header">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <h2 className="text-lg font-semibold">版本管理</h2>
        </div>
        <Button
          size="sm"
          variant="primary"
          onPress={() => setShowCreateDialog(true)}
          className="button-primary"
        >
          <Save className="w-4 h-4" />
          保存版本
        </Button>
      </div>

      {/* 滚动内容区域 */}
      <div className="sidebar-content">
        {/* WIP 指示器 */}
        <WIPIndicator projectUuid={projectUuid} versions={versions} />

        {/* 版本时间线 */}
        <VersionTimeline
          projectUuid={projectUuid}
          versions={versions}
          onVersionRestore={onVersionRestore}
          onVersionCreated={() => {
            // 重新加载版本列表
            getAllXMLVersions(projectUuid).then(setVersions);
          }}
        />
      </div>

      {/* 创建版本对话框 */}
      {showCreateDialog && (
        <CreateVersionDialog
          projectUuid={projectUuid}
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onVersionCreated={() => {
            setShowCreateDialog(false);
            // 重新加载版本列表
            getAllXMLVersions(projectUuid).then(setVersions);
          }}
        />
      )}
    </div>
  );
}
```

### 2. 创建 WIP 指示器组件

- [ ] 创建 `app/components/version/WIPIndicator.tsx`：

```tsx
"use client";

import React from "react";
import { Card, Separator } from "@heroui/react";
import { Activity, Clock } from "lucide-react";
import { WIP_VERSION } from "@/lib/storage/constants";
import type { XMLVersion } from "@/lib/storage/types";

interface WIPIndicatorProps {
  projectUuid: string;
  versions: XMLVersion[];
}

export function WIPIndicator({ projectUuid, versions }: WIPIndicatorProps) {
  const wipVersion = versions.find((v) => v.semantic_version === WIP_VERSION);

  if (!wipVersion) {
    return null;
  }

  const lastModified = new Date(wipVersion.created_at).toLocaleString("zh-CN");

  return (
    <Card.Root className="wip-indicator" variant="outlined">
      <Card.Content className="py-4 px-4">
        <div className="flex items-start gap-3">
          <div className="wip-icon">
            <Activity className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">活跃工作区 (WIP)</h3>
              <span className="wip-badge">v{WIP_VERSION}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              当前正在编辑的内容，所有修改实时保存于此
            </p>
            <Separator className="my-2" />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>最后更新：{lastModified}</span>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  );
}
```

### 3. 创建版本时间线组件

- [ ] 创建 `app/components/version/VersionTimeline.tsx`：

```tsx
"use client";

import React from "react";
import { VersionCard } from "./VersionCard";
import { WIP_VERSION } from "@/lib/storage/constants";
import type { XMLVersion } from "@/lib/storage/types";

interface VersionTimelineProps {
  projectUuid: string;
  versions: XMLVersion[];
  onVersionRestore?: (versionId: string) => void;
  onVersionCreated?: () => void;
}

export function VersionTimeline({
  projectUuid,
  versions,
  onVersionRestore,
}: VersionTimelineProps) {
  // 过滤出历史版本（排除 WIP）并按时间倒序排列
  const historicalVersions = versions
    .filter((v) => v.semantic_version !== WIP_VERSION)
    .sort((a, b) => b.created_at - a.created_at);

  if (historicalVersions.length === 0) {
    return (
      <div className="version-timeline-empty">
        <div className="empty-state-small">
          <p className="text-gray-500 text-sm">暂无历史版本</p>
          <p className="text-gray-400 text-xs mt-1">
            点击"保存版本"按钮创建第一个版本快照
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="version-timeline">
      <div className="timeline-header">
        <h3 className="text-sm font-semibold text-gray-700">历史版本</h3>
        <span className="text-xs text-gray-500">
          共 {historicalVersions.length} 个版本
        </span>
      </div>

      <div className="timeline-list">
        {historicalVersions.map((version, index) => (
          <VersionCard
            key={version.id}
            version={version}
            isLatest={index === 0}
            onRestore={onVersionRestore}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4. 创建版本卡片组件

- [ ] 创建 `app/components/version/VersionCard.tsx`：

```tsx
"use client";

import React from "react";
import { Button, Card, Separator } from "@heroui/react";
import { Clock, Key, GitBranch, RotateCcw } from "lucide-react";
import type { XMLVersion } from "@/lib/storage/types";

interface VersionCardProps {
  version: XMLVersion;
  isLatest?: boolean;
  onRestore?: (versionId: string) => void;
}

export function VersionCard({ version, isLatest, onRestore }: VersionCardProps) {
  const createdAt = new Date(version.created_at).toLocaleString("zh-CN");

  return (
    <Card.Root className="version-card" variant="outlined">
      <Card.Content className="py-3 px-4">
        {/* 版本号和标记 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="version-number">v{version.semantic_version}</span>
            {isLatest && <span className="latest-badge">最新</span>}
            {version.is_keyframe ? (
              <span className="keyframe-badge">
                <Key className="w-3 h-3" />
                关键帧
              </span>
            ) : (
              <span className="diff-badge">
                <GitBranch className="w-3 h-3" />
                Diff +{version.diff_chain_depth}
              </span>
            )}
          </div>
        </div>

        {/* 版本名称 */}
        {version.name && version.name !== version.semantic_version && (
          <h4 className="font-medium text-sm mb-1">{version.name}</h4>
        )}

        {/* 版本描述 */}
        {version.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {version.description}
          </p>
        )}

        <Separator className="my-2" />

        {/* 底部信息和操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{createdAt}</span>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onPress={() => onRestore?.(version.id)}
            className="button-small-optimized"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            回滚
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  );
}
```

### 5. 创建版本创建对话框组件

- [ ] 创建 `app/components/version/CreateVersionDialog.tsx`：

```tsx
"use client";

import React from "react";
import {
  Button,
  TextField,
  Input,
  TextArea,
  Label,
  Description,
} from "@heroui/react";
import { useStorageXMLVersions } from "@/hooks/useStorageXMLVersions";
import { X, Sparkles } from "lucide-react";

interface CreateVersionDialogProps {
  projectUuid: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionCreated?: () => void;
}

export function CreateVersionDialog({
  projectUuid,
  isOpen,
  onClose,
  onVersionCreated,
}: CreateVersionDialogProps) {
  const [versionNumber, setVersionNumber] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const {
    createHistoricalVersion,
    getRecommendedVersion,
    validateVersion,
    isVersionExists,
  } = useStorageXMLVersions();

  // 加载推荐版本号
  React.useEffect(() => {
    if (isOpen) {
      getRecommendedVersion(projectUuid).then(setVersionNumber);
    }
  }, [isOpen, projectUuid, getRecommendedVersion]);

  const handleCreate = async () => {
    setError("");

    // 验证版本号格式
    const validation = validateVersion(versionNumber);
    if (!validation.valid) {
      setError(validation.error || "版本号格式错误");
      return;
    }

    // 检查版本号是否已存在
    const exists = await isVersionExists(projectUuid, versionNumber);
    if (exists) {
      setError("版本号已存在，请使用其他版本号");
      return;
    }

    // 创建版本
    setIsCreating(true);
    try {
      await createHistoricalVersion(projectUuid, versionNumber, description);
      onVersionCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建版本失败");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 对话框头部 */}
        <div className="dialog-header">
          <h3 className="text-lg font-semibold">创建新版本</h3>
          <Button
            size="sm"
            variant="ghost"
            onPress={onClose}
            className="button-icon"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 对话框内容 */}
        <div className="dialog-content">
          {/* 版本号输入 */}
          <TextField className="w-full">
            <Label>版本号 *</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={versionNumber}
                onChange={(e) => setVersionNumber(e.target.value)}
                placeholder="1.0.0"
                className="flex-1"
              />
              <Button
                size="sm"
                variant="secondary"
                onPress={() =>
                  getRecommendedVersion(projectUuid).then(setVersionNumber)
                }
                className="button-small-optimized"
              >
                <Sparkles className="w-3.5 h-3.5" />
                智能推荐
              </Button>
            </div>
            <Description className="mt-2">
              格式：x.y.z（如 1.0.0）或 x.y.z.h（如 1.0.0.1）
            </Description>
          </TextField>

          {/* 版本描述输入 */}
          <TextField className="w-full mt-4">
            <Label>版本描述（可选）</Label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个版本的主要变更..."
              rows={4}
              className="mt-2"
            />
            <Description className="mt-2">
              简要说明这个版本的更改内容
            </Description>
          </TextField>

          {/* 错误提示 */}
          {error && (
            <div className="error-message mt-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* 对话框底部 */}
        <div className="dialog-footer">
          <Button variant="secondary" onPress={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onPress={handleCreate}
            isDisabled={!versionNumber || isCreating}
            className="button-primary"
          >
            {isCreating ? "创建中..." : "创建版本"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 6. 创建组件统一导出

- [ ] 创建 `app/components/version/index.ts`：

```typescript
export { WIPIndicator } from "./WIPIndicator";
export { VersionTimeline } from "./VersionTimeline";
export { VersionCard } from "./VersionCard";
export { CreateVersionDialog } from "./CreateVersionDialog";
```

### 7. 创建版本侧边栏样式

- [ ] 创建 `app/styles/components/version.css`：

```css
/* ================================
   版本侧边栏样式
   ================================ */

/* 版本侧边栏容器 */
.version-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

/* 侧边栏头部 */
.version-sidebar .sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-primary);
  z-index: 10;
}

/* 侧边栏内容区域 */
.version-sidebar .sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ================================
   WIP 指示器样式
   ================================ */

.wip-indicator {
  border-color: var(--primary-color);
  background: linear-gradient(
    135deg,
    rgba(51, 136, 187, 0.05) 0%,
    rgba(51, 136, 187, 0.02) 100%
  );
  transition: all 0.3s var(--ease-out-cubic);
}

.wip-indicator:hover {
  box-shadow: 0 4px 12px rgba(51, 136, 187, 0.15);
}

.wip-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: rgba(51, 136, 187, 0.1);
}

.wip-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  background: var(--primary-color);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

/* ================================
   版本时间线样式
   ================================ */

.version-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-primary);
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.version-timeline-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.empty-state-small {
  text-align: center;
}

/* ================================
   版本卡片样式
   ================================ */

.version-card {
  transition: all 0.2s var(--ease-out-cubic);
  cursor: pointer;
}

.version-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(51, 136, 187, 0.1);
  transform: translateY(-1px);
}

.version-number {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary-color);
}

.latest-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: #10b981;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
}

.keyframe-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  font-size: 0.625rem;
  font-weight: 600;
}

.diff-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  font-size: 0.625rem;
  font-weight: 600;
}

/* ================================
   对话框样式
   ================================ */

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.dialog-container {
  background: var(--bg-primary);
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 500px;
  animation: slideUp 0.3s ease;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary);
}

.dialog-content {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-primary);
}

.error-message {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* ================================
   动画
   ================================ */

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ================================
   空状态样式
   ================================ */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

/* ================================
   响应式调整
   ================================ */

@media (max-width: 400px) {
  .version-sidebar .sidebar-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }

  .dialog-container {
    width: 95%;
    max-width: none;
  }
}
```

### 8. 引入版本样式到全局

- [ ] 在 `app/globals.css` 中导入版本样式：
  ```css
  @import "./styles/components/version.css";
  ```

## 验收标准

- [ ] VersionSidebar 组件正确渲染
- [ ] WIPIndicator 显示活跃工作区信息
- [ ] VersionTimeline 显示历史版本列表
- [ ] VersionCard 显示版本详情（版本号、时间、关键帧/Diff 标记）
- [ ] CreateVersionDialog 能打开和关闭
- [ ] 对话框显示智能推荐的版本号
- [ ] 所有组件使用 HeroUI v3 组件
- [ ] 所有组件使用 #3388BB 主题色
- [ ] 样式符合 Material Design 风格
- [ ] 组件有平滑的动画效果
- [ ] 空状态正确显示

## 测试步骤

1. **测试版本侧边栏基本结构**
   - 独立渲染 VersionSidebar
   - 传入 projectUuid
   - 验证头部、内容区域正确显示

2. **测试 WIP 指示器**
   - 显示 0.0.0 版本标识
   - 显示最后更新时间
   - hover 时有阴影效果

3. **测试版本时间线**
   - 显示多个历史版本
   - 版本按时间倒序排列
   - 空状态正确显示

4. **测试版本卡片**
   - 显示版本号、时间、描述
   - 关键帧显示 Key 图标
   - Diff 版本显示链深度
   - hover 时有悬浮效果

5. **测试创建版本对话框**
   - 点击"保存版本"按钮打开对话框
   - 显示智能推荐的版本号
   - 点击"智能推荐"按钮刷新版本号
   - 输入版本号和描述
   - 点击"取消"关闭对话框

6. **测试响应式布局**
   - 调整侧边栏宽度（300-800px）
   - 组件自适应宽度
   - 小屏幕时头部按钮换行

## 设计要点

### 组件层次结构

```
VersionSidebar (主容器)
├── Header (头部：标题 + 保存版本按钮)
├── Content (滚动内容区域)
│   ├── WIPIndicator (WIP 指示器)
│   └── VersionTimeline (版本时间线)
│       └── VersionCard[] (版本卡片列表)
└── CreateVersionDialog (创建版本对话框)
```

### 视觉设计

- **WIP 指示器**：高亮显示，使用主题色边框和渐变背景
- **版本卡片**：简洁卡片，hover 时悬浮效果
- **标记徽章**：使用不同颜色区分关键帧和 Diff 版本
- **对话框**：居中显示，带遮罩层和动画

### 交互设计

- **WIP 区域固定**：始终显示在顶部
- **时间线滚动**：版本列表可滚动
- **按钮反馈**：所有按钮有 hover 和 active 状态
- **对话框动画**：淡入 + 滑入效果

## 注意事项

- 所有组件添加 `"use client"` 指令
- 使用 HeroUI v3 的 `onPress` 代替 `onClick`
- 时间格式使用 `toLocaleString("zh-CN")`
- 确保对话框点击遮罩层可关闭
- 对话框内容区域可滚动（最大高度 60vh）

## 破坏性变更

无。此里程碑仅创建新组件，不修改现有代码。

---

**下一步**：完成后继续 [里程碑 3：集成到主应用](./milestone-3.md)
