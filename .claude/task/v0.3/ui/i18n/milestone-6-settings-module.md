# M6: 设置模块国际化

## 目标

完成设置模块所有组件的国际化改造，包括 GeneralSettingsPanel（M2 已完成）、LLMSettingsPanel、VersionSettingsPanel 和其他设置子组件。

## 预估时间

2-3 小时

## 前置依赖

- M1: 基础设施搭建完成
- M2: 语言切换器（GeneralSettingsPanel）已完成
- M3-M5: TopBar、ProjectSelector、UnifiedSidebar 完成

## 任务清单

### 6.1 提取中文文本

**涉及文件**:
- `app/components/SettingsSidebar.tsx`
- `app/components/settings/SettingsNav.tsx`
- `app/components/settings/LLMSettingsPanel.tsx`
- `app/components/settings/VersionSettingsPanel.tsx`
- `app/components/settings/SystemPromptEditor.tsx`（如有）
- 其他设置子组件

**需要提取的文本** (~60 条):
- LLM 配置：模型名称、API Key、Base URL、温度参数等标签
- 版本设置：自动快照、快照间隔、保留策略等
- 系统提示词：编辑器标签、占位符、帮助文本
- 导航标签：通用、LLM、版本
- 按钮和操作文本

### 6.2 创建翻译资源

**更新文件**:
- `locales/zh-CN/settings.json`（M2 已创建部分内容）
- `locales/en-US/settings.json`

**翻译结构示例**:
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
      "label": "语言",
      "description": "切换界面显示语言"
    },
    "defaultPath": {
      "label": "默认文件路径",
      "placeholder": "/home/user/drawio",
      "selectButton": "选择目录",
      "description": "新建项目时默认保存的目录"
    }
  },
  "llm": {
    "title": "LLM 配置",
    "description": "配置大语言模型相关参数",
    "provider": {
      "label": "提供商",
      "description": "选择 LLM 服务提供商"
    },
    "apiKey": {
      "label": "API Key",
      "placeholder": "输入 API Key",
      "description": "用于验证的 API 密钥",
      "show": "显示",
      "hide": "隐藏"
    },
    "baseUrl": {
      "label": "Base URL",
      "placeholder": "https://api.openai.com/v1",
      "description": "API 服务地址"
    },
    "model": {
      "label": "模型名称",
      "placeholder": "gpt-4",
      "description": "使用的模型标识符"
    },
    "temperature": {
      "label": "温度 (Temperature)",
      "description": "控制输出的随机性 (0-2)",
      "value": "当前值: {{value}}"
    },
    "maxTokens": {
      "label": "最大 Token 数",
      "description": "单次请求的最大 Token 数"
    }
  },
  "version": {
    "title": "版本设置",
    "description": "自动快照和版本管理配置",
    "autoSnapshot": {
      "label": "自动快照",
      "description": "保存时自动创建版本快照",
      "enabled": "已启用",
      "disabled": "已禁用"
    },
    "snapshotInterval": {
      "label": "快照间隔",
      "description": "自动创建快照的时间间隔（分钟）"
    },
    "retention": {
      "label": "保留策略",
      "description": "旧版本的保留规则",
      "keepAll": "保留所有",
      "keepLast": "仅保留最近 {{count}} 个",
      "keepDays": "保留 {{days}} 天内"
    }
  },
  "systemPrompt": {
    "title": "系统提示词",
    "description": "自定义 AI 助手的系统提示词",
    "label": "提示词内容",
    "placeholder": "输入系统提示词...",
    "reset": "重置为默认",
    "save": "保存"
  },
  "buttons": {
    "save": "保存",
    "cancel": "取消",
    "reset": "重置",
    "test": "测试连接"
  },
  "messages": {
    "saved": "设置已保存",
    "resetConfirm": "确定要重置所有设置吗？",
    "testSuccess": "连接测试成功",
    "testFailed": "连接测试失败: {{error}}"
  }
}
```

### 6.3 改造 LLMSettingsPanel

**文件**: `app/components/settings/LLMSettingsPanel.tsx`

**改造要点**:

1. 导入 Hook:
```tsx
import { useTranslation } from "@/app/i18n/hooks";

