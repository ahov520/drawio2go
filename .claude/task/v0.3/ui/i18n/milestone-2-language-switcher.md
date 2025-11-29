# M3: 核心功能组件

## 目标

创建语言切换器组件和通用设置面板，集成到设置侧边栏，为用户提供语言切换入口。

## 预估时间

3-4 小时

## 前置依赖

- M1: 基础设施搭建完成

## 任务清单

### 3.1 创建语言切换器组件

**创建 `app/components/LanguageSwitcher.tsx`**:

**功能需求**:
- 使用 HeroUI `Select` 组件
- 显示当前选中语言
- 支持切换到 en-US 或 zh-CN
- 使用 `useTranslation` Hook（`settings` 命名空间）
- 调用 `i18n.changeLanguage()` 切换语言
- 自动持久化到 localStorage（由 i18next-browser-languagedetector 处理）

**UI 要求**:
- 使用 `Languages` 图标（lucide-react）
- Label：显示"语言"（i18n）
- Description：说明语言切换立即生效（i18n）
- 下拉选项显示语言原生名称（English / 简体中文）

**组件标记**:
- 客户端组件（`"use client"`）

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

### 3.2 创建通用设置面板

**创建 `app/components/settings/GeneralSettingsPanel.tsx`**:

**功能需求**:
- 整合现有的文件默认路径设置
- 嵌入 `LanguageSwitcher` 组件
- 使用 `useTranslation` Hook（`settings` 命名空间）

**包含设置项**:
1. **语言切换**（LanguageSwitcher 组件）
2. **默认文件路径**:
   - TextField 组件
   - 输入框 + "选择目录"按钮
   - 使用 Electron API `window.electron.selectDirectory()`（仅 Electron 环境）

**UI 结构**:
```tsx
<div className="settings-panel">
  <h3>{t('general.title')}</h3>
  <p>{t('general.description')}</p>

  <LanguageSwitcher />

  <TextField>
    <Label>{t('general.defaultPath.label')}</Label>
    <div className="flex gap-2">
      <Input value={...} onChange={...} />
      <Button onPress={handleSelectPath}>
        <FolderOpen />
        {t('general.defaultPath.selectButton')}
      </Button>
    </div>
    <Description>{t('general.defaultPath.description')}</Description>
  </TextField>
</div>
```

**Props**:
```typescript
interface GeneralSettingsPanelProps {
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

### 3.3 更新设置导航

**修改 `app/components/settings/SettingsNav.tsx`**:

**任务**:
1. 新增 "general" 标签页
2. 更新 `SettingsTab` 类型定义：
   ```typescript
   export type SettingsTab = "general" | "llm" | "version";
   ```
3. 添加 general 按钮，使用 `Settings` 图标（lucide-react）
4. 国际化导航标签 Aria 文本

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
1. General（Settings 图标）
2. LLM（Bot 图标）
3. Version（GitBranch 图标）

### 3.4 更新设置侧边栏

**修改 `app/components/SettingsSidebar.tsx`**:

**任务**:
1. 导入 `GeneralSettingsPanel`
2. 在 Tab 切换逻辑中新增 "general" 分支
3. 传递必要的 props（defaultPath, onDefaultPathChange）
4. 确保默认 Tab 为 "general"

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

### 3.5 添加翻译资源

在 `locales/zh-CN/settings.json` 和 `locales/en-US/settings.json` 中添加所有需要的翻译键值（参考上述示例）。

## 验收标准

- [ ] `LanguageSwitcher` 组件已创建，UI 美观
- [ ] `GeneralSettingsPanel` 组件已创建
- [ ] `SettingsNav` 包含 3 个标签（General、LLM、Version）
- [ ] `SettingsSidebar` 支持 3 个面板切换
- [ ] 设置翻译资源已添加（`settings.json`）
- [ ] 运行 `pnpm run dev`，打开设置侧边栏，能看到语言切换器
- [ ] 切换语言后，设置面板文本立即更新
- [ ] localStorage 中 `drawio2go-language` 键值正确更新
- [ ] 刷新页面后，语言选择保持
- [ ] 运行 `pnpm run lint` 无错误

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

## 注意事项

- 语言切换立即生效，无需刷新页面
- 语言选择持久化到 localStorage
- 通用设置面板应该是默认打开的标签页
- 文件路径选择功能仅在 Electron 环境可用，Web 环境应禁用或隐藏按钮

## 下一步

完成后继续 [M3: TopBar 组件国际化](./milestone-3-topbar.md)
