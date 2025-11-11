# 里程碑 3：集成到主应用

**状态**：⏳ 待开始
**预计耗时**：45 分钟
**依赖**：里程碑 1, 2

## 目标

将版本侧边栏集成到主应用，添加底栏按钮、实现侧边栏切换逻辑，确保 DrawIO 编辑器操作指向 WIP 版本。

## 任务清单

### 1. 修改 BottomBar 添加版本管理按钮

- [ ] 在 `app/components/BottomBar.tsx` 中添加版本按钮：

```tsx
import { History } from "lucide-react";

interface BottomBarProps {
  // ... 现有 props
  onToggleVersion?: () => void; // 新增
  isVersionOpen?: boolean; // 新增
}

export function BottomBar({
  // ... 现有 props
  onToggleVersion,
  isVersionOpen,
}: BottomBarProps) {
  return (
    <div className="bottom-bar">
      {/* 左侧区域 */}
      <div className="left-section">{/* ... 现有内容 */}</div>

      {/* 右侧区域 */}
      <div className="right-section">
        {/* 加载/保存按钮 */}
        {/* ... 现有按钮 */}

        {/* 按钮组：聊天 | 设置 | 版本 */}
        <div className="button-group">
          {/* 聊天按钮 */}
          <button
            className={`icon-button ${isChatOpen ? "active" : ""}`}
            onClick={onToggleChat}
            title="聊天"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* 设置按钮 */}
          <button
            className={`icon-button ${isSettingsOpen ? "active" : ""}`}
            onClick={onToggleSettings}
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 版本管理按钮 - 新增 */}
          <button
            className={`icon-button ${isVersionOpen ? "active" : ""}`}
            onClick={onToggleVersion}
            title="版本管理"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2. 修改 UnifiedSidebar 添加版本侧边栏支持

- [ ] 在 `app/components/UnifiedSidebar.tsx` 中添加版本侧边栏：

```tsx
import { VersionSidebar } from "./VersionSidebar";

// 修改 activeSidebar 类型
type ActiveSidebar = "none" | "settings" | "chat" | "version"; // 添加 "version"

interface UnifiedSidebarProps {
  activeSidebar: ActiveSidebar;
  // ... 其他 props
  projectUuid?: string | null; // 新增：当前项目 UUID
  onVersionRestore?: (versionId: string) => void; // 新增：版本回滚回调
}

export function UnifiedSidebar({
  activeSidebar,
  // ... 其他 props
  projectUuid,
  onVersionRestore,
}: UnifiedSidebarProps) {
  // ... 现有逻辑

  return (
    <div
      className={`unified-sidebar ${activeSidebar !== "none" ? "open" : ""}`}
      style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}
    >
      {/* 调整大小手柄 */}
      {/* ... 现有代码 */}

      {/* 侧边栏内容 */}
      <div className="sidebar-container">
        {activeSidebar === "settings" && (
          <SettingsSidebar onClose={onClose} />
        )}
        {activeSidebar === "chat" && <ChatSidebar onClose={onClose} />}
        {/* 新增：版本侧边栏 */}
        {activeSidebar === "version" && (
          <VersionSidebar
            projectUuid={projectUuid}
            onVersionRestore={onVersionRestore}
          />
        )}
      </div>
    </div>
  );
}
```

### 3. 修改 page.tsx 添加版本侧边栏状态管理

- [ ] 在 `app/page.tsx` 中集成版本侧边栏：

#### 3.1 添加版本侧边栏状态

```tsx
export default function Home() {
  // ... 现有状态
  const [activeSidebar, setActiveSidebar] = useState<
    "none" | "settings" | "chat" | "version"
  >("none");

  // ... 现有逻辑

  // 切换版本侧边栏
  const handleToggleVersion = () => {
    setActiveSidebar((prev) => (prev === "version" ? "none" : "version"));
  };

  // ... 其他切换函数
}
```

#### 3.2 添加版本回滚处理

```tsx
import { useDrawioEditor } from "@/hooks/useDrawioEditor";
import { useStorageXMLVersions } from "@/hooks/useStorageXMLVersions";

