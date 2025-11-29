# M1: 基础设施搭建

## 目标

搭建 i18n 基础设施，包括依赖安装、配置文件创建、目录结构初始化和根布局集成。

## 预估时间

1-2 小时

## 前置依赖

无

## 任务清单

### 1.1 安装依赖包

安装以下 npm 包（使用最新稳定版本）：

- `i18next` (实际安装: ^25.6.3)
- `react-i18next` (实际安装: ^16.3.5)
- `i18next-browser-languagedetector` (实际安装: ^8.2.0)

**命令**:

```bash
pnpm add i18next react-i18next i18next-browser-languagedetector
```

> **说明**: 不指定具体版本号，让 pnpm 自动选择最新稳定版本，确保获得最新的功能和安全补丁。

### 1.2 创建 i18n 配置文件

创建以下 3 个配置文件：

**文件 1: `app/i18n/config.ts`**

- 定义支持的语言列表: `['en-US', 'zh-CN']`
- 定义默认语言: `'en-US'`
- 定义命名空间列表（9 个）
- 导出语言显示名称映射
- 导出 TypeScript 类型定义（`Locale`, `Namespace`）

**文件 2: `app/i18n/client.ts`**

- 使用 `i18next.createInstance()` 创建独立实例
- 配置 `initReactI18next` 插件
- **自定义语言检测器** (`safeLocalStorageDetector`)：
  - 检测顺序: localStorage → navigator → htmlTag → 默认语言
  - localStorage 键名: `'drawio2go-language'`
  - 包裹 try/catch 处理 localStorage 访问异常（Electron 无痕模式兼容）
  - SSR 安全（不在服务端访问 localStorage）
- **自定义资源加载** (`fetchBackend`)：
  - 资源路径: `/locales/{{lng}}/{{ns}}.json`（对应 `public/locales/` 目录）
  - 支持 Electron `file://` 协议（检测 `window.electron` 并调整路径前缀）
  - 动态按需加载翻译资源（性能优化）
- 配置 `react.useSuspense: false`（静态导出要求，避免 SSR 水合问题）
- 配置 `fallbackLng: 'en-US'`
- 配置 `debug: false`（生产环境）

**文件 3: `app/i18n/hooks.ts`**

- 封装 `useTranslation` Hook，提供类型安全的命名空间参数

### 1.3 创建翻译资源目录结构

在 `public/` 目录下创建 `locales/` 目录：

```
public/locales/
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
mkdir -p public/locales/{en-US,zh-CN}
cd public/locales/en-US && touch common.json topbar.json sidebar.json chat.json settings.json version.json project.json errors.json validation.json
cd ../zh-CN && touch common.json topbar.json sidebar.json chat.json settings.json version.json project.json errors.json validation.json
```

初始每个文件内容为空对象 `{}`。

> **架构说明**: 翻译资源放在 `public/locales/` 而非根目录的原因：
>
> - ✅ 符合 Next.js 静态资源规范
> - ✅ 支持静态导出模式 (`output: "export"`)
> - ✅ Electron 打包时无需特殊处理
> - ✅ 资源路径与 `fetchBackend` 配置一致

### 1.4 创建 I18nProvider 组件

**创建 `app/components/I18nProvider.tsx`**:

这是一个客户端组件，负责 i18n 的初始化和生命周期管理。

**核心功能**：

- 使用 `"use client"` 指令标记为客户端组件
- 导入 i18n 实例（从 `@/app/i18n/client`）
- 使用 `I18nextProvider` 包裹子组件
- 监听 `languageChanged` 事件，动态更新 `<html lang="...">` 属性
- 在 `useEffect` 中注册和清理事件监听器

**SSR/Electron 兼容性处理**：

- ✅ **SSR 水合安全**: 避免在首次渲染时访问 `localStorage`，防止服务端与客户端内容不一致
- ✅ **Electron 兼容**: 安全访问 DOM API（检查 `typeof window !== 'undefined'`）
- ✅ **默认语言回退**: 首次渲染使用 props 或 `document.documentElement.lang` 或默认语言
- ✅ **localStorage 异常处理**: 所有 localStorage 访问都已在 `safeLocalStorageDetector` 中包裹 try/catch

**实现细节**：

```typescript
// 关键逻辑示例
useEffect(() => {
  const handleLanguageChange = (lng: string) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lng;
    }
  };

  i18n.on("languageChanged", handleLanguageChange);
  return () => {
    i18n.off("languageChanged", handleLanguageChange);
  };
}, []);
```

### 1.5 集成到根布局

**修改 `app/layout.tsx`**:

在 `<body>` 标签内使用 `<I18nProvider>` 包裹 `children`：

```tsx
import I18nProvider from "@/app/components/I18nProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
```

**要点**：

- ✅ 保持 `app/layout.tsx` 为服务端组件（**不添加** `"use client"`）
- ✅ 在 `<body>` 内而非 `<html>` 外使用 Provider
- ✅ `<html lang="zh-CN">` 作为默认值保留，I18nProvider 会动态更新
- ✅ 这样可以覆盖所有路由，而不仅是单个页面

