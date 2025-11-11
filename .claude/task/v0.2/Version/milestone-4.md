# 里程碑 4：交互功能实现

**状态**：⏳ 待开始
**预计耗时**：60 分钟
**依赖**：里程碑 1, 2, 3

## 目标

实现版本管理的核心交互功能，包括创建版本、回滚版本、智能版本号推荐、版本验证等完整流程。

## 任务清单

### 1. 完善创建版本对话框交互

- [ ] 在 `app/components/version/CreateVersionDialog.tsx` 中完善交互逻辑：

#### 1.1 添加实时版本号验证

```tsx
const [versionNumber, setVersionNumber] = React.useState("");
const [description, setDescription] = React.useState("");
const [error, setError] = React.useState("");
const [validationError, setValidationError] = React.useState("");

// 实时验证版本号
React.useEffect(() => {
  if (!versionNumber) {
    setValidationError("");
    return;
  }

  const validation = validateVersion(versionNumber);
  if (!validation.valid) {
    setValidationError(validation.error || "");
  } else {
    setValidationError("");
  }
}, [versionNumber, validateVersion]);

// 检查版本号是否已存在
const [checkingExists, setCheckingExists] = React.useState(false);
React.useEffect(() => {
  if (!versionNumber || validationError) return;

  const checkExists = async () => {
    setCheckingExists(true);
    const exists = await isVersionExists(projectUuid, versionNumber);
    if (exists) {
      setValidationError("版本号已存在");
    }
    setCheckingExists(false);
  };

  // 防抖处理
  const timer = setTimeout(checkExists, 500);
  return () => clearTimeout(timer);
}, [versionNumber, projectUuid, isVersionExists, validationError]);
```

#### 1.2 优化智能推荐功能

```tsx
const [isLoadingRecommend, setIsLoadingRecommend] = React.useState(false);

const handleRecommend = async () => {
  setIsLoadingRecommend(true);
  try {
    const recommended = await getRecommendedVersion(projectUuid);
    setVersionNumber(recommended);
    setValidationError("");
  } catch (error) {
    console.error("获取推荐版本号失败:", error);
  } finally {
    setIsLoadingRecommend(false);
  }
};
```

#### 1.3 完善创建流程

```tsx
const handleCreate = async () => {
  setError("");

  // 最终验证
  if (validationError) {
    setError(validationError);
    return;
  }

  if (!versionNumber.trim()) {
    setError("请输入版本号");
    return;
  }

  setIsCreating(true);
  try {
    await createHistoricalVersion(
      projectUuid,
      versionNumber.trim(),
      description.trim() || undefined
    );

    // 成功回调
    onVersionCreated?.();
    onClose();
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建版本失败";
    setError(message);
  } finally {
    setIsCreating(false);
  }
};
```

#### 1.4 添加键盘快捷键支持

```tsx
// Enter 键提交，Esc 键关闭
React.useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating && versionNumber && !validationError) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (isOpen) {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }
}, [isOpen, isCreating, versionNumber, validationError, handleCreate, onClose]);
```

### 2. 增强版本卡片交互

- [ ] 在 `app/components/version/VersionCard.tsx` 中添加交互功能：

#### 2.1 添加回滚确认（可选）

```tsx
const [showConfirm, setShowConfirm] = React.useState(false);

const handleRestoreClick = () => {
  // 简单模式：直接回滚
  onRestore?.(version.id);

  // 确认模式（可选）：
  // setShowConfirm(true);
};

const handleConfirmRestore = () => {
  onRestore?.(version.id);
  setShowConfirm(false);
};
```

#### 2.2 添加卡片展开/收起（可选）

```tsx
const [isExpanded, setIsExpanded] = React.useState(false);

// 在卡片中添加展开按钮
<Button
  size="sm"
  variant="ghost"
  onPress={() => setIsExpanded(!isExpanded)}
>
  {isExpanded ? <ChevronUp /> : <ChevronDown />}
</Button>

// 展开时显示更多信息
{isExpanded && (
  <div className="expanded-info">
    <p className="text-xs text-gray-600">
      XML 大小: {(version.xml_content.length / 1024).toFixed(2)} KB
    </p>
    {version.metadata && (
      <p className="text-xs text-gray-600">
        元数据: {JSON.stringify(version.metadata)}
      </p>
    )}
  </div>
)}
```

### 3. 实现版本时间线实时更新

- [ ] 在 `app/components/VersionSidebar.tsx` 中添加版本列表自动刷新：

