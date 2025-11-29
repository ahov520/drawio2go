# M3: TopBar 组件国际化

## 目标

完成 TopBar 组件的国际化改造，包括提取翻译、创建翻译资源和代码改造。这是最简单的组件，用于快速验证 i18n 流程。

## 预估时间

1-1.5 小时

## 前置依赖

- M1: 基础设施搭建完成
- M2: 语言切换器可用

## 任务清单

### 3.1 提取中文文本

**文件**: `app/components/TopBar.tsx`

**需要提取的文本** (~15 条):

- 选区信息相关文本
- 加载/保存按钮文本
- 侧边栏展开/折叠 Aria 标签
- 其他提示文本

**提取方法**:

1. 阅读 `TopBar.tsx` 组件代码
2. 识别所有硬编码的中文字符串
3. 为每个字符串设计合理的翻译键名

### 3.2 创建翻译资源

**更新文件**:

- `locales/zh-CN/topbar.json`
- `locales/en-US/topbar.json`

**翻译结构示例**:

```json
{
  "selectionLabel": {
    "noSelection": "暂无选区信息",
    "selected": "已选择 {{count}} 个对象"
  },
  "buttons": {
    "load": "加载",
    "save": "保存"
  },
  "aria": {
    "collapseSidebar": "折叠侧边栏",
    "expandSidebar": "展开侧边栏"
  }
}
```

**命名规范**:

- 使用 camelCase
- 按功能分组（selectionLabel, buttons, aria）
- 嵌套层级不超过 3 层
- 插值变量使用 `{{variableName}}` 格式

### 3.3 改造组件代码

**改造步骤**:

1. 添加客户端组件标记（如果没有）:

```tsx
"use client";
```

2. 导入 Hook:

```tsx
import { useTranslation } from "@/app/i18n/hooks";
```

3. 在组件内使用 Hook:

```tsx
export default function TopBar() {
  const { t } = useTranslation("topbar");

  // ...
}
```

4. 替换硬编码文本:

```tsx
// 改造前
<p>暂无选区信息</p>

// 改造后
<p>{t('selectionLabel.noSelection')}</p>
```

5. 处理插值变量:

```tsx
// 改造前
<p>已选择 {count} 个对象</p>

// 改造后
<p>{t('selectionLabel.selected', { count })}</p>
```

6. 更新 Aria 标签:

```tsx
// 改造前
<Button aria-label="折叠侧边栏">

// 改造后
<Button aria-label={t('aria.collapseSidebar')}>
```

### 3.4 验证功能

**测试场景**:

1. 启动应用 (`pnpm run dev`)
2. 打开 TopBar 组件
3. 切换语言（通过 M2 创建的语言切换器）
4. 验证：
   - [ ] TopBar 文本立即更新为对应语言
   - [ ] 按钮文本正确显示
   - [ ] Aria 标签正确更新（检查 DOM 属性）
   - [ ] 插值变量正确替换
5. 刷新页面
6. 验证语言选择保持

## 翻译资源完整示例

**`locales/zh-CN/topbar.json`**:

```json
{
  "selectionLabel": {
    "noSelection": "暂无选区信息",
    "selected": "已选择 {{count}} 个对象"
  },
  "buttons": {
    "load": "加载",
    "save": "保存",
    "loadDrawio": "从 .drawio 加载",
    "saveDrawio": "导出为 .drawio"
  },
  "aria": {
    "collapseSidebar": "折叠侧边栏",
    "expandSidebar": "展开侧边栏",
    "loadFile": "加载文件",
    "saveFile": "保存文件"
  },
  "tooltips": {
    "load": "加载 DrawIO 文件",
    "save": "保存当前项目"
  }
}
```

**`locales/en-US/topbar.json`**:

```json
{
  "selectionLabel": {
    "noSelection": "No selection",
    "selected": "{{count}} object(s) selected"
  },
  "buttons": {
    "load": "Load",
    "save": "Save",
    "loadDrawio": "Load from .drawio",
    "saveDrawio": "Export as .drawio"
  },
  "aria": {
    "collapseSidebar": "Collapse sidebar",
    "expandSidebar": "Expand sidebar",
    "loadFile": "Load file",
    "saveFile": "Save file"
  },
  "tooltips": {
    "load": "Load DrawIO file",
    "save": "Save current project"
  }
}
```

## 验收标准

- [ ] `TopBar.tsx` 组件已标记为客户端组件
- [ ] 导入了 `useTranslation` Hook
- [ ] 所有硬编码中文文本已替换为 `t()` 调用
- [ ] `topbar.json` 翻译文件已创建（zh-CN + en-US）
- [ ] 中英文翻译键值完全对齐
- [ ] 插值变量在中英文中一致
- [ ] 切换语言后 TopBar 文本立即更新
- [ ] 运行以下命令，TopBar.tsx 无中文硬编码（除注释）：
  ```bash
  grep -n "[\u4e00-\u9fa5]" app/components/TopBar.tsx
  ```
- [ ] 运行 `pnpm run lint` 无错误
- [ ] 运行 `pnpm run dev` 应用正常启动

## 常见问题

**Q: 如何处理动态内容（如文件名）？**
A: 动态内容不翻译，只翻译周围的文本：

```tsx
// 正确
{
  t("fileLoaded", { fileName: file.name });
}
// 翻译: "已加载文件 {{fileName}}"

// 错误
{
  file.name;
}
{
  t("loaded");
}
```

**Q: Aria 标签应该放在哪个命名空间？**
A: 优先放在组件自己的命名空间（`topbar.json`），通用的放在 `common.json`。

## 下一步

完成后继续 [M4: ProjectSelector 组件国际化](./milestone-4-project-selector.md)