export default function Home() {
  // ... 现有 hooks
  const { replaceWithXml } = useDrawioEditor();
  const { rollbackToVersion } = useStorageXMLVersions();

  /**
   * 处理版本回滚
   * 将历史版本内容覆盖到 WIP，并重新加载编辑器
   */
  const handleVersionRestore = async (versionId: string) => {
    if (!currentProject) return;

    try {
      // 执行回滚操作（更新 WIP 版本）
      await rollbackToVersion(currentProject.uuid, versionId);

      // 重新加载当前 WIP 的内容到编辑器
      const { getCurrentXML } = useStorageXMLVersions();
      const wipXml = await getCurrentXML(currentProject.uuid);

      if (wipXml) {
        // 触发编辑器重新加载
        await replaceWithXml(wipXml, true);

        // 可选：显示成功提示
        console.log("版本回滚成功");
      }
    } catch (error) {
      console.error("版本回滚失败:", error);
      // 可选：显示错误提示
    }
  };

  // ...
}
```

#### 3.3 更新组件 props 传递

```tsx
return (
  <div className="app-container">
    {/* DrawIO 编辑器 */}
    <DrawioEditorNative
      ref={editorRef}
      onSave={handleSave}
      onAutoSave={handleAutoSave}
      onSelectionChange={setSelectionCount}
      projectUuid={currentProject?.uuid}
    />

    {/* 统一侧边栏 */}
    <UnifiedSidebar
      activeSidebar={activeSidebar}
      onClose={() => setActiveSidebar("none")}
      projectUuid={currentProject?.uuid} // 新增
      onVersionRestore={handleVersionRestore} // 新增
    />

    {/* 底部工具栏 */}
    <BottomBar
      // ... 现有 props
      onToggleVersion={handleToggleVersion} // 新增
      isVersionOpen={activeSidebar === "version"} // 新增
    />
  </div>
);
```

### 4. 确保 DrawIO 编辑器操作指向 WIP

- [ ] 在 `app/page.tsx` 中修改保存逻辑：

```tsx
/**
 * 处理 DrawIO 保存事件
 * 始终保存到 WIP 版本（0.0.0）
 */
const handleSave = async (xmlContent: string) => {
  if (!currentProject) return;

  try {
    // saveXML 方法已在里程碑 1 中修改为始终保存到 WIP
    await saveXML(currentProject.uuid, xmlContent);
    console.log("保存到 WIP 成功");
  } catch (error) {
    console.error("保存到 WIP 失败:", error);
  }
};

/**
 * 处理 DrawIO 自动保存事件
 * 同样保存到 WIP 版本
 */
const handleAutoSave = async (xmlContent: string) => {
  if (!currentProject) return;

  try {
    await saveXML(currentProject.uuid, xmlContent);
    console.log("自动保存到 WIP 成功");
  } catch (error) {
    console.error("自动保存到 WIP 失败:", error);
  }
};
```

### 5. 项目加载时确保 WIP 版本存在

- [ ] 在 `app/page.tsx` 的项目加载逻辑中添加 WIP 版本初始化：

```tsx
import { WIP_VERSION } from "@/lib/storage/constants";

/**
 * 加载项目并确保 WIP 版本存在
 */
const handleLoadProject = async (projectUuid: string) => {
  try {
    // 加载项目基本信息
    const project = await getProject(projectUuid);
    setCurrentProject(project);

    // 确保 WIP 版本存在
    await ensureWIPVersion(projectUuid);

    // 加载 WIP 版本到编辑器
    const wipXml = await getCurrentXML(projectUuid);
    if (wipXml && editorRef.current) {
      await editorRef.current.loadDiagram(wipXml);
    }
  } catch (error) {
    console.error("加载项目失败:", error);
  }
};

/**
 * 确保项目有 WIP 版本
 * 如果不存在，则创建一个空的 WIP 版本
 */
const ensureWIPVersion = async (projectUuid: string) => {
  const { getAllXMLVersions, saveXML } = useStorageXMLVersions();

  const versions = await getAllXMLVersions(projectUuid);
  const wipVersion = versions.find((v) => v.semantic_version === WIP_VERSION);

  if (!wipVersion) {
    // 创建默认的空 DrawIO XML
    const defaultXml =
      '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';

    // 保存为 WIP 版本
    await saveXML(projectUuid, defaultXml, "WIP", "活跃工作区");
    console.log("已创建 WIP 版本");
  }
};
```

### 6. 更新类型定义（如果需要）

- [ ] 在 `app/types/chat.ts` 或新建 `app/types/version.ts` 中添加类型定义：

```typescript
// app/types/version.ts
import type { XMLVersion } from "@/lib/storage/types";

export interface VersionSidebarProps {
  projectUuid: string | null;
  onVersionRestore?: (versionId: string) => void;
}

export interface VersionTimelineProps {
  projectUuid: string;
  versions: XMLVersion[];
  onVersionRestore?: (versionId: string) => void;
  onVersionCreated?: () => void;
}

