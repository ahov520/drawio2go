# M2: 核心功能组件 ✅ 已完成

## 目标

创建语言切换器组件和通用设置面板，集成到设置侧边栏，为用户提供语言切换入口。

## 实际完成时间

约 2 小时（2025-11-29 完成）

## 前置依赖

- ✅ M1: 基础设施搭建完成

## 任务清单

### ✅ 3.1 创建语言切换器组件

**文件**: `app/components/LanguageSwitcher.tsx`

**已实现功能**:

- ✅ 使用 HeroUI v3 `Select` 复合组件（Select.Trigger/Value/Content/ListBox）
- ✅ 读取 `i18n.language` 显示当前选中语言
- ✅ 支持切换到 en-US 或 zh-CN
- ✅ 使用 `useAppTranslation` Hook（`settings` 命名空间）
- ✅ 调用 `i18n.changeLanguage()` 切换语言
- ✅ 自动持久化到 localStorage（由 i18next-browser-languagedetector 处理）

**UI 实现**:

- ✅ 使用 `Languages` 图标（lucide-react）
- ✅ Label：显示 `t("general.language.label")`（"语言 / Language"）
- ✅ Description：显示 `t("general.language.description")`（"切换界面显示语言"）
- ✅ 下拉选项使用 `localeDisplayNames`（English / 简体中文）

**技术实现**:

- ✅ 客户端组件（`"use client"`）
- ✅ 完整的 TypeScript 类型定义
- ✅ 支持自定义 className
- ✅ 边界处理完善（初始值为 defaultLocale）

**翻译键值**（`settings.json`）:

```json
{
  "general": {
    "language": {
      "label": "语言 / Language",
      "description": "切换界面显示语言"
    }
  }
}
```

---

### ✅ 3.2 创建通用设置面板

**文件**: `app/components/settings/GeneralSettingsPanel.tsx`

**已实现功能**:

- ✅ 整合现有的文件默认路径设置（替代原 FileSettingsPanel）
- ✅ 嵌入 `LanguageSwitcher` 组件
- ✅ 使用 `useAppTranslation` Hook（`settings` 命名空间）

**包含设置项**:

1. ✅ **语言切换**（LanguageSwitcher 组件）
2. ✅ **默认文件路径**:
   - HeroUI TextField 组件
   - 输入框 + "选择目录"按钮（带 FolderOpen 图标）
   - 使用 Electron API `window.electron.selectFolder()`（⚠️ 注意：实际 API 名为 `selectFolder`，非文档中的 `selectDirectory`）
   - Electron 环境检测：`window.electron?.selectFolder` 存在性检查
   - Web 环境降级：按钮禁用

**实际 UI 结构**:

```tsx
<div className="settings-panel">
  <h3 className="section-title">{t("general.title")}</h3>
  <p className="section-description">{t("general.description")}</p>

  <LanguageSwitcher />

  <TextField>
    <Label>{t("general.defaultPath.label")}</Label>
    <div className="flex gap-2">
      <Input
        value={defaultPath}
        onChange={(e) => onDefaultPathChange(e.target.value)}
        placeholder={t("general.defaultPath.placeholder")}
      />
      <Button onPress={handleSelectPath} isDisabled={!canSelectFolder}>
        <FolderOpen />
        {t("general.defaultPath.selectButton")}
      </Button>
    </div>
    <Description>{t("general.defaultPath.description")}</Description>
  </TextField>
</div>
```

**Props 接口**:

```typescript
export interface GeneralSettingsPanelProps {
  defaultPath: string;
  onDefaultPathChange: (path: string) => void;
}
```

**翻译键值**（`settings.json`）:

```json
{
  "general": {
    "title": "通用设置",
    "description": "语言、文件路径等基础配置",
    "language": { ... },
    "defaultPath": {
      "label": "默认文件路径",
      "placeholder": "/home/user/drawio",
      "selectButton": "选择目录",
      "description": "新建项目时默认保存的目录"
    }
  }
}
```

---

### ✅ 3.3 更新设置导航

**文件**: `app/components/settings/SettingsNav.tsx`

**已完成任务**:

1. ✅ 新增 "general" 标签页（替代原有的 "file"）
2. ✅ 更新 `SettingsTab` 类型定义：
   ```typescript
   export type SettingsTab = "general" | "llm" | "version";
   ```
3. ✅ 添加 general 按钮，使用 `Settings` 图标（lucide-react）
4. ✅ 国际化所有导航标签的 aria-label：
   - `t("nav.general")` → "通用" / "General"
   - `t("nav.llm")` → "LLM 配置" / "LLM Config"
   - `t("nav.version")` → "版本设置" / "Version Settings"

**翻译键值**（`settings.json`）:

```json
{
  "nav": {
    "general": "通用",
    "llm": "LLM 配置",
    "version": "版本设置"
  }
}
```

**UI 顺序**:

1. ✅ General（Settings 图标）
2. ✅ LLM（Bot 图标）
3. ✅ Version（GitBranch 图标）

---

### ✅ 3.4 更新设置侧边栏

**文件**: `app/components/SettingsSidebar.tsx`

**已完成任务**:

1. ✅ 导入 `GeneralSettingsPanel`（从 `@/app/components/settings`）
2. ✅ 移除 `FileSettingsPanel` 导入（已被 GeneralSettingsPanel 替代）
3. ✅ 在 Tab 切换逻辑中新增 "general" 分支
4. ✅ 传递必要的 props（defaultPath, onDefaultPathChange）
5. ✅ 默认 Tab 设置为 "general"

**渲染逻辑**:

