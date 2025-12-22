# 历史记录 SVG 预览图功能

## 功能概述

在历史记录列表中显示每个对话的 SVG 预览图。预览图通过对话快照系统自动生成，每次 AI 响应完成后保存当前图纸的第一页 SVG。

### 核心特性

- **自动快照**：AI 响应完成后自动保存对话快照
- **覆盖式保存**：每个对话 ID 仅对应一个快照（新快照覆盖旧快照）
- **智能回退**：对话快照不可用时，回退显示关联的 xml_version_id 预览图
- **可选功能**：用户可在设置中禁用对话快照（默认开启）
- **节省空间**：仅保存第一页 SVG，使用 deflate-raw 压缩（约 50-200KB/对话）

## 用户需求

- 缩略图在卡片左侧展示（类似文件管理器风格）
- 没有快照的对话显示占位图标
- 删除对话时同步删除快照

## 技术原理

```
Conversation → conversation_id → XMLVersion(conversation_id).preview_svg
                                           ↓（回退）
                                  Message.xml_version_id → XMLVersion.preview_svg
```

### 对话快照存储

- **表结构**：复用 `XMLVersion` 表，通过 `conversation_id` 字段标识对话快照
- **版本号**：使用对话 ID 作为 `semantic_version`，保证唯一性
- **存储内容**：
  - `preview_svg`: 第一页 SVG（deflate-raw 压缩）
  - `is_keyframe`: true（快照总是关键帧）
  - `xml_content`: 空字符串（快照不需要完整 XML）
- **过滤逻辑**：版本管理界面自动过滤掉对话快照（`conversation_id IS NOT NULL`）

### 快照生成时机

在 `ChatSidebar.tsx` 的 `onFinish` 回调中，最终化会话（`finalizing` 状态）时：

1. 检查设置项 `settings.version.conversationSnapshot`（默认 true）
2. 从 drawio 编辑器导出第一页 SVG
3. 使用 deflate-raw 压缩
4. 调用 `storage.upsertConversationSnapshot()` 保存（覆盖式）

### 快照显示逻辑

1. 优先尝试加载对话快照（`conversation_id` 匹配）
2. 如果快照不存在或无 `preview_svg`，回退到消息关联的 `xml_version_id`
3. 都不可用时显示占位图标

## 里程碑列表

| 里程碑 | 文件                          | 说明                 |
| ------ | ----------------------------- | -------------------- |
| M0     | `m0-database-and-settings.md` | 数据库扩展和设置系统 |
| M1     | `m1-snapshot-hook.md`         | 对话快照加载 Hook    |
| M2     | `m2-thumbnail-component.md`   | 缩略图展示组件       |
| M3     | `m3-list-integration.md`      | 集成到历史记录列表   |
| M4     | `m4-styles.md`                | 样式完善             |
| M5     | `m5-i18n.md`                  | 国际化支持           |
| M6     | `m6-snapshot-generation.md`   | 快照生成和级联删除   |

## 依赖的现有 API

- `useStorageSettings()` - 获取/保存版本设置
- `getStorage()` - 获取存储实例
- `storage.getConversationSnapshot()` - 获取对话快照
- `storage.getXMLVersionSVGData()` - 获取版本 SVG 数据（回退）
- `decompressSVG()` from `compression-utils`
- `exportFirstPageSVG()` - 导出第一页 SVG（需实现）
- `compressSVG()` - 压缩 SVG（需实现）

## 新增存储 API

- `getConversationSnapshot(conversationId, projectUuid)` - 获取对话快照
- `upsertConversationSnapshot(conversationId, projectUuid, previewSvg)` - 创建/更新快照
- `deleteConversationSnapshots(conversationIds)` - 批量删除快照

## 设置项

**键名**：`settings.version.conversationSnapshot`

**默认值**：`true`

**说明**：启用后，每次 AI 响应完成会自动保存对话快照。禁用后仅停止创建新快照，已有快照保留。

## 数据库变更

### 新增字段

`xml_versions` 表添加字段：

- `conversation_id` TEXT NULL - 对话 ID（对话快照专用）

### 新增索引

- `idx_xml_versions_conversation_id` - conversation_id 索引

### 迁移版本

- IndexedDB: v1 → v2
- SQLite: v1 → v2
