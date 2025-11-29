# M8: 聊天模块国际化

## 目标

完成聊天模块所有组件的国际化改造，这是最复杂的模块，包含约 100 条翻译、17 个组件文件，涉及消息显示、工具调用、会话管理、时间格式化等。

## 预估时间

3-4 小时

## 前置依赖

- M1: 基础设施搭建完成
- M2: 语言切换器可用
- M3-M7: 其他组件完成

## 任务清单

### 8.1 提取中文文本

**主文件**: `app/components/ChatSidebar.tsx`

**子组件目录**: `app/components/chat/`（17 个文件）

**需要提取的文本** (~100 条):

- **ChatSidebar**: 主标题、空状态
- **MessageList**: 加载提示、空状态、错误消息
- **MessageItem**: 角色标签（用户、助手、系统）、时间戳
- **ToolCallDisplay**: 工具名称、状态文本、参数标签
- **MessageInput**: 占位符、按钮文本、快捷键提示
- **ConversationList**: 标题、空状态、操作按钮（重命名、删除）
- **ChatHistoryView**: 历史记录标题、筛选选项、排序选项
- **其他子组件**: 各自的文本内容

### 8.2 创建翻译资源

**更新文件**:

- `locales/zh-CN/chat.json`
- `locales/en-US/chat.json`
- `locales/zh-CN/common.json`（相对时间部分）
- `locales/en-US/common.json`

**翻译结构示例**:

```json
{
  "sidebar": {
    "title": "聊天助手",
    "newChat": "新建对话",
    "emptyState": {
      "title": "开始新对话",
      "description": "选择一个项目并开始与 AI 助手对话",
      "action": "新建对话"
    }
  },
  "messages": {
    "loading": "正在加载消息...",
    "sending": "正在发送...",
    "emptyConversation": "暂无消息，开始对话吧",
    "loadMore": "加载更多",
    "roles": {
      "user": "用户",
      "assistant": "助手",
      "system": "系统"
    },
    "status": {
      "sending": "发送中",
      "sent": "已发送",
      "failed": "发送失败",
      "retrying": "重试中"
    },
    "actions": {
      "copy": "复制",
      "copied": "已复制",
      "retry": "重试",
      "delete": "删除"
    }
  },
  "input": {
    "placeholder": "输入消息...",
    "placeholderWithProject": "向 {{project}} 提问...",
    "send": "发送",
    "stop": "停止",
    "shortcuts": {
      "send": "Enter 发送",
      "newLine": "Shift+Enter 换行"
    },
    "attachFile": "附加文件",
    "characterCount": "{{current}} / {{max}} 字符"
  },
  "toolCalls": {
    "title": "工具调用",
    "status": {
      "pending": "等待中",
      "running": "执行中",
      "completed": "已完成",
      "failed": "失败"
    },
    "tools": {
      "searchDiagram": "搜索图表",
      "modifyDiagram": "修改图表",
      "createShape": "创建形状",
      "analyzeDiagram": "分析图表"
    },
    "parameters": "参数",
    "result": "结果",
    "error": "错误",
    "duration": "耗时 {{seconds}} 秒"
  },
  "conversations": {
    "title": "会话列表",
    "current": "当前会话",
    "archived": "已归档",
    "emptyState": {
      "title": "暂无会话",
      "description": "创建一个新会话开始对话"
    },
    "actions": {
      "rename": "重命名",
      "archive": "归档",
      "delete": "删除",
      "restore": "恢复"
    },
    "confirmDelete": "确定要删除此会话吗？",
    "defaultName": "新会话 {{number}}",
    "messageCount": "{{count}} 条消息"
  },
  "history": {
    "title": "历史记录",
    "filter": {
      "label": "筛选",
      "all": "全部",
      "today": "今天",
      "yesterday": "昨天",
      "thisWeek": "本周",
      "thisMonth": "本月"
    },
    "sort": {
      "label": "排序",
      "newest": "最新优先",
      "oldest": "最早优先",
      "mostMessages": "消息最多"
    },
    "search": {
      "placeholder": "搜索会话...",
      "noResults": "未找到匹配的会话"
    }
  },
  "errors": {
    "loadFailed": "加载消息失败",
    "sendFailed": "发送消息失败",
    "networkError": "网络错误，请检查连接",
    "timeout": "请求超时",
    "invalidMessage": "消息格式无效",
    "retryLimit": "已达到重试次数上限"
  }
}
```

**`common.json` 相对时间部分**:

```json
{
  "time": {
    "justNow": "刚刚",
    "minutesAgo": "{{count}} 分钟前",
    "hoursAgo": "{{count}} 小时前",
    "daysAgo": "{{count}} 天前",
    "weeksAgo": "{{count}} 周前"
  }
}
```

### 8.3 改造 ChatSidebar

**文件**: `app/components/ChatSidebar.tsx`

**改造要点**:

```tsx
import { useTranslation } from "@/app/i18n/hooks";

export default function ChatSidebar() {
  const { t } = useTranslation("chat");

  return (
    <div>
      <h2>{t("sidebar.title")}</h2>
      <Button onPress={handleNewChat}>{t("sidebar.newChat")}</Button>
      {/* ... */}
    </div>
  );
}
```