```tsx
// 监听版本变化
React.useEffect(() => {
  if (!projectUuid) return;

  const loadVersions = async () => {
    const allVersions = await getAllXMLVersions(projectUuid);
    setVersions(allVersions);
  };

  // 初始加载
  loadVersions();

  // 定时刷新（可选，用于多设备同步）
  const interval = setInterval(loadVersions, 10000); // 10 秒刷新一次

  return () => clearInterval(interval);
}, [projectUuid, getAllXMLVersions]);

// 监听自定义事件（版本创建/回滚后触发）
React.useEffect(() => {
  const handleVersionUpdate = () => {
    if (projectUuid) {
      getAllXMLVersions(projectUuid).then(setVersions);
    }
  };

  window.addEventListener("version-updated", handleVersionUpdate);
  return () => window.removeEventListener("version-updated", handleVersionUpdate);
}, [projectUuid, getAllXMLVersions]);
```

### 4. 添加版本回滚后的反馈

- [ ] 在 `app/page.tsx` 中完善回滚反馈：

```tsx
const handleVersionRestore = async (versionId: string) => {
  if (!currentProject) return;

  try {
    // 获取版本信息（用于显示提示）
    const { getXMLVersion } = useStorageXMLVersions();
    const version = await getXMLVersion(versionId);

    // 执行回滚
    await rollbackToVersion(currentProject.uuid, versionId);

    // 重新加载编辑器
    const { getCurrentXML } = useStorageXMLVersions();
    const wipXml = await getCurrentXML(currentProject.uuid);

    if (wipXml && editorRef.current) {
      await editorRef.current.loadDiagram(wipXml);
    }

    // 触发版本列表更新事件
    window.dispatchEvent(new Event("version-updated"));

    // 可选：显示成功提示
    console.log(
      `已回滚到版本 ${version?.semantic_version || versionId}`
    );

    // 可选：自动关闭版本侧边栏
    // setActiveSidebar("none");
  } catch (error) {
    console.error("版本回滚失败:", error);
    // 可选：显示错误提示
    alert("版本回滚失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
};
```

### 5. 优化 WIP 指示器实时更新

- [ ] 在 `app/components/version/WIPIndicator.tsx` 中添加实时刷新：

```tsx
// 监听编辑器保存事件
React.useEffect(() => {
  const handleWIPUpdate = () => {
    // 触发父组件重新加载版本列表
    window.dispatchEvent(new Event("version-updated"));
  };

  window.addEventListener("wip-updated", handleWIPUpdate);
  return () => window.removeEventListener("wip-updated", handleWIPUpdate);
}, []);
```

- [ ] 在 `app/page.tsx` 的保存逻辑中触发事件：

```tsx
const handleSave = async (xmlContent: string) => {
  if (!currentProject) return;

  try {
    await saveXML(currentProject.uuid, xmlContent);
    console.log("保存到 WIP 成功");

    // 触发 WIP 更新事件
    window.dispatchEvent(new Event("wip-updated"));
  } catch (error) {
    console.error("保存到 WIP 失败:", error);
  }
};

const handleAutoSave = async (xmlContent: string) => {
  if (!currentProject) return;

  try {
    await saveXML(currentProject.uuid, xmlContent);
    console.log("自动保存到 WIP 成功");

    // 触发 WIP 更新事件
    window.dispatchEvent(new Event("wip-updated"));
  } catch (error) {
    console.error("自动保存到 WIP 失败:", error);
  }
};
```

### 6. 添加加载状态和错误处理

- [ ] 在 `app/components/VersionSidebar.tsx` 中添加加载和错误状态：

```tsx
const [isLoading, setIsLoading] = React.useState(false);
const [loadError, setLoadError] = React.useState("");

React.useEffect(() => {
  if (!projectUuid) return;

  const loadVersions = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const allVersions = await getAllXMLVersions(projectUuid);
      setVersions(allVersions);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "加载版本列表失败"
      );
    } finally {
      setIsLoading(false);
    }
  };

  loadVersions();
}, [projectUuid, getAllXMLVersions]);

// 渲染加载和错误状态
if (isLoading) {
  return (
    <div className="version-sidebar">
      <div className="loading-state">
        <Spinner className="w-8 h-8" />
        <p className="text-gray-500 mt-4">加载版本列表...</p>
      </div>
    </div>
  );
}

if (loadError) {
  return (
    <div className="version-sidebar">
      <div className="error-state">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 mt-4">{loadError}</p>
        <Button
          variant="secondary"
          onPress={() => window.location.reload()}
          className="mt-4"
        >
          重试
        </Button>
      </div>
    </div>
  );
}
```

### 7. 添加版本导出功能（可选）

- [ ] 在 `app/components/version/VersionCard.tsx` 中添加导出按钮：