export default function LLMSettingsPanel() {
  const { t } = useTranslation('settings');
  // ...
}
```

2. 替换表单标签:
```tsx
<TextField>
  <Label>{t('llm.apiKey.label')}</Label>
  <Input
    type={showKey ? 'text' : 'password'}
    placeholder={t('llm.apiKey.placeholder')}
  />
  <Description>{t('llm.apiKey.description')}</Description>
</TextField>
```

3. 处理滑块组件（温度参数）:
```tsx
<Slider
  label={t('llm.temperature.label')}
  description={t('llm.temperature.value', { value: temperature })}
  minValue={0}
  maxValue={2}
  step={0.1}
  value={temperature}
  onChange={setTemperature}
/>
```

4. 处理按钮:
```tsx
<Button onPress={handleSave}>{t('buttons.save')}</Button>
<Button onPress={handleTest}>{t('buttons.test')}</Button>
```

### 6.4 改造 VersionSettingsPanel

**文件**: `app/components/settings/VersionSettingsPanel.tsx`

**改造要点**:

1. Switch 组件:
```tsx
<Switch isSelected={autoSnapshot} onChange={setAutoSnapshot}>
  {t('version.autoSnapshot.label')}
</Switch>
<Description>
  {t('version.autoSnapshot.description')} -
  {autoSnapshot ? t('version.autoSnapshot.enabled') : t('version.autoSnapshot.disabled')}
</Description>
```

2. NumberField 组件:
```tsx
<NumberField
  label={t('version.snapshotInterval.label')}
  description={t('version.snapshotInterval.description')}
  value={interval}
  onChange={setInterval}
  minValue={1}
  maxValue={60}
/>
```

3. Select 组件（保留策略）:
```tsx
<Select
  label={t('version.retention.label')}
  description={t('version.retention.description')}
  selectedKey={retentionPolicy}
  onSelectionChange={setRetentionPolicy}
>
  <SelectItem key="all">{t('version.retention.keepAll')}</SelectItem>
  <SelectItem key="last-10">
    {t('version.retention.keepLast', { count: 10 })}
  </SelectItem>
  <SelectItem key="days-30">
    {t('version.retention.keepDays', { days: 30 })}
  </SelectItem>
</Select>
```

### 6.5 改造 SystemPromptEditor

**文件**: `app/components/settings/SystemPromptEditor.tsx`（如存在）

**改造要点**:

1. 文本编辑器:
```tsx
<TextArea
  label={t('systemPrompt.label')}
  placeholder={t('systemPrompt.placeholder')}
  description={t('systemPrompt.description')}
  value={prompt}
  onChange={setPrompt}
  rows={10}
/>
```

2. 重置确认:
```tsx
const handleReset = () => {
  if (confirm(t('messages.resetConfirm'))) {
    resetToDefault();
  }
};
```

### 6.6 更新 SettingsNav

**文件**: `app/components/settings/SettingsNav.tsx`

确保导航标签国际化：
```tsx
const { t } = useTranslation('settings');

<Button aria-label={t('nav.general')}>
  <Settings size={20} />
  <span>{t('nav.general')}</span>
