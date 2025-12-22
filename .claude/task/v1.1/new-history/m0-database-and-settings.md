# M0: 数据库扩展和设置系统

## 目标

扩展数据库以支持对话快照存储，并添加用户设置项。

## 任务清单

### 1. 类型定义扩展

**文件**：`/app/lib/storage/types.ts`

在 `XMLVersion` 接口添加字段：

```typescript
export interface XMLVersion {
  // ... 现有字段
  conversation_id?: string | null;  // 对话 ID（对话快照专用）
}
```

### 2. 数据库迁移 - IndexedDB

**新建文件**：`/app/lib/storage/migrations/indexeddb/v2.ts`

- 为 `xml_versions` 的 `conversation_id` 字段创建索引
- 索引配置：`{ unique: false }`（一个对话一个快照）

**修改文件**：`/app/lib/storage/migrations/indexeddb/index.ts`

- 更新 `LATEST_INDEXED_DB_VERSION = 2`
- 在 `upgradeIndexedDb()` 中调用 v2 迁移

### 3. 数据库迁移 - SQLite

**文件**：`/electron/storage/sqlite-migrations.ts`

添加迁移脚本：

```sql
ALTER TABLE xml_versions ADD COLUMN conversation_id TEXT NULL;
CREATE INDEX idx_xml_versions_conversation_id ON xml_versions(conversation_id);
```

### 4. 存储常量更新

**文件**：`/app/lib/storage/constants.ts`

```typescript
export const STORAGE_VERSION = 2; // 从 1 升级到 2
```

### 5. 设置项定义

**文件**：`/app/lib/config-utils.ts`

```typescript
export const STORAGE_KEY_CONVERSATION_SNAPSHOT = "settings.version.conversationSnapshot"

export interface VersionSettings {
  autoVersionOnAIEdit: boolean
  conversationSnapshot: boolean  // 新增
}

export const DEFAULT_VERSION_SETTINGS: VersionSettings = {
  autoVersionOnAIEdit: true,
  conversationSnapshot: true  // 默认开启
}
```

### 6. 扩展 useStorageSettings Hook

**文件**：`/app/hooks/useStorageSettings.ts`

添加方法：

```typescript
getVersionSettings(): Promise<VersionSettings>
saveVersionSettings(settings: Partial<VersionSettings>): Promise<void>
```

### 7. 版本设置面板

**文件**：`/app/components/settings/VersionSettingsPanel.tsx`

添加 Switch 控件：

```tsx
<Switch
  isSelected={conversationSnapshot}
  onChange={(isSelected) => onChange({ ...settings, conversationSnapshot: Boolean(isSelected) })}
>
  <Switch.Control><Switch.Thumb /></Switch.Control>
  <Label>{t("version.conversationSnapshot.label")}</Label>
</Switch>
<Description>{t("version.conversationSnapshot.description")}</Description>
```

### 8. 国际化文案

**文件**：`/public/locales/zh-CN/settings.json`

```json
{
  "version": {
    "conversationSnapshot": {
      "label": "保存对话缓存图",
      "description": "为每个对话自动生成预览图快照,用于历史记录列表显示。这将占用少量存储空间(约每个对话 50-200KB)。"
    }
  }
}
```

**文件**：`/public/locales/en-US/settings.json`

```json
{
  "version": {
    "conversationSnapshot": {
      "label": "Save conversation preview images",
      "description": "Automatically generate preview image snapshots for each conversation to display in the history list. This will consume a small amount of storage space (approx. 50-200KB per conversation)."
    }
  }
}
```

### 9. StorageAdapter 接口扩展

**文件**：`/app/lib/storage/adapter.ts`

添加方法签名：

```typescript
/**
 * 获取对话的缓存快照
 */
getConversationSnapshot(conversationId: string, projectUuid: string): Promise<XMLVersion | null>

/**
 * 创建或更新对话缓存快照
 */
upsertConversationSnapshot(conversationId: string, projectUuid: string, previewSvg: Blob | Buffer): Promise<string>

/**
 * 删除对话缓存快照
 */
deleteConversationSnapshots(conversationIds: string[]): Promise<void>
```

### 10. IndexedDB 实现

**文件**：`/app/lib/storage/indexeddb-storage.ts`

实现三个新方法：
- `getConversationSnapshot`：通过 conversation_id 索引查询
- `upsertConversationSnapshot`：检查是否存在，覆盖或新建
- `deleteConversationSnapshots`：批量删除

**修改**：`getXMLVersionsByProject` 过滤 `conversation_id IS NOT NULL` 的记录

### 11. SQLite 实现

**文件**：`/electron/storage/sqlite-storage.ts`

实现与 IndexedDB 对应的三个方法（SQL 版本）。

## 验收标准

- [ ] 数据库迁移成功（v1 → v2）
- [ ] conversation_id 索引创建成功
- [ ] 设置项可保存和读取
- [ ] 版本设置面板显示新开关
- [ ] 存储接口方法实现并测试通过
- [ ] 版本管理界面不显示对话快照