### 8.4 改造 MessageItem

**文件**: `app/components/chat/MessageItem.tsx`

**改造要点**:

1. 角色标签:

```tsx
const { t } = useTranslation("chat");

const roleLabel = t(`messages.roles.${message.role}`);
```

2. 相对时间显示:

```tsx
import { formatRelativeTime } from "@/app/lib/format-utils";

const timeAgo = formatRelativeTime(message.timestamp, t);
```

3. 操作按钮:

```tsx
<Button onPress={handleCopy} aria-label={t("messages.actions.copy")}>
  {copied ? t("messages.actions.copied") : t("messages.actions.copy")}
</Button>
```

### 8.5 改造 ToolCallDisplay

**文件**: `app/components/chat/ToolCallDisplay.tsx`

**改造要点**:

1. 工具名称映射:

```tsx
const { t } = useTranslation("chat");

// 如果工具名称是动态的，使用映射
const toolNameMap: Record<string, string> = {
  search_diagram: t("toolCalls.tools.searchDiagram"),
  modify_diagram: t("toolCalls.tools.modifyDiagram"),
  create_shape: t("toolCalls.tools.createShape"),
  analyze_diagram: t("toolCalls.tools.analyzeDiagram"),
};

const toolLabel = toolNameMap[toolCall.name] || toolCall.name;
```

2. 状态显示:

```tsx
const statusLabel = t(`toolCalls.status.${toolCall.status}`);

<Badge color={statusColor}>{statusLabel}</Badge>;
```

3. 参数和结果:

```tsx
<div>
  <h5>{t('toolCalls.parameters')}</h5>
  <pre>{JSON.stringify(toolCall.parameters, null, 2)}</pre>
</div>

<div>
  <h5>{t('toolCalls.result')}</h5>
  <p>{toolCall.result}</p>
</div>
```

### 8.6 改造 MessageInput

**文件**: `app/components/chat/MessageInput.tsx`

**改造要点**:

1. 动态占位符:

```tsx
const { t } = useTranslation("chat");

const placeholder = currentProject
  ? t("input.placeholderWithProject", { project: currentProject.name })
  : t("input.placeholder");
```

2. 按钮和快捷键提示:

```tsx
<TextArea
  placeholder={placeholder}
  description={t('input.shortcuts.send')}
/>

<Button onPress={handleSend}>
  {isSending ? t('input.stop') : t('input.send')}
</Button>
```

3. 字符计数:

```tsx
<Description>
  {t("input.characterCount", { current: text.length, max: MAX_LENGTH })}
</Description>
```

### 8.7 改造 ConversationList

**文件**: `app/components/chat/ConversationList.tsx`

**改造要点**:

1. 会话名称和消息数:

```tsx
<h4>{conversation.name || t('conversations.defaultName', { number: index + 1 })}</h4>
<p>{t('conversations.messageCount', { count: conversation.messages.length })}</p>
```

2. 操作按钮:

```tsx
<DropdownMenu>
  <DropdownMenuItem onPress={handleRename}>
    {t("conversations.actions.rename")}
  </DropdownMenuItem>
  <DropdownMenuItem onPress={handleArchive}>
    {t("conversations.actions.archive")}
  </DropdownMenuItem>
  <DropdownMenuItem onPress={handleDelete} destructive>
    {t("conversations.actions.delete")}
  </DropdownMenuItem>
</DropdownMenu>
```

3. 确认删除:

```tsx
const handleDelete = () => {
  if (confirm(t("conversations.confirmDelete"))) {
    deleteConversation(conversation.id);
  }
};
```

### 8.8 改造 ChatHistoryView

**文件**: `app/components/chat/ChatHistoryView.tsx`

**改造要点**:

1. 筛选器:

```tsx
<Select
  label={t("history.filter.label")}
  selectedKey={filter}
  onSelectionChange={setFilter}
>
  <SelectItem key="all">{t("history.filter.all")}</SelectItem>
  <SelectItem key="today">{t("history.filter.today")}</SelectItem>
  <SelectItem key="yesterday">{t("history.filter.yesterday")}</SelectItem>
  <SelectItem key="thisWeek">{t("history.filter.thisWeek")}</SelectItem>
  <SelectItem key="thisMonth">{t("history.filter.thisMonth")}</SelectItem>
</Select>
```

2. 排序:

```tsx
<Select
  label={t("history.sort.label")}
  selectedKey={sortBy}
  onSelectionChange={setSortBy}
>
  <SelectItem key="newest">{t("history.sort.newest")}</SelectItem>
  <SelectItem key="oldest">{t("history.sort.oldest")}</SelectItem>
  <SelectItem key="mostMessages">{t("history.sort.mostMessages")}</SelectItem>
</Select>
```

3. 搜索:

```tsx
<Input
  placeholder={t("history.search.placeholder")}
  value={searchQuery}
  onChange={setSearchQuery}
/>;
{
  filteredResults.length === 0 && <p>{t("history.search.noResults")}</p>;
}
```

### 8.9 修改格式化工具

**文件**: `app/lib/format-utils.ts`

