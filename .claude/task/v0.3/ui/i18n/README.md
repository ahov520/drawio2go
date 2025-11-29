# DrawIO2Go 国际化 (i18n) 任务

## 项目概述

为 DrawIO2Go 项目添加完整的国际化支持，支持英语（en-US，默认）和简体中文（zh-CN）。

## 技术方案

- **i18n 库**: react-i18next + i18next
- **部署模式**: 纯客户端方案（支持 Next.js 静态导出）
- **语言检测**: localStorage + navigator.language
- **默认语言**: 英语 (en-US)
- **实施策略**: 按组件逐步完成（翻译 + 改造 + 格式化）

## 里程碑概览

| 里程碑 | 任务 | 预估时间 | 依赖 |
|--------|------|----------|------|
| M1 | 基础设施搭建 | 1-2h | - |
| M2 | 语言切换器（核心功能） | 1.5-2h | M1 |
| M3 | TopBar 组件国际化 | 1-1.5h | M1, M2 |
| M4 | ProjectSelector 组件国际化 | 1.5-2h | M1-M3 |
| M5 | UnifiedSidebar 组件国际化 | 0.5-1h | M1-M4 |
| M6 | 设置模块国际化 | 2-3h | M1-M5 |
| M7 | 版本管理模块国际化 | 2.5-3h | M1-M6 |
| M8 | 聊天模块国际化 | 3-4h | M1-M7 |
| M9 | 错误消息国际化 | 1-2h | M1-M8 |
| M10 | 测试验证 | 2-3h | M1-M9 |

**总计**: 17-24 小时（2-3 个工作日）

## 实施策略说明

### 为什么按组件逐步完成？

与原先的"先提取所有翻译，再批量改造"不同，新的策略是：

**每个组件独立完成**：
1. 提取该组件的中文文本
2. 创建/更新翻译资源（zh-CN + en-US）
3. 改造组件代码（添加 useTranslation，替换硬编码）
4. 如涉及日期/数字，同时处理格式化
5. 立即测试该组件

**优势**：
- ✅ 每个组件完成后立即可测试，降低调试难度
- ✅ 降低一次性工作量，避免大规模翻译资源错误
- ✅ 更容易追踪进度和问题定位
- ✅ 可以灵活调整优先级（先做重要组件）

**顺序设计**：
- **M3**: TopBar（最简单，快速验证流程）
- **M4**: ProjectSelector（表单验证，学习验证消息处理）
- **M5**: UnifiedSidebar（简单，承上启下）
- **M6**: 设置模块（已有 M2 的 GeneralSettingsPanel 基础）
- **M7**: 版本管理（中等复杂度，涉及日期格式化）
- **M8**: 聊天模块（最复杂，约 100 条翻译，17 个文件）

## 项目约束

- 必须支持 Next.js 静态导出模式 (`output: 'export'`)
- 兼容 Electron 和 Web 双环境
- 不能使用服务端 i18n 方案
- 一次性完成所有组件国际化（不分阶段上线）

## 用户决策

- **默认语言**: 英语 (en-US)
- **语言切换器位置**: 设置侧边栏（新建通用设置面板）
- **实施策略**: 按组件逐步完成
- **翻译质量**: AI 辅助翻译

## 翻译范围

约 435 条翻译键值，分布在 9 个命名空间：

