# MCP 组件（mcp/）

## 概述

该目录承载 MCP（Model Context Protocol）相关 UI 组件。

## 组件清单

### McpButton.tsx

用于展示 MCP 接口暴露状态的按钮组件：

- 未激活：`variant="secondary"`，文本 "MCP 接口"
- 已激活：`variant="primary"`，文本 "暴露中"
- 事件：使用 HeroUI v3 的 `onPress`，禁用使用 `isDisabled`

### McpConfigDialog.tsx

MCP 配置对话框组件：

- 结构：React Aria `ModalOverlay` + `Modal` + HeroUI `Surface`
- Web 环境：显示“仅支持 APP 端”提示并禁用确认
- 表单：
  - IP 选择：`RadioGroup`（127.0.0.1 / 0.0.0.0），选择 0.0.0.0 时展示安全警告
  - 端口输入：`Input type="number"`（8000-9000），支持“随机端口”按钮调用 `window.electronMcp.getRandomPort()`
- 按钮：取消 `variant="tertiary"`，确认 `variant="primary"`（提交时显示 `Spinner`）

### McpConfigDisplay.tsx

MCP 配置展示组件（代码块 + 复制按钮）：

- 根据 `McpClientType` 生成配置示例文本（里程碑 5 未落地前先使用简化 JSON 占位模板）
- 使用 `<pre><code>` 展示，并为 `<code>` 添加 `language-json` class 便于后续接入语法高亮
- 右上角复制按钮：复制到剪贴板后 Toast 提示“配置已复制”

### McpExposureOverlay.tsx

MCP 全屏暴露界面（不可关闭遮罩）：

- 使用 React Aria `ModalOverlay` + `Modal`，`z-index: 2000`，背景 `bg-black/80`
- 头部：标题 + `host:port` 状态 + danger 停止按钮
- 客户端选择：HeroUI `Select`（Cursor / Claude Code / Codex / Gemini CLI / 通用），默认 Cursor
- 配置展示：复用 `McpConfigDisplay`
- 提示：蓝色提示框“版本控制功能在被外部 MCP 调用中依然有效”