export interface VersionCardProps {
  version: XMLVersion;
  isLatest?: boolean;
  onRestore?: (versionId: string) => void;
}

export interface CreateVersionDialogProps {
  projectUuid: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionCreated?: () => void;
}

export interface WIPIndicatorProps {
  projectUuid: string;
  versions: XMLVersion[];
}
```

## 验收标准

- [ ] 底栏出现版本管理按钮（History 图标）
- [ ] 点击版本按钮打开/关闭版本侧边栏
- [ ] 版本按钮在激活状态下有视觉反馈（active 类）
- [ ] UnifiedSidebar 正确渲染 VersionSidebar
- [ ] 传递正确的 projectUuid 到 VersionSidebar
- [ ] 版本回滚功能正常工作
- [ ] DrawIO 的 save/autosave 始终保存到 WIP
- [ ] 项目加载时自动创建 WIP 版本（如果不存在）
- [ ] 版本侧边栏与聊天/设置侧边栏互斥显示
- [ ] 侧边栏宽度调整正常工作

## 测试步骤

1. **测试底栏按钮**
   - 启动应用 `pnpm run dev`
   - 查看底栏右侧按钮组
   - 验证有 History 图标的版本按钮
   - 点击按钮，侧边栏打开
   - 再次点击，侧边栏关闭

2. **测试侧边栏切换**
   - 打开聊天侧边栏
   - 点击版本按钮
   - 验证聊天侧边栏关闭，版本侧边栏打开
   - 切换到设置侧边栏
   - 验证版本侧边栏关闭，设置侧边栏打开

3. **测试 WIP 版本初始化**
   - 创建新项目
   - 查看数据库
   - 验证自动创建了 semantic_version="0.0.0" 的版本

4. **测试保存到 WIP**
   - 在 DrawIO 中编辑图形
   - 点击保存或等待自动保存
   - 查看数据库
   - 验证 WIP 版本的内容被更新

5. **测试版本回滚**
   - 创建一个历史版本（通过版本侧边栏）
   - 在 DrawIO 中做一些修改
   - 点击历史版本的"回滚"按钮
   - 验证编辑器内容恢复到历史版本
   - 验证 WIP 版本的内容被更新

6. **测试项目切换**
   - 切换到另一个项目
   - 验证版本侧边栏显示该项目的版本
   - 验证 WIP 指示器显示该项目的 WIP 版本

## 设计要点

### 按钮组布局

```
底栏右侧：
[加载] [保存] | [聊天] [设置] [版本]
                └─── 按钮组 ───┘
```

### 侧边栏切换逻辑

- **互斥显示**：同一时间只显示一个侧边栏
- **状态管理**：使用 `activeSidebar` 状态控制
- **关闭逻辑**：点击同一按钮或侧边栏关闭按钮

### WIP 版本生命周期

```
项目创建 → 自动创建 WIP (0.0.0)
         ↓
编辑操作 → 实时更新 WIP
         ↓
手动保存 → 从 WIP 快照为历史版本 (x.y.z)
         ↓
版本回滚 → 历史版本覆盖 WIP
         ↓
继续编辑 → 更新 WIP
```

### 数据流

```
DrawIO 编辑器
    ↓ save/autosave
page.tsx (handleSave/handleAutoSave)
    ↓
useStorageXMLVersions.saveXML()
    ↓
始终保存到 WIP (0.0.0)
    ↓
Storage Adapter (SQLite/IndexedDB)
```

## 注意事项

- 确保 `projectUuid` 正确传递到所有组件
- 版本回滚后需要触发编辑器重新加载（`replaceWithXml`）
- WIP 版本初始化应该在项目加载时进行
- 注意处理项目切换时的版本数据更新
- 确保三个侧边栏（聊天/设置/版本）互斥显示

## 破坏性变更

- ⚠️ `UnifiedSidebar` 组件的 `activeSidebar` 类型变更
- ⚠️ `BottomBar` 组件新增必需 props（`onToggleVersion`, `isVersionOpen`）
- ⚠️ `saveXML` 方法行为变更（始终保存到 WIP）

## 兼容性处理

如果现有代码有直接调用 `saveXML` 并指定版本号的地方，需要修改为：
- 普通保存 → 使用 `saveXML()`（保存到 WIP）
- 创建历史版本 → 使用 `createHistoricalVersion()`

---

**下一步**：完成后继续 [里程碑 4：交互功能实现](./milestone-4.md)