```tsx
import { Download } from "lucide-react";

const handleExport = async () => {
  try {
    // 恢复完整 XML
    const { getXMLVersion, materializeVersionXml } = useStorageXMLVersions();
    const fullXml = await materializeVersionXml(
      version,
      (id) => getXMLVersion(id)
    );

    // 创建下载
    const blob = new Blob([fullXml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-v${version.semantic_version}.drawio`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("导出失败:", error);
  }
};

// 在版本卡片中添加导出按钮
<Button
  size="sm"
  variant="ghost"
  onPress={handleExport}
  className="button-icon"
>
  <Download className="w-3.5 h-3.5" />
</Button>;
```

## 验收标准

- [ ] 创建版本对话框输入框有实时验证
- [ ] 版本号格式错误时显示错误提示
- [ ] 版本号重复时显示错误提示
- [ ] 智能推荐按钮能正确推荐下一个版本号
- [ ] 创建版本后版本列表自动更新
- [ ] 回滚版本后编辑器内容正确更新
- [ ] 回滚版本后 WIP 版本内容被覆盖
- [ ] WIP 指示器的更新时间实时更新
- [ ] 版本列表按时间倒序排列
- [ ] 支持键盘快捷键（Enter 提交，Esc 关闭）
- [ ] 加载状态正确显示
- [ ] 错误状态正确显示和处理

## 测试步骤

1. **测试创建版本完整流程**
   - 打开版本侧边栏
   - 点击"保存版本"按钮
   - 输入版本号 "1.0.0"
   - 输入描述 "首个正式版本"
   - 点击"创建版本"
   - 验证：对话框关闭，版本列表显示新版本

2. **测试版本号验证**
   - 打开创建版本对话框
   - 输入无效版本号 "abc"
   - 验证：显示错误提示
   - 输入重复版本号 "1.0.0"
   - 验证：显示"版本号已存在"提示
   - 输入保留版本号 "0.0.0"
   - 验证：显示"系统保留版本号"提示

3. **测试智能推荐**
   - 打开创建版本对话框
   - 验证：自动显示推荐的版本号
   - 创建版本 "1.0.0"
   - 再次打开对话框
   - 验证：推荐版本号变为 "1.0.1"

4. **测试版本回滚**
   - 在 DrawIO 中绘制一些内容
   - 创建版本 "1.0.0"
   - 继续编辑，添加更多内容
   - 点击版本 "1.0.0" 的"回滚"按钮
   - 验证：编辑器内容恢复到 "1.0.0" 的状态
   - 验证：WIP 版本的内容被更新

5. **测试实时更新**
   - 打开版本侧边栏
   - 在 DrawIO 中编辑并保存
   - 验证：WIP 指示器的时间更新
   - 创建新版本
   - 验证：版本列表自动刷新

6. **测试键盘快捷键**
   - 打开创建版本对话框
   - 输入版本号和描述
   - 按 Enter 键
   - 验证：版本创建成功，对话框关闭
   - 打开对话框，按 Esc 键
   - 验证：对话框关闭

7. **测试错误处理**
   - 断开网络（模拟存储失败）
   - 尝试创建版本
   - 验证：显示错误提示
   - 尝试回滚版本
   - 验证：显示错误提示

## 设计要点

### 用户体验优化

- **实时验证**：输入时即时反馈，减少错误
- **智能推荐**：自动递增版本号，减少思考
- **键盘快捷键**：提升操作效率
- **加载状态**：提供视觉反馈，避免困惑
- **错误处理**：友好的错误提示和重试机制

### 数据一致性

- **事件驱动**：使用自定义事件同步状态
- **自动刷新**：创建/回滚后自动更新列表
- **实时更新**：WIP 保存后立即反映
- **版本隔离**：确保多项目间数据独立

### 性能优化

- **防抖处理**：版本号验证使用防抖
- **条件渲染**：根据状态显示不同内容
- **事件清理**：组件卸载时移除事件监听
- **懒加载**：对话框按需渲染

## 注意事项

- 版本号验证应使用防抖，避免频繁查询
- 回滚操作应确保编辑器完全重载
- 自定义事件名称应保持一致（"version-updated", "wip-updated"）
- 错误提示应友好且具体
- 键盘快捷键应避免与浏览器默认快捷键冲突

## 破坏性变更

无。此里程碑主要增强交互功能，不涉及 API 变更。

## 可选增强功能

以下功能可根据时间和需求选择性实现：

1. **版本比对**：显示两个版本之间的差异
2. **版本导出**：将版本导出为 .drawio 文件
3. **版本标签**：为版本添加标签（如 "stable", "beta"）
4. **版本搜索**：按版本号或描述搜索
5. **批量操作**：批量删除或导出版本
6. **版本分支**：支持从任意版本创建新分支

---

**下一步**：完成后继续 [里程碑 5：测试与优化](./milestone-5.md)
