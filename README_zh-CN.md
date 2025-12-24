<img width="250px" src="public/icon/logo.svg" align="left"/>

# DrawIO2Go

<strong>AI 加持，人机共绘</strong>

![Electron](https://img.shields.io/badge/Electron-38.x-47848F?logo=electron&logoColor=white)
![Nextjs](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Windows](https://img.shields.io/badge/-Windows-blue?logo=windows&logoColor=white)
![MacOS](https://img.shields.io/badge/-macOS-black?&logo=apple&logoColor=white)
![Linux](https://img.shields.io/badge/-Linux-yellow?logo=linux&logoColor=white)

<p align="center">
  简体中文 | <a href="./README.md">English</a>
</p>

---

一款现代化的 DrawIO 编辑器应用，致力于在AI加持下构建更好的**人机协同**建模工具。以用户为中心，提升人机功效，探索如何让更好与AI取长补短。提供开箱即用的应用(Windows/Linux/Mac OS)或作为网页部署。

<div align="center">
<img alt="image" src="https://github.com/user-attachments/assets/4ede9b64-dfe0-4aa7-be5c-4440ca520db7" width="60%" />
</div>
<div align="center">
<table width="100%">
  <tr>
    <td width="33.33%" valign="top" align="center">
      <h3>版本管理</h3>
      <p>手动创建版本/AI自动创建版本</p>
      <img src="https://github.com/user-attachments/assets/59d8c33a-af5c-4433-ae94-99827509e632" alt="版本控制" width="60%" />
      <br />
    </td>
    <td width="33.33%" valign="top" align="center">
      <h3>AI加持修改</h3>
      <p>基于XPath的精准删改查工具，效果好省token</p>
      <img src="https://github.com/user-attachments/assets/db4c17b7-49f9-407d-a046-227092e70708" alt="演示" width="60%" />
      <br />
    </td>
    <td width="33.33%" valign="top" align="center">
      <h3>MCP服务</h3>
      <p>启动带版本管理的MCP服务，连接其他应用</p>
      <img src="https://github.com/user-attachments/assets/2109487f-b597-41b6-881a-8ac69a3d787c" alt="MCP" />
      <br />
    </td>
  </tr>
  <tr>
    <td width="33.33%" valign="top" align="center">
      <h3>多供应商管理</h3>
      <p>支持多LLM供应商/多模型切换*</p>
      <img src="https://github.com/user-attachments/assets/eeda8d0e-0d80-45c6-a51b-104724bf2094" alt="多供应商控制" width="50%" />
      <br />
    </td>
    <td width="33.33%" valign="top" align="center">
      <h3>版本对比</h3>
      <p>轻松对比/回滚不同修改版本之间的差异</p>
      <img src="https://github.com/user-attachments/assets/b264ee8f-dedd-429d-8501-fb02efe12b44" alt="对比页面" width="100%" />
      <br />
      <br />
    </td>
    <td width="33.33%" valign="top" align="center">
      <h3>画布上下文</h3>
      <p>不再需要描述“最右边的几个xxx”，直接鼠标框选，自动解析元素为上下文**</p>
      <img src="https://github.com/user-attachments/assets/07ec5631-21bc-4a11-853a-62058061c49f" alt="上下文" width="100%" />
      <br />
      <br />
    </td>
  </tr>
</table>
</div>
<sub>* 目前支持Openai/Deepseek/Anthropic/Gemini格式</sub>
<br />
<sub>** 受限于Web API限制，鼠标选中感知功能在Web端不可用。但是Web端依然有基础的压缩画布内容上下文注入功能</sub>
<br />
<br />

以下是一些实际的演示以及其提示词：

<div align="center">
<table width="100%">
  <tr>
    <td width="50%" valign="top" align="center">
      <h3>U-net框架图</h3>
      <p>绘制一个unet网络</p>
      <img src="https://github.com/user-attachments/assets/5fae95e9-573c-4ced-8841-7b27dd8cc97b" alt="unet" width="100%" />
      <br />
      <sub>使用glm-4.6绘制</sub>
      <br />
    </td>
    <td width="50%" valign="top" align="center">
      <h3>图转drawio</h3>
      <p>传入使用gemini-3-pro-image生成的图片，要求其复刻</p>
      <img src="https://github.com/user-attachments/assets/1b5be219-0dc6-48c8-abdc-f0a2946bf148" alt="image" width="100%" />
      <br />
      <sub>使用claude-sonnet-4.5绘制，目前图片对话支持仍处于beta阶段</sub>
    </td>
  </tr>
    <tr>
    <td width="50%" valign="top" align="center">
      <h3>UML框架图</h3>
      <p>绘制一个经典的前后端的WEB应用UML框架图</p>
      <img src="https://github.com/user-attachments/assets/2c15fd37-4f8f-4a65-9ade-52176ae487e1" alt="UML" width="100%" />
      <br />
      <sub>使用glm-4.6绘制</sub>
      <br />
    </td>
    <td width="50%" valign="top" align="center">
      <h3>纯元素绘制</h3>
      <p>画一个笔记本电脑</p>
      <img src="https://github.com/user-attachments/assets/719e33e3-b7bc-4e0c-bae1-28896b63e23d" alt="演示" width="80%" />
      <br />
      <sub>使用claude-sonnet-4.5绘制</sub>
      <br />
    </td>
  </tr>
</table>
</div>

## 快速开始

### 使用Electron APP

前往[Releases](https://github.com/Menghuan1918/drawio2go/releases)下载安装最新版本

### 部署为网页

环境需要：

- Node.js 22.x 或更高版本
- npm

随后运行以下命令

```bash
# 克隆仓库
git clone https://github.com/your-username/drawio2go.git
cd drawio2go

# 安装依赖
npm install
```

**网页版（浏览器）：**

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)

> [!IMPORTANT]
> 请注意，目前没有在WEB端做任何的鉴权措施，请勿将其部署到公网中(LLM密钥是存储在浏览器端的，但是drawio工具回调没有做鉴权，其他人有可能能够获取drawio工具调用信息)

## 已知问题

- [ ] WEB端中，对话可能会无法取消
- [ ] 目前一些drawio工具的具体错误无法被捕获
- [ ] 对话保存目前有一些问题，可能会导致历史对话加载异常

## 即将推出的新特征

- [ ] Electron中支持将画布中选中的元素传递给AI
- [ ] 完全的图形/文件对话支持
- [ ] 支持自定义drawio控件URL
- [ ] 直接导出为png/svg
- [ ] 增加更多LLM API支持
- [ ] 支持将项目导出为文件

## 项目结构

```
drawio2go/
├── app/                    # Next.js App Router
│   ├── components/         # React 组件
│   │   ├── chat/          # AI 聊天模块
│   │   ├── settings/      # 设置面板
│   │   ├── version/       # 版本管理
│   │   └── toast/         # 通知组件
│   ├── lib/               # 工具库与服务
│   │   └── storage/       # 统一存储层
│   ├── hooks/             # React Hooks
│   ├── i18n/              # 国际化配置
│   ├── api/               # API 路由
│   └── styles/            # 样式模块
├── electron/              # Electron 主进程
└── server.js              # Next.js 自定义 HTTP 服务器
```

## 开发指南

### 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 运行 ESLint + TypeScript 检查 + 复杂度检查
npm run test         # 运行测试
npm run format       # 使用 Prettier 格式化代码
```

### 生产构建

```bash
# 构建 Next.js 应用
npm run build

# 构建 Electron 安装包（输出到 dist/ 目录）
npm run electron:build
```

## 参与贡献

欢迎提交 PR！请在提交前阅读贡献指南。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 协议

本项目基于 MIT 协议开源

## 感谢

- [next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io) - 灵感来源，优秀的drawio AI生成实现
- [DrawIO](https://www.drawio.com/) - 图表编辑引擎
- [HeroUI](https://heroui.com/) - UI 组件库
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI 集成框架
