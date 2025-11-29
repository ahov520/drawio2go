# M5: UnifiedSidebar 组件国际化

## 目标

完成 UnifiedSidebar 组件的国际化改造，包括 Tab 标签、Aria 标签和导航文本。

## 预估时间

0.5-1 小时

## 前置依赖

- M1: 基础设施搭建完成
- M2: 语言切换器可用
- M3-M4: TopBar 和 ProjectSelector 完成

## 任务清单

### 5.1 提取中文文本

**文件**: `app/components/UnifiedSidebar.tsx`

**需要提取的文本** (~10 条):

- Tab 标签（聊天、设置、版本）
- Aria 标签（导航、选项卡等）
- 工具提示文本（如有）

### 5.2 创建翻译资源

**更新文件**:

- `locales/zh-CN/sidebar.json`
- `locales/en-US/sidebar.json`

**翻译结构示例**:

```json
{
  "tabs": {
    "chat": "聊天",
    "settings": "设置",
    "version": "版本"
  },
  "aria": {
    "navigation": "侧边栏导航",
    "selectTab": "选择 {{tab}} 标签页"
  },
  "tooltips": {
    "chat": "聊天与对话",
    "settings": "应用设置",
    "version": "版本管理"
  }
}
```

### 5.3 改造组件代码

**改造步骤**:

1. 导入 Hook:

```tsx
import { useTranslation } from "@/app/i18n/hooks";

export default function UnifiedSidebar() {
  const { t } = useTranslation("sidebar");
  // ...
}
```

2. 替换 Tab 标签:

```tsx
// 改造前
<Tabs>
  <Tab id="chat">聊天</Tab>
  <Tab id="settings">设置</Tab>
  <Tab id="version">版本</Tab>
</Tabs>

// 改造后
<Tabs>
  <Tab id="chat">{t('tabs.chat')}</Tab>
  <Tab id="settings">{t('tabs.settings')}</Tab>
  <Tab id="version">{t('tabs.version')}</Tab>
</Tabs>
```

3. 添加 Aria 标签:

```tsx
// 改造后
<Tabs aria-label={t("aria.navigation")}>
  <Tab id="chat" aria-label={t("aria.selectTab", { tab: t("tabs.chat") })}>
    {t("tabs.chat")}
  </Tab>
  {/* ... */}
</Tabs>
```

4. 如果有工具提示:

```tsx
// 使用 HeroUI Tooltip 组件
<Tooltip content={t("tooltips.chat")}>
  <Tab id="chat">{t("tabs.chat")}</Tab>
</Tooltip>
```

### 5.4 验证功能

**测试场景**:

1. 打开应用，查看侧边栏
2. 切换到英语
3. 验证：
   - [ ] Tab 标签显示为英文
   - [ ] 工具提示（如有）显示为英文
   - [ ] Aria 标签正确（检查 DOM）
4. 切换到中文
5. 验证：
   - [ ] Tab 标签立即更新为中文
6. 点击每个 Tab
7. 验证：
   - [ ] Tab 切换功能正常
   - [ ] 内容区域正确显示

## 翻译资源完整示例

**`locales/zh-CN/sidebar.json`**:

```json
{
  "tabs": {
    "chat": "聊天",
    "settings": "设置",
    "version": "版本"
  },
  "aria": {
    "navigation": "侧边栏导航",
    "selectTab": "选择 {{tab}} 标签页",
    "closePanel": "关闭侧边栏"
  },
  "tooltips": {
    "chat": "聊天与对话管理",
    "settings": "应用程序设置",
    "version": "版本控制与历史"
  }
}
```

**`locales/en-US/sidebar.json`**:

```json
{
  "tabs": {
    "chat": "Chat",
    "settings": "Settings",
    "version": "Version"
  },
  "aria": {
    "navigation": "Sidebar navigation",
    "selectTab": "Select {{tab}} tab",
    "closePanel": "Close sidebar"
  },
  "tooltips": {
    "chat": "Chat and conversation management",
    "settings": "Application settings",
    "version": "Version control and history"
  }
}
```

## 验收标准

- [ ] `UnifiedSidebar.tsx` 已导入 `useTranslation`
- [ ] Tab 标签全部国际化
- [ ] Aria 标签全部国际化
- [ ] `sidebar.json` 翻译文件完整（zh-CN + en-US）
- [ ] 切换语言后 Tab 标签立即更新
- [ ] Tab 切换功能正常
- [ ] 运行 `grep -n "[\u4e00-\u9fa5]" app/components/UnifiedSidebar.tsx` 无硬编码中文
- [ ] 运行 `pnpm run lint` 无错误

## 注意事项

1. **Tab 状态**: 切换语言不应影响当前选中的 Tab
2. **简洁性**: 由于此组件较简单，确保翻译键名清晰、易于理解
3. **一致性**: Tab 标签的翻译应与其他地方引用这些概念时保持一致（如 ChatSidebar、SettingsSidebar）

## 下一步

完成后继续 [M6: 设置模块国际化](./milestone-6-settings-module.md)
