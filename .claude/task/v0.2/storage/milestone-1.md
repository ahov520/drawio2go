# 里程碑 1：依赖安装与构建配置

**状态**：✅ 已完成
**预计耗时**：45 分钟
**依赖**：无

## 目标
安装存储层所需的依赖包，并配置 Electron 构建以支持 better-sqlite3 原生模块

## 任务清单

### 1. 安装核心依赖
- [x] 安装 `better-sqlite3`（SQLite 数据库）
  ```bash
  pnpm add better-sqlite3
  ```
- [x] 安装 `idb`（IndexedDB 封装库）
  ```bash
  pnpm add idb
  ```
- [x] 安装类型定义
  ```bash
  pnpm add -D @types/better-sqlite3
  ```

### 2. 配置 Electron 构建
- [x] 更新 `package.json` 的 `build` 配置：
  ```json
  {
    "build": {
      "appId": "com.drawio2go.app",
      "productName": "DrawIO2Go",
      "files": [
        "out/**/*",
        "electron/**/*",
        "node_modules/**/*",
        "package.json"
      ],
      "extraFiles": [
        {
          "from": "node_modules/better-sqlite3/build/Release",
          "to": "."
        }
      ],
      "directories": {
        "buildResources": "assets",
        "output": "dist"
      },
      "mac": {
        "target": ["dmg", "zip"],
        "category": "public.app-category.productivity"
      },
      "win": {
        "target": ["nsis", "portable"]
      },
      "linux": {
        "target": ["AppImage", "deb"],
        "category": "Office"
      }
    }
  }
  ```

### 3. 配置原生模块重建
- [x] 安装 `electron-rebuild`（如果尚未安装）
  ```bash
  pnpm add -D @electron/rebuild
  ```
- [x] 添加重建脚本到 `package.json`：
  ```json
  {
    "scripts": {
      "rebuild": "electron-rebuild -f -w better-sqlite3",
      "postinstall": "electron-rebuild -f -w better-sqlite3"
    }
  }
  ```

### 4. 验证安装
- [x] 运行重建命令：
  ```bash
  pnpm run rebuild
  ```
- [x] 检查 `node_modules/better-sqlite3/build/Release` 是否存在编译产物
- [x] 创建测试文件验证 better-sqlite3 可用：
  ```typescript
  // test-sqlite-electron.js (需要在 Electron 环境中测试)
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  console.log('✅ SQLite 初始化成功');
  db.close();
  ```
- [x] 运行测试：
  ```bash
  electron test-sqlite-electron.js
  ```

### 5. 配置 TypeScript
- [x] 更新 `tsconfig.json` 以支持新的存储模块：
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@/lib/storage/*": ["./app/lib/storage/*"]
      }
    }
  }
  ```

### 6. 创建存储目录结构
- [x] 创建存储层目录：
  ```bash
  mkdir -p app/lib/storage
  ```
- [x] 创建占位文件：
  ```bash
  touch app/lib/storage/types.ts
  touch app/lib/storage/sqlite-adapter.ts
  touch app/lib/storage/indexeddb-adapter.ts
  touch app/lib/storage/index.ts
  ```

## 验收标准
- [x] `better-sqlite3` 和 `idb` 成功安装
- [x] `electron-rebuild` 成功编译原生模块
- [x] 测试脚本能够成功初始化 SQLite 数据库
- [x] 存储层目录结构创建完成
- [x] TypeScript 路径别名配置正确

## 测试步骤
1. 运行 `pnpm install` 确保所有依赖安装
2. 运行 `pnpm run rebuild` 重建原生模块
3. 运行测试脚本验证 SQLite 可用
4. 检查 `app/lib/storage` 目录是否创建
5. 尝试导入 `@/lib/storage/types` 验证路径别名

## 常见问题

### 问题 1：better-sqlite3 编译失败
**原因**：缺少 C++ 编译工具链
**解决方案**：
- **Windows**：安装 `windows-build-tools`
  ```bash
  npm install --global windows-build-tools
  ```
- **macOS**：安装 Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```
- **Linux**：安装 `build-essential`
  ```bash
  sudo apt-get install build-essential
  ```

### 问题 2：Electron 运行时找不到原生模块
**原因**：原生模块未针对 Electron 重建
**解决方案**：
```bash
pnpm run rebuild
```

### 问题 3：不同平台构建失败
**原因**：原生模块需要在目标平台编译
**解决方案**：
- 使用 CI/CD 在各平台分别构建
- 或使用 Docker 容器进行跨平台构建

## 注意事项
- better-sqlite3 是原生模块，需要 C++ 编译环境，某些版本有预编译
- 每次更新 Electron 版本后需要重新运行 `electron-rebuild`
- 开发环境和生产环境都需要正确配置原生模块路径
- idb 是纯 JavaScript 库，无需编译


---

**下一步**：完成后继续 [里程碑 2：存储抽象层设计](./milestone-2.md)