| 命名空间 | 用途 | 预估条数 | 主要组件 |
|---------|------|---------|---------|
| common | 通用文本、时间、操作等 | 80 | 全局 |
| topbar | 顶栏组件 | 15 | TopBar |
| sidebar | 侧边栏导航 | 10 | UnifiedSidebar |
| chat | 聊天模块 | 100 | ChatSidebar, chat/* |
| settings | 设置模块 | 60 | SettingsSidebar, settings/* |
| version | 版本管理 | 80 | VersionSidebar, version/* |
| project | 项目管理 | 30 | ProjectSelector |
| errors | 错误消息 | 40 | 全局 |
| validation | 验证消息 | 20 | 表单组件 |

## 目录结构

```
locales/                          # 项目根目录
├── en-US/                        # 英语翻译
│   ├── common.json               # 通用文本
│   ├── topbar.json               # 顶栏
│   ├── sidebar.json              # 侧边栏
│   ├── chat.json                 # 聊天
│   ├── settings.json             # 设置
│   ├── version.json              # 版本管理
│   ├── project.json              # 项目
│   ├── errors.json               # 错误消息
│   └── validation.json           # 验证消息
└── zh-CN/                        # 简体中文翻译
    └── (同上结构)

app/i18n/
├── config.ts                     # 语言和命名空间配置
├── client.ts                     # i18next 客户端实例
└── hooks.ts                      # 类型安全的 useTranslation Hook

app/lib/
└── format-utils.ts               # 日期/数字格式化工具（支持 locale）
```

## 开始执行

请按照里程碑顺序执行：

1. [M1: 基础设施搭建](./milestone-1-infrastructure.md)
2. [M2: 语言切换器（核心功能）](./milestone-2-language-switcher.md)
3. [M3: TopBar 组件国际化](./milestone-3-topbar.md)
4. [M4: ProjectSelector 组件国际化](./milestone-4-project-selector.md)
5. [M5: UnifiedSidebar 组件国际化](./milestone-5-unified-sidebar.md)
6. [M6: 设置模块国际化](./milestone-6-settings-module.md)
7. [M7: 版本管理模块国际化](./milestone-7-version-module.md)
8. [M8: 聊天模块国际化](./milestone-8-chat-module.md)
9. [M9: 错误消息国际化](./milestone-9-error-messages.md)
10. [M10: 测试验证](./milestone-10-testing.md)

## 快速检查清单

### 基础设施（M1-M2）
- [ ] 依赖包已安装（i18next, react-i18next, i18next-browser-languagedetector）
- [ ] i18n 配置文件已创建（config.ts, client.ts, hooks.ts）
- [ ] 翻译资源目录结构已创建（locales/en-US, locales/zh-CN）
- [ ] 语言切换器组件已创建并集成到设置侧边栏

### 组件改造（M3-M8）
- [ ] TopBar 组件完全国际化
- [ ] ProjectSelector 组件完全国际化
- [ ] UnifiedSidebar 组件完全国际化
- [ ] 设置模块完全国际化（General, LLM, Version）
- [ ] 版本管理模块完全国际化（含日期格式化）
- [ ] 聊天模块完全国际化（含相对时间）

### 错误和验证（M9）
- [ ] 存储层错误消息国际化
- [ ] API 路由错误消息国际化
- [ ] 表单验证消息国际化

### 测试验证（M10）
- [ ] 语言切换功能正常
- [ ] 所有 UI 文本已国际化
- [ ] 日期时间格式根据语言正确显示
- [ ] 错误消息根据语言显示
- [ ] Electron 和 Web 环境测试通过
- [ ] 无 TypeScript 错误（`pnpm run lint`）
- [ ] 无中文硬编码（除注释）

## 常见问题

**Q: 如何处理动态内容（如用户输入、文件名）？**
A: 动态内容不翻译，只翻译周围的静态文本，使用插值变量：
```tsx
{t('fileLoaded', { fileName: file.name })}
// 翻译: "已加载文件 {{fileName}}" / "File {{fileName}} loaded"
```

**Q: 如何在非 React 组件中使用翻译（如 API 路由）？**
A: 直接导入 i18n 实例：
```typescript
import i18n from '@/app/i18n/client';
const message = i18n.t('errors:chat.sendFailed');
```

**Q: 如何确保中英文翻译键值对齐？**
A: 运行验收标准中的键值对齐检查脚本（见 M10）。

**Q: 日期格式为什么要传 locale 参数？**
A: 因为格式化工具可能在语言切换前被调用，传递 `i18n.language` 确保使用当前语言。

## 技术要点

### 1. 客户端组件标记
所有使用 `useTranslation` 的组件必须标记为客户端组件：
```tsx
"use client";

import { useTranslation } from "@/app/i18n/hooks";
```

### 2. 跨命名空间引用
```tsx
const { t } = useTranslation('chat');

// 引用其他命名空间
<Button>{t('common:actions.save')}</Button>
```

### 3. 复数形式处理
英文需要区分单复数，中文不需要：
```json
// en-US
{
  "messageCount_one": "{{count}} message",
  "messageCount_other": "{{count}} messages"
}

// zh-CN
{
  "messageCount": "{{count}} 条消息"
}
```

### 4. 日期格式化
```tsx
import { formatVersionTimestamp } from "@/app/lib/format-utils";

const { i18n } = useTranslation();
const formattedDate = formatVersionTimestamp(timestamp, 'full', i18n.language);

// en-US: 12/25/2024, 3:45 PM
// zh-CN: 2024/12/25 15:45
```

## 项目完成标志

当所有验收标准通过后，国际化任务完成。此时：
1. 应用支持完整的中英文切换
2. 所有界面文本、日期、错误消息已国际化
3. 语言切换流畅，用户体验良好
4. 代码质量符合项目标准
5. 在 Web 和 Electron 环境下正常运行

恭喜！DrawIO2Go 国际化改造完成！🎉
