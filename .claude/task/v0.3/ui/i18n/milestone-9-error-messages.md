# M9: 错误消息国际化

## 目标

将项目中所有错误消息、验证消息和异常提示国际化，确保用户在不同语言环境下都能看到清晰的错误提示。

## 预估时间

1-2 小时

## 前置依赖

- M1: 基础设施搭建完成
- M3-M8: 组件改造完成（部分验证消息已在组件中创建）

## 任务清单

### 9.1 存储层错误国际化

**文件**: `app/lib/storage/page-metadata-validators.ts`

**任务**: 修改验证函数，使用 i18n 错误消息

**改造前**:

```typescript
export function ensurePageCount(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < 1) {
    throw new Error("page_count 必须是大于等于 1 的数字");
  }
  return Math.floor(value);
}
```

**改造后**:

```typescript
import i18n from "@/app/i18n/client";

export function ensurePageCount(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < 1) {
    throw new Error(i18n.t("errors:storage.invalidPageCount"));
  }
  return Math.floor(value);
}
```

**改造函数列表**:

- `ensurePageCount()`
- `parsePageNamesJson()`
- `ensureValidSVG()`（如存在）
- 其他验证函数

**翻译键值** (`errors.json`):

```json
{
  "storage": {
    "invalidPageCount": "page_count must be a number >= 1",
    "invalidPageNames": "page_names must be a JSON array string",
    "pageNameNotString": "page_names[{{index}}] is not a string",
    "svgTooLarge": "{{label}} exceeds maximum size ({{size}} MB > {{max}} MB)",
    "invalidSVG": "Invalid SVG data"
  }
}
```

### 9.2 API 路由错误国际化

**文件**: `app/api/chat/route.ts`

**任务**: 修改 API 错误响应，使用 i18n

**改造前**:

```typescript
export async function POST(req: NextRequest) {
  try {
    const { messages, llmConfig } = await req.json();

    if (!messages || !llmConfig) {
      return NextResponse.json(
        { error: "缺少必要参数：messages 或 llmConfig" },
        { status: 400 },
      );
    }
    // ...
  } catch (error) {
    return NextResponse.json({ error: "无法发送请求" }, { status: 500 });
  }
}
```

**改造后**:

```typescript
import i18n from "@/app/i18n/client";

export async function POST(req: NextRequest) {
  try {
    const { messages, llmConfig } = await req.json();

    if (!messages || !llmConfig) {
      return NextResponse.json(
        { error: i18n.t("errors:chat.missingParams") },
        { status: 400 },
      );
    }
    // ...
  } catch (error) {
    return NextResponse.json(
      { error: i18n.t("errors:chat.sendFailed") },
      { status: 500 },
    );
  }
}
```

**翻译键值** (`errors.json`):

```json
{
  "chat": {
    "missingParams": "Missing required parameters: messages or llmConfig",
    "invalidConfig": "Invalid LLM configuration",
    "sendFailed": "Failed to send request",
    "streamError": "Error during streaming",
    "timeoutError": "Request timeout"
  }
}
```

### 9.3 版本管理错误国际化

**文件**:

- `app/lib/storage/xml-version-engine.ts`
- `app/components/version/*.tsx`

**任务**: 修改版本相关错误消息

**翻译键值** (`errors.json`):

```json
{
  "version": {
    "restoreFailed": "Failed to restore version: {{message}}",
    "exportFailed": "Export failed: {{message}}",
    "parentNotFound": "Parent version {{parent}} not found, please create the main version first",
    "invalidVersionNumber": "Invalid version number format",
    "versionExists": "Version {{version}} already exists",
    "deleteWipFailed": "Cannot delete WIP version",
    "noDiffData": "No diff data available"
  }
}
```

### 9.4 表单验证消息国际化

**涉及组件**:

- `app/components/ProjectSelector.tsx`
- `app/components/version/CreateVersionDialog.tsx`
- `app/components/settings/LLMSettingsPanel.tsx`

**翻译键值** (`validation.json`):

```json
{
  "project": {
    "nameRequired": "Project name is required",
    "nameMinLength": "Project name must be at least {{min}} characters",
    "nameMaxLength": "Project name cannot exceed {{max}} characters",
    "descriptionMaxLength": "Description cannot exceed {{max}} characters"
  },
  "version": {
    "numberRequired": "Version number is required",
    "formatInvalid": "Invalid version format, should be x.y.z or x.y.z.h",
    "reservedVersion": "0.0.0 is a reserved version number",
    "subVersionInvalid": "Sub-version must be a valid integer",
    "subVersionRange": "Sub-version must be between {{min}} and {{max}}",
    "descriptionMaxLength": "Description cannot exceed {{max}} characters"
  },
  "llm": {
    "apiKeyRequired": "API Key is required",
    "baseUrlInvalid": "Invalid Base URL format",
    "modelRequired": "Model name is required",
    "temperatureRange": "Temperature must be between {{min}} and {{max}}"
  }
}
```

### 9.5 Hook 错误国际化

**文件**:

- `app/hooks/useStorageXMLVersions.ts`
- `app/hooks/useStorageProjects.ts`
- `app/hooks/useStorageConversations.ts`

**任务**: 修改 Hook 中的错误处理

**改造示例**:

```typescript
import i18n from '@/app/i18n/client';

export function useStorageXMLVersions(projectUuid: string | null) {
  // ...

  const restoreVersion = async (versionNumber: string) => {
    try {
      // ...
    } catch (error) {
      console.error(i18n.t('errors:version.restoreFailed', {
        message: (error as Error).message
      }));
      throw error;
    }
  };

  return { restoreVersion, ... };
}
```

### 9.6 通用错误处理

**创建错误处理工具** (可选):

**文件**: `app/lib/error-handler.ts`

```typescript
import i18n from "@/app/i18n/client";

export class AppError extends Error {
  constructor(
    public i18nKey: string,
    public params?: Record<string, any>,
  ) {
    super(i18n.t(i18nKey, params));
    this.name = "AppError";
  }
}

export function handleError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return i18n.t("errors:common.unknownError");
}
```

**使用示例**:

```typescript
import { AppError, handleError } from "@/app/lib/error-handler";

try {
  throw new AppError("errors:version.parentNotFound", { parent: "1.0.0" });
} catch (error) {
  const errorMessage = handleError(error);
  console.error(errorMessage);
}
```

## 翻译资源完整示例

**`locales/en-US/errors.json`**:

```json
{
  "common": {
    "unknownError": "An unknown error occurred",
    "networkError": "Network connection failed",
    "permissionDenied": "Permission denied"
  },
  "storage": {
    "invalidPageCount": "page_count must be a number >= 1",
    "invalidPageNames": "page_names must be a JSON array string",
    "pageNameNotString": "page_names[{{index}}] is not a string",
    "svgTooLarge": "{{label}} exceeds maximum size ({{size}} MB > {{max}} MB)"
  },
  "chat": {
    "missingParams": "Missing required parameters: messages or llmConfig",
    "invalidConfig": "Invalid LLM configuration",
    "sendFailed": "Failed to send request"
  },
  "version": {
    "restoreFailed": "Failed to restore version: {{message}}",
    "exportFailed": "Export failed: {{message}}",
    "parentNotFound": "Parent version {{parent}} not found"
  }
}
```

**`locales/zh-CN/errors.json`**:

```json
{
  "common": {
    "unknownError": "发生未知错误",
    "networkError": "网络连接失败",
    "permissionDenied": "权限不足"
  },
  "storage": {
    "invalidPageCount": "page_count 必须是大于等于 1 的数字",
    "invalidPageNames": "page_names 必须是 JSON 数组字符串",
    "pageNameNotString": "page_names[{{index}}] 不是字符串",
    "svgTooLarge": "{{label}} 超出最大限制 ({{size}} MB > {{max}} MB)"
  },
  "chat": {
    "missingParams": "缺少必要参数：messages 或 llmConfig",
    "invalidConfig": "LLM 配置无效",
    "sendFailed": "无法发送请求"
  },
  "version": {
    "restoreFailed": "恢复版本失败: {{message}}",
    "exportFailed": "导出失败: {{message}}",
    "parentNotFound": "父版本 {{parent}} 不存在"
  }
}
```

## 验收标准

- [ ] 存储层验证函数错误消息国际化
- [ ] API 路由错误响应国际化
- [ ] 版本管理错误消息国际化
- [ ] 表单验证消息国际化
- [ ] Hook 错误处理国际化
- [ ] `errors.json` 和 `validation.json` 翻译完整
- [ ] 切换语言后触发错误，消息以正确语言显示
- [ ] 插值变量正确替换（如 `{{message}}`、`{{version}}`）
- [ ] 运行 `pnpm run lint` 无错误

## 测试场景

**场景 1: 存储层验证错误**

- 尝试创建无效的版本数据
- 切换到英语，查看错误消息为英文
- 切换到中文，查看错误消息为中文

**场景 2: 表单验证错误**

- 在创建版本对话框中输入无效数据
- 验证错误消息根据语言显示

**场景 3: API 错误**

- 发送聊天请求时缺少参数
- 验证错误响应根据语言返回

## 注意事项

### 1. 服务端错误处理

API 路由和服务端代码无法使用 `useTranslation` Hook，必须直接导入 i18n 实例：

```typescript
import i18n from "@/app/i18n/client";
const message = i18n.t("errors:chat.sendFailed");
```

### 2. 错误边界

如果使用 React Error Boundary，确保错误消息也国际化。

### 3. 插值变量一致性

确保中英文翻译中使用相同的插值变量名：

```json
// 正确
{ "message": "文件 {{fileName}} 已保存" }
{ "message": "File {{fileName}} has been saved" }

// 错误（变量名不一致）
{ "message": "文件 {{fileName}} 已保存" }
{ "message": "File {{file}} has been saved" }
```

### 4. 降级处理

如果翻译键值不存在，i18next 会返回键名本身。确保所有错误键值都已定义。

## 下一步

完成后继续 [M10: 测试验证](./milestone-10-testing.md)
