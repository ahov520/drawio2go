# DrawIO2Go - AI 代理开发指南

## 项目概述

基于 Electron + Next.js + HeroUI 构建的跨平台 DrawIO 编辑器应用。

### 核心技术栈
- **前端框架**: Next.js 15 (App Router) + React 19
- **UI 库**: HeroUI v3 (Alpha) - 复合组件模式
- **样式**: Tailwind CSS v4 (⚠️ 必须 v4，v3 不兼容)
- **DrawIO 集成**: 原生 iframe 实现 (react-drawio 作为备用)
- **桌面应用**: Electron 38.x
- **语言**: TypeScript
- **主题**: 现代扁平化设计 (#3388BB 蓝色主题)

### 项目结构
```
app/
├── components/
│   ├── DrawioEditorNative.tsx  # DrawIO 编辑器（原生 iframe + PostMessage）
│   ├── DrawioEditor.tsx        # DrawIO 编辑器（react-drawio 备用）
│   ├── BottomBar.tsx           # 底部工具栏
│   └── SettingsSidebar.tsx     # 设置侧边栏（可调整宽度）
├── layout.tsx                  # 根布局
├── page.tsx                    # 主页面
└── globals.css                 # 全局样式

electron/
├── main.js                     # Electron 主进程
└── preload.js                  # 预加载脚本（IPC 桥接）
```

## 核心开发准则

### 1. HeroUI v3 使用规范
- **复合组件**: 使用 `Card.Root`, `Card.Header`, `Card.Content` 等，不使用扁平化 props
- **事件处理**: 使用 `onPress` 代替 `onClick`
- **客户端指令**: 带交互的组件必须添加 `"use client"`
- **无 Provider**: HeroUI v3 不需要全局 Provider 包裹

### 2. Tailwind CSS v4 配置
- ⚠️ 必须使用 v4 版本（v3 不兼容）
- `globals.css` 使用 `@import "tailwindcss"`
- PostCSS 配置使用 `@tailwindcss/postcss`

### 3. DrawIO 集成方案
- **主方案**: 原生 iframe + PostMessage API (`DrawioEditorNative.tsx`)
- **备用方案**: react-drawio 组件 (`DrawioEditor.tsx`)
- **通信协议**:
  - 发送: `{action: 'load', xml: string, autosave: true}`
  - 接收: `{event: 'init'|'save'|'autosave'|'export', ...}`
- **安全检查**: 验证消息来源 `event.origin.includes('diagrams.net')`

### 4. Electron 配置要点
- **IPC API**: 通过 `window.electron` 暴露
  - `selectFolder()`: 选择文件夹
  - `saveDiagram(xml, path)`: 保存文件
  - `loadDiagram()`: 加载文件
  - `openExternal(url)`: 打开外部链接
- **安全策略**:
  - 开发模式: `webSecurity: false`, `sandbox: false`
  - 生产模式: 启用安全限制，CSP 仅允许 `embed.diagrams.net`
- **环境检测**: `typeof window !== "undefined" && (window as any).electron`

### 5. 状态持久化
- **localStorage**:
  - `currentDiagram`: 图表 XML
  - `defaultPath`: 默认保存路径
  - `sidebarWidth`: 侧边栏宽度
- **React State**: 组件内临时状态
- **保存策略**: 自动保存到 localStorage，手动保存到文件系统

## 核心功能实现

### 1. DrawIO 编辑器 (`DrawioEditorNative.tsx`)
```typescript
// 关键实现点
- iframe URL: https://embed.diagrams.net/?embed=1&proto=json&ui=kennedy
- PostMessage 通信: init → load → save/autosave → export
- 安全检查: 验证 event.origin
- 状态管理: useRef 追踪 XML 变化
```

### 2. 文件操作流程
- **保存**:
  1. 有默认路径 → 自动生成时间戳文件名
  2. 无默认路径 → 弹出 `showSaveDialog`
  3. 格式: `diagram_YYYY-MM-DDTHH-MM-SS.drawio`
- **加载**:
  1. Electron: `showOpenDialog` + `fs.readFileSync`
  2. 浏览器: HTML5 File API
  3. 加载后更新 localStorage 和状态

### 3. 设置侧边栏 (`SettingsSidebar.tsx`)
- **可调整宽度**: 拖拽左边缘调整 (300-800px)
- **持久化**: 宽度保存到 localStorage
- **CSS 变量**: `--sidebar-width` 动态更新
- **布局影响**: 编辑器区域自动适应

## 开发命令

```bash
npm run dev              # Next.js 开发服务器 (http://localhost:3000)
npm run electron:dev     # Electron + Next.js 开发模式
npm run build            # 构建 Next.js 应用
npm run electron:build   # 构建 Electron 应用 (输出到 dist/)
```

## 常见问题与解决方案

### 1. HeroUI v3 Alpha 警告
- ✅ 正常现象，v3 仍在 alpha 阶段
- 📖 优先使用 `context7` MCP 工具查询最新 API

### 2. Tailwind 样式不生效
- ✅ 检查 `globals.css` 导入顺序: Tailwind → HeroUI
- ✅ 确认使用 Tailwind v4 配置 (`@import "tailwindcss"`)

### 3. React 版本要求
- ⚠️ HeroUI v3 需要 React 19+
- ✅ 检查 `package.json`: `"react": "^19.0.0"`

### 4. DrawIO 在 Electron 中不显示

**症状**: Web 浏览器正常，Electron 中 iframe 不显示

**原因**: Electron 安全策略阻止外部 iframe (`embed.diagrams.net`)

**解决方案** (`electron/main.js` 已配置):

```javascript
// 1. webPreferences 配置
webSecurity: isDev ? false : true,    // 开发模式禁用
webviewTag: true,                      // 启用 webview
sandbox: isDev ? false : true,         // 开发模式禁用沙盒

// 2. CSP 配置（开发模式）
session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      "Content-Security-Policy": ["frame-src *; ..."]
    }
  });
});
```

**调试步骤**:
1. 打开 DevTools (开发模式自动打开)
2. 检查 Console: 查找 `✅ DrawIO iframe 初始化成功！`
3. 检查 Network: 确认 `embed.diagrams.net` 请求成功
4. 常见错误: `Refused to frame`, `ERR_BLOCKED_BY_CLIENT`

**生产环境**:
- ⚠️ 启用 `webSecurity: true`, `sandbox: true`
- ✅ CSP 仅允许 `frame-src https://embed.diagrams.net`
- 💡 可选: 自托管 DrawIO 静态文件

## 组件 API 参考

### DrawioEditorNative
```typescript
interface DrawioEditorNativeProps {
  initialXml?: string;           // 初始 XML 数据
  onSave?: (xml: string) => void; // 保存回调
}
```

### BottomBar
```typescript
interface BottomBarProps {
  onToggleSettings?: () => void;  // 切换设置侧栏
  onSave?: () => void;            // 保存按钮
  onLoad?: () => void;            // 加载按钮
}
```

### SettingsSidebar
```typescript
interface SettingsSidebarProps {
  isOpen: boolean;                                    // 是否打开
  onClose: () => void;                                // 关闭回调
  onSettingsChange?: (settings: {defaultPath: string}) => void; // 设置变更
}
```

## 项目仓库

**GitHub**: https://github.com/Menghuan1918/drawio2go

---

*最后更新: 2025-10-26*