> **架构说明**: 将 I18nProvider 放在 `layout.tsx` 的 `<body>` 内而非 `page.tsx` 的原因：
>
> - ✅ 覆盖所有路由（未来如果有多个页面）
> - ✅ 避免在每个页面重复初始化 i18n
> - ✅ 符合 Next.js App Router 最佳实践
> - ✅ i18n 上下文在整个应用中共享

### 1.6 运行验证

**运行 lint 检查**:

```bash
pnpm run lint
```

确保无 TypeScript 错误和 ESLint 警告。

**启动开发服务器**:

```bash
pnpm run dev
```

确保应用正常启动，无运行时错误。

## 验收标准

- [x] 依赖包成功安装（i18next ^25.6.3, react-i18next ^16.3.5, i18next-browser-languagedetector ^8.2.0）
- [x] `app/i18n/` 目录存在，包含 3 个配置文件（config.ts, client.ts, hooks.ts）
- [x] `public/locales/` 目录存在，包含 18 个空 JSON 文件（2 种语言 × 9 个命名空间）
- [x] `app/components/I18nProvider.tsx` 组件已创建，包含 SSR/Electron 兼容性处理
- [x] `app/layout.tsx` 在 `<body>` 内使用 `<I18nProvider>` 包裹 children
- [x] 运行 `pnpm run lint` 无错误
- [x] 运行 `pnpm run dev` 应用正常启动

## 注意事项

### 架构相关

- ✅ **i18n 实例初始化**: 通过 `I18nProvider` 组件间接初始化，无需在 layout.tsx 顶部直接导入
- ✅ **Provider 位置**: 必须在 `layout.tsx` 的 `<body>` 内使用，而不是在 `page.tsx` 中，确保覆盖所有路由
- ✅ **服务端组件**: `layout.tsx` 保持为服务端组件，不要添加 `"use client"`

### 配置相关

- ✅ **`useSuspense: false`**: 静态导出的必需配置，避免 SSR 水合问题
- ✅ **localStorage 键名**: 统一使用 `'drawio2go-language'`
- ✅ **资源路径**: 翻译资源必须放在 `public/locales/`，对应 fetchBackend 的路径配置

### 兼容性相关

- ✅ **SSR 安全**: 所有 localStorage 访问都在客户端 `useEffect` 中执行，避免服务端访问
- ✅ **Electron 兼容**: 自定义 fetchBackend 支持 `file://` 协议，localStorage 访问包裹 try/catch
- ✅ **水合一致性**: I18nProvider 首次渲染使用默认语言或 HTML lang 属性，避免内容不匹配

### 类型安全

- ✅ **TypeScript 类型**: 确保 `Locale` 和 `Namespace` 类型正确导出，供所有后续里程碑使用
- ✅ **类型安全 Hook**: 使用 `useAppTranslation` 而非直接使用 `useTranslation`，获得命名空间约束

## 实际完成情况

### 完成时间

2025-11-29（实际耗时约 2 小时）

### 完成质量

95/100（优秀）- 经过 general-purpose 验证代理审查确认

### 架构优化

相比原始计划，实施过程中进行了以下架构优化（均基于技术合理性）：

1. **翻译资源位置**: `locales/` → `public/locales/`
   - 原因：符合 Next.js 静态资源规范，支持静态导出和 Electron 打包

2. **Provider 集成位置**: `page.tsx` → `layout.tsx` 的 `<body>` 内
   - 原因：覆盖所有路由，避免重复初始化，符合 Next.js App Router 最佳实践

3. **资源加载策略**: 同步 require → 异步 fetchBackend
   - 原因：按需加载减少初始体积，支持 Electron file:// 协议

4. **语言检测器**: 标准实现 → 自定义 safeLocalStorageDetector
   - 原因：SSR 安全，Electron 无痕模式兼容，异常处理完善

5. **依赖包版本**: 指定版本 → 最新稳定版
   - 实际安装：i18next ^25.6.3, react-i18next ^16.3.5, i18next-browser-languagedetector ^8.2.0

### 已创建文件

- `app/i18n/config.ts` (29 行) - 配置中心
- `app/i18n/client.ts` (102 行) - i18next 实例
- `app/i18n/hooks.ts` (20 行) - 类型安全 Hook
- `app/components/I18nProvider.tsx` (66 行) - Provider 组件
- `public/locales/{en-US,zh-CN}/*.json` (18 个文件) - 翻译资源

### 已修改文件

- `app/layout.tsx` - 集成 I18nProvider
- `package.json` - 添加 3 个依赖包

### 验证结果

- ✅ `pnpm run lint` 通过
- ✅ `pnpm run dev` 成功启动
- ✅ 无 TypeScript 错误
- ✅ 无 ESLint 警告
- ✅ 无运行时错误

### 注意事项

后续里程碑（M2-M10）在实施时需要注意：

- 使用 `public/locales/` 路径引用翻译资源
- 使用 `useAppTranslation` Hook 而非直接使用 `useTranslation`
- 语言切换通过 `i18n.changeLanguage()` 方法，会自动更新 localStorage 和 HTML lang

## 下一步

完成后继续 [M2: 语言切换器（核心功能）](./milestone-2-language-switcher.md)