```tsx
{activeTab === "general" && (
  <GeneralSettingsPanel
    defaultPath={defaultPath}
    onDefaultPathChange={handleDefaultPathChange}
  />
)}
{activeTab === "llm" && <LLMSettingsPanel ... />}
{activeTab === "version" && <VersionSettingsPanel ... />}
```

**状态管理**:

- ✅ 复用现有的 `defaultPath` 和 `savedPath` 状态
- ✅ 新增 `handleDefaultPathChange` 函数处理路径变更
- ✅ 变更检测：General 面板的修改纳入 `hasChanges` 计算
- ✅ 保存逻辑：底部统一保存按钮处理所有面板

---

### ✅ 3.5 添加翻译资源

**文件**:

- `public/locales/zh-CN/settings.json`
- `public/locales/en-US/settings.json`

**中文版**（zh-CN/settings.json）:

```json
{
  "nav": {
    "general": "通用",
    "llm": "LLM 配置",
    "version": "版本设置"
  },
  "general": {
    "title": "通用设置",
    "description": "语言、文件路径等基础配置",
    "language": {
      "label": "语言 / Language",
      "description": "切换界面显示语言"
    },
    "defaultPath": {
      "label": "默认文件路径",
      "placeholder": "/home/user/drawio",
      "selectButton": "选择目录",
      "description": "新建项目时默认保存的目录"
    }
  }
}
```

**英文版**（en-US/settings.json）:

```json
{
  "nav": {
    "general": "General",
    "llm": "LLM Config",
    "version": "Version Settings"
  },
  "general": {
    "title": "General Settings",
    "description": "Language, file paths, and basic configuration",
    "language": {
      "label": "Language / 语言",
      "description": "Switch interface display language"
    },
    "defaultPath": {
      "label": "Default File Path",
      "placeholder": "/home/user/drawio",
      "selectButton": "Select Directory",
      "description": "Default directory for saving new projects"
    }
  }
}
```

---

## 验收标准

- ✅ `LanguageSwitcher` 组件已创建，UI 美观
- ✅ `GeneralSettingsPanel` 组件已创建
- ✅ `SettingsNav` 包含 3 个标签（General、LLM、Version）
- ✅ `SettingsSidebar` 支持 3 个面板切换
- ✅ 设置翻译资源已添加（`settings.json`）
- ⏸️ 运行 `pnpm run dev`，打开设置侧边栏，能看到语言切换器（需手动测试）
- ⏸️ 切换语言后，设置面板文本立即更新（需手动测试）
- ⏸️ localStorage 中 `drawio2go-language` 键值正确更新（需手动测试）
- ⏸️ 刷新页面后，语言选择保持（需手动测试）
- ✅ 运行 `pnpm run lint` 无错误

---

## 实际修改文件清单

### 新增文件（2 个）

- `app/components/LanguageSwitcher.tsx` - 语言切换器组件
- `app/components/settings/GeneralSettingsPanel.tsx` - 通用设置面板

### 修改文件（6 个）

- `app/components/SettingsSidebar.tsx` - 集成 GeneralSettingsPanel，默认 Tab 改为 general
- `app/components/settings/SettingsNav.tsx` - 更新 SettingsTab 类型，新增 general 导航按钮
- `app/components/settings/index.ts` - 导出 GeneralSettingsPanel
- `app/components/AGENTS.md` - 更新组件文档
- `public/locales/zh-CN/settings.json` - 添加中文翻译
- `public/locales/en-US/settings.json` - 添加英文翻译

---

## UI 示例

**语言切换器**:

```
┌─────────────────────────────────┐
│ 🌐 语言 / Language              │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 简体中文                ▼  │ │
│ └─────────────────────────────┘ │
│                                 │
│ 切换界面显示语言                │
└─────────────────────────────────┘
```

**通用设置面板**:

```
┌─────────────────────────────────────┐
│ 通用设置                            │
│ 语言、文件路径等基础配置            │
│                                     │
│ [语言切换器]                        │
│                                     │
│ 默认文件路径                        │
│ ┌──────────────────┬─────────────┐ │
│ │ /home/user/...   │ 选择目录    │ │
│ └──────────────────┴─────────────┘ │
│ 新建项目时默认保存的目录            │
└─────────────────────────────────────┘
```

---

## 技术细节

### Electron API 修正

⚠️ **重要**：项目实际使用的 Electron API 为 `window.electron.selectFolder()`，而非文档初稿中的 `selectDirectory()`。

相关定义：

- `app/types/global.d.ts`: `selectFolder: () => Promise<string | null>`
- `electron/preload.js`: `selectFolder: () => ipcRenderer.invoke("select-folder")`

### 语言持久化策略

- ✅ 仅使用 localStorage（键名：`drawio2go-language`）
- ✅ 由 i18next-browser-languagedetector 自动处理
- ✅ 无需额外写入 Settings 表

### 保存机制

- ✅ 复用底部统一保存按钮（与 LLM/Version 面板一致）
- ✅ 语言切换立即生效（调用 `i18n.changeLanguage`）
- ✅ 默认路径需点击保存按钮（纳入 `hasChanges` 检测）

---

## 代码质量

- ✅ TypeScript 类型检查通过（`npx tsc --noEmit`）
- ✅ ESLint 检查通过（`pnpm run lint`）
- ✅ 遵循项目代码风格和命名规范
- ✅ HeroUI v3 复合组件模式正确使用
- ✅ 完整的错误处理和边界情况处理

---

## 注意事项

- ✅ 语言切换立即生效，无需刷新页面
- ✅ 语言选择持久化到 localStorage
- ✅ 通用设置面板为默认打开的标签页
- ✅ 文件路径选择功能仅在 Electron 环境可用，Web 环境按钮禁用

---

## 下一步

✅ **M2 已完成**，继续 [M3: TopBar 组件国际化](./milestone-3-topbar.md)