</Button>
```

### 6.7 验证功能

**测试场景**:
1. 打开设置侧边栏
2. 切换到英语
3. 验证：
   - [ ] 导航标签（通用、LLM、版本）显示为英文
   - [ ] LLM 配置面板所有标签、描述、占位符为英文
   - [ ] 版本设置面板所有标签为英文
4. 填写 LLM 配置
5. 切换到中文
6. 验证：
   - [ ] 所有文本立即更新为中文
   - [ ] 已填写的输入内容不变
   - [ ] 滑块显示值正确更新
7. 测试连接
8. 验证：
   - [ ] 成功/失败消息根据语言显示

## 翻译资源完整示例

详见上述 6.2 节的完整 JSON 示例。

**`locales/en-US/settings.json`** 对应翻译：
```json
{
  "nav": {
    "general": "General",
    "llm": "LLM Config",
    "version": "Version"
  },
  "general": {
    "title": "General Settings",
    "description": "Language, file paths, and other basic configurations",
    "language": {
      "label": "Language",
      "description": "Switch interface language"
    },
    "defaultPath": {
      "label": "Default File Path",
      "placeholder": "/home/user/drawio",
      "selectButton": "Select Directory",
      "description": "Default directory for new projects"
    }
  },
  "llm": {
    "title": "LLM Configuration",
    "description": "Configure large language model parameters",
    "provider": {
      "label": "Provider",
      "description": "Select LLM service provider"
    },
    "apiKey": {
      "label": "API Key",
      "placeholder": "Enter API Key",
      "description": "API key for authentication",
      "show": "Show",
      "hide": "Hide"
    },
    "baseUrl": {
      "label": "Base URL",
      "placeholder": "https://api.openai.com/v1",
      "description": "API service endpoint"
    },
    "model": {
      "label": "Model Name",
      "placeholder": "gpt-4",
      "description": "Model identifier to use"
    },
    "temperature": {
      "label": "Temperature",
      "description": "Controls randomness of output (0-2)",
      "value": "Current value: {{value}}"
    },
    "maxTokens": {
      "label": "Max Tokens",
      "description": "Maximum tokens per request"
    }
  },
  "version": {
    "title": "Version Settings",
    "description": "Auto snapshot and version management configuration",
    "autoSnapshot": {
      "label": "Auto Snapshot",
      "description": "Automatically create version snapshots on save",
      "enabled": "Enabled",
      "disabled": "Disabled"
    },
    "snapshotInterval": {
      "label": "Snapshot Interval",
      "description": "Time interval for automatic snapshots (minutes)"
    },
    "retention": {
      "label": "Retention Policy",
      "description": "Rules for keeping old versions",
      "keepAll": "Keep all",
      "keepLast": "Keep last {{count}}",
      "keepDays": "Keep for {{days}} days"
    }
  },
  "systemPrompt": {
    "title": "System Prompt",
    "description": "Customize AI assistant system prompt",
    "label": "Prompt Content",
    "placeholder": "Enter system prompt...",
    "reset": "Reset to Default",
    "save": "Save"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "reset": "Reset",
    "test": "Test Connection"
  },
  "messages": {
    "saved": "Settings saved",
    "resetConfirm": "Are you sure you want to reset all settings?",
    "testSuccess": "Connection test successful",
    "testFailed": "Connection test failed: {{error}}"
  }
}
```

## 验收标准

- [ ] `LLMSettingsPanel.tsx` 完全国际化
- [ ] `VersionSettingsPanel.tsx` 完全国际化
- [ ] `SystemPromptEditor.tsx`（如有）完全国际化
- [ ] `SettingsNav.tsx` 导航标签国际化
- [ ] `settings.json` 翻译文件完整（zh-CN + en-US）
- [ ] 所有表单标签、占位符、描述国际化
- [ ] 按钮和消息文本国际化
- [ ] 切换语言后所有文本立即更新
- [ ] 表单输入内容不受语言切换影响
- [ ] 滑块、开关等控件显示文本正确更新
- [ ] 运行 `grep -rn "[\u4e00-\u9fa5]" app/components/settings --include="*.tsx"` 无硬编码中文
- [ ] 运行 `pnpm run lint` 无错误

## 注意事项

1. **敏感信息**: API Key 等敏感信息的显示/隐藏按钮文本也需要国际化
2. **动态值**: 滑块当前值、保留策略等动态内容使用插值变量
3. **确认对话框**: 使用原生 `confirm()` 时，消息需要国际化
4. **Toast 通知**: 如果使用 Toast 提示，确保消息也国际化

## 下一步

完成后继续 [M7: 版本管理模块国际化](./milestone-7-version-module.md)
