# M1: 基础设施搭建

## 目标

搭建 i18n 基础设施，包括依赖安装、配置文件创建、目录结构初始化和根布局集成。

## 预估时间

1-2 小时

## 前置依赖

无

## 任务清单

### 1.1 安装依赖包

安装以下 npm 包：
- `i18next@^23.17.0`
- `react-i18next@^15.2.0`
- `i18next-browser-languagedetector@^8.0.2`

**命令**:
```bash
pnpm add i18next react-i18next i18next-browser-languagedetector
```

### 1.2 创建 i18n 配置文件

创建以下 3 个配置文件：

**文件 1: `app/i18n/config.ts`**
- 定义支持的语言列表: `['en-US', 'zh-CN']`
- 定义默认语言: `'en-US'`
- 定义命名空间列表（9 个）
- 导出语言显示名称映射
- 导出 TypeScript 类型定义（`Locale`, `Namespace`）

**文件 2: `app/i18n/client.ts`**
- 初始化 i18next 实例
- 配置语言检测器（检测顺序: localStorage → navigator.language → 默认）
- 配置 localStorage 键名: `'drawio2go-language'`
- 动态加载所有翻译资源（`require` 方式）
- 配置 `react.useSuspense: false`（静态导出要求）
- 配置 `fallbackLng: 'en-US'`

**文件 3: `app/i18n/hooks.ts`**
- 封装 `useTranslation` Hook，提供类型安全的命名空间参数

### 1.3 创建翻译资源目录结构

在项目根目录创建 `locales/` 目录：

```
locales/
├── en-US/
│   ├── common.json
│   ├── topbar.json
│   ├── sidebar.json
│   ├── chat.json
│   ├── settings.json
│   ├── version.json
│   ├── project.json
│   ├── errors.json
│   └── validation.json
└── zh-CN/
    ├── common.json
    ├── topbar.json
    ├── sidebar.json
    ├── chat.json
    ├── settings.json
    ├── version.json
    ├── project.json
    ├── errors.json
    └── validation.json
```

**命令**:
```bash
mkdir -p locales/{en-US,zh-CN}
cd locales/en-US && touch common.json topbar.json sidebar.json chat.json settings.json version.json project.json errors.json validation.json
cd ../zh-CN && touch common.json topbar.json sidebar.json chat.json settings.json version.json project.json errors.json validation.json
```

初始每个文件内容为空对象 `{}`。

### 1.4 集成到根布局

**修改 `app/layout.tsx`**:
- 在文件最顶部导入: `import "@/app/i18n/client";`
- 确保在所有其他导入之前

### 1.5 创建 I18nProvider 组件

**创建 `app/components/I18nProvider.tsx`**:
- 监听 i18n 语言变化事件
- 动态更新 `<html lang="...">` 属性
- 使用 `useEffect` 和事件监听器
- 客户端组件（`"use client"`）

**修改 `app/page.tsx`**:
- 导入 `I18nProvider`
- 用 `<I18nProvider>` 包裹页面所有内容

### 1.6 配置 webpack（可选）

如果需要，在 `next.config.mjs` 中添加 webpack 配置以正确处理 JSON 文件导入。

## 验收标准

- [ ] 依赖包成功安装
- [ ] `app/i18n/` 目录存在，包含 3 个配置文件
- [ ] `locales/` 目录存在，包含 18 个空 JSON 文件
- [ ] `app/layout.tsx` 正确导入 i18n 客户端
- [ ] `I18nProvider` 组件已创建
- [ ] `app/page.tsx` 使用 `I18nProvider` 包裹
- [ ] 运行 `pnpm run lint` 无错误
- [ ] 运行 `pnpm run dev` 应用正常启动

## 注意事项

- i18next 实例必须在任何组件使用前初始化，因此在 `layout.tsx` 顶部导入
- `useSuspense: false` 是静态导出的必需配置
- localStorage 键名统一使用 `'drawio2go-language'`
- 确保 TypeScript 类型定义正确导出，供后续使用

## 下一步

完成后继续 [M2: 语言切换器（核心功能）](./milestone-2-language-switcher.md)