**添加相对时间格式化**:

```typescript
import i18n from "@/app/i18n/client";

/**
 * 格式化相对时间
 * @param timestamp - Unix 时间戳（毫秒）
 * @param t - i18n 翻译函数
 */
export function formatRelativeTime(
  timestamp: number,
  t: (key: string, options?: any) => string,
): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (diff < 60000) return t("common:time.justNow");
  if (minutes < 60) return t("common:time.minutesAgo", { count: minutes });
  if (hours < 24) return t("common:time.hoursAgo", { count: hours });
  if (days < 7) return t("common:time.daysAgo", { count: days });
  if (weeks < 4) return t("common:time.weeksAgo", { count: weeks });

  // 超过 4 周，显示完整日期
  return formatConversationDate(timestamp, "date");
}

/**
 * 格式化会话日期
 */
export function formatConversationDate(
  timestamp: number,
  mode: "date" | "time" = "date",
  locale?: string,
): string {
  const formatLocale = locale || getCurrentLocale();
  const options: Intl.DateTimeFormatOptions =
    mode === "date"
      ? { year: "numeric", month: "2-digit", day: "2-digit" }
      : { hour: "2-digit", minute: "2-digit" };

  return new Date(timestamp).toLocaleString(formatLocale, options);
}
```

### 8.10 验证功能

**测试场景**:

1. 打开聊天侧边栏
2. 切换到英语
3. 验证：
   - [ ] 标题、按钮文本显示为英文
   - [ ] 消息列表角色标签为英文
   - [ ] 相对时间显示为英文（"2 hours ago"）
   - [ ] 工具调用状态为英文
   - [ ] 输入框占位符为英文
4. 发送消息
5. 验证：
   - [ ] 发送状态提示为英文
   - [ ] 工具调用显示为英文
6. 切换到中文
7. 验证：
   - [ ] 所有文本立即更新为中文
   - [ ] 相对时间更新为中文（"2 小时前"）
8. 测试会话管理
9. 验证：
   - [ ] 会话列表操作文本正确
   - [ ] 确认对话框消息正确
10. 测试历史记录
11. 验证：
    - [ ] 筛选、排序选项正确显示

## 翻译资源完整示例

详见上述 8.2 节的完整 JSON 示例。

英文版本对应翻译（部分）：

```json
{
  "messages": {
    "roles": {
      "user": "User",
      "assistant": "Assistant",
      "system": "System"
    },
    "emptyConversation": "No messages yet, start a conversation"
  },
  "toolCalls": {
    "status": {
      "pending": "Pending",
      "running": "Running",
      "completed": "Completed",
      "failed": "Failed"
    }
  },
  "input": {
    "placeholder": "Type a message...",
    "placeholderWithProject": "Ask about {{project}}..."
  }
}
```

**`locales/en-US/common.json` 相对时间**:

```json
{
  "time": {
    "justNow": "Just now",
    "minutesAgo_one": "{{count}} minute ago",
    "minutesAgo_other": "{{count}} minutes ago",
    "hoursAgo_one": "{{count}} hour ago",
    "hoursAgo_other": "{{count}} hours ago",
    "daysAgo_one": "{{count}} day ago",
    "daysAgo_other": "{{count}} days ago",
    "weeksAgo_one": "{{count}} week ago",
    "weeksAgo_other": "{{count}} weeks ago"
  }
}
```

## 验收标准

- [ ] `ChatSidebar.tsx` 完全国际化
- [ ] `MessageList.tsx` 完全国际化
- [ ] `MessageItem.tsx` 完全国际化（含相对时间）
- [ ] `ToolCallDisplay.tsx` 完全国际化
- [ ] `MessageInput.tsx` 完全国际化
- [ ] `ConversationList.tsx` 完全国际化
- [ ] `ChatHistoryView.tsx` 完全国际化
- [ ] 所有 chat/\* 子组件完全国际化
- [ ] `chat.json` 翻译文件完整（zh-CN + en-US）
- [ ] `common.json` 包含相对时间翻译
- [ ] `format-utils.ts` 包含 `formatRelativeTime` 函数
- [ ] 相对时间根据语言正确显示
- [ ] 工具调用状态根据语言显示
- [ ] 切换语言后所有文本和时间立即更新
- [ ] 运行 `grep -rn "[\u4e00-\u9fa5]" app/components/chat --include="*.tsx"` 无硬编码中文
- [ ] 运行 `grep -rn "[\u4e00-\u9fa5]" app/components/ChatSidebar.tsx` 无硬编码中文
- [ ] 运行 `pnpm run lint` 无错误

## 注意事项

1. **相对时间实时更新**: 考虑使用定时器定期更新相对时间显示
2. **工具名称动态性**: 如果工具名称来自后端，确保有回退显示
3. **消息长度**: 不同语言的文本长度差异可能影响 UI 布局，测试时注意
4. **复数形式**: 英文的复数形式（"1 message" vs "2 messages"）需要特殊处理
5. **流式响应**: 确保流式响应过程中的状态文本也国际化

## 下一步

完成后继续 [M9: 错误消息国际化](./milestone-9-error-messages.md)
