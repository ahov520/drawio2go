# M7: 版本管理模块国际化

## 目标

完成版本管理模块所有组件的国际化改造，包括版本卡片、时间线、对比视图、创建对话框等，并实现日期时间格式化的国际化。

## 预估时间

2.5-3 小时

## 前置依赖

- M1: 基础设施搭建完成
- M2: 语言切换器可用
- M3-M6: 其他组件完成

## 任务清单

### 7.1 提取中文文本

**涉及文件**:

- `app/components/VersionSidebar.tsx`
- `app/components/version/VersionCard.tsx`
- `app/components/version/VersionTimeline.tsx`
- `app/components/version/VersionCompare.tsx`
- `app/components/version/CreateVersionDialog.tsx`
- `app/components/version/PageSVGViewer.tsx`

**需要提取的文本** (~80 条):

- 版本信息标签：版本号、创建时间、描述等
- 操作按钮：恢复、删除、导出、对比等
- 时间线标签：今天、昨天、本周、更早等
- 对比视图：布局切换、差异统计、页面选择等
- 创建对话框：表单标签、验证消息、按钮等
- 空状态提示

### 7.2 创建翻译资源

**更新文件**:

- `locales/zh-CN/version.json`
- `locales/en-US/version.json`
- `locales/zh-CN/validation.json`（版本验证部分）
- `locales/en-US/validation.json`

**翻译结构示例**:

```json
{
  "sidebar": {
    "title": "版本管理",
    "emptyState": {
      "title": "暂无版本",
      "description": "创建第一个版本快照",
      "action": "创建版本"
    },
    "createButton": "新建版本"
  },
  "card": {
    "version": "版本 {{number}}",
    "createdAt": "创建于",
    "description": "描述",
    "noDescription": "无描述",
    "current": "当前版本",
    "wip": "工作中",
    "buttons": {
      "restore": "恢复",
      "delete": "删除",
      "export": "导出",
      "compare": "对比",
      "details": "详情"
    },
    "actions": {
      "restoring": "正在恢复...",
      "restored": "已恢复到版本 {{number}}",
      "deleting": "正在删除...",
      "deleted": "版本 {{number}} 已删除",
      "exporting": "正在导出...",
      "exported": "已导出为 {{fileName}}"
    },
    "confirmDelete": "确定要删除版本 {{number}} 吗？此操作无法撤销。"
  },
  "timeline": {
    "title": "版本历史",
    "groups": {
      "today": "今天",
      "yesterday": "昨天",
      "thisWeek": "本周",
      "lastWeek": "上周",
      "thisMonth": "本月",
      "older": "更早"
    },
    "total": "共 {{count}} 个版本"
  },
  "compare": {
    "title": "版本对比",
    "selectVersions": "选择要对比的版本",
    "leftVersion": "左侧版本",
    "rightVersion": "右侧版本",
    "layout": {
      "label": "布局",
      "sideBySide": "并排",
      "overlay": "叠加",
      "swipe": "滑动"
    },
    "diff": {
      "title": "差异统计",
      "added": "新增 {{count}} 个元素",
      "removed": "删除 {{count}} 个元素",
      "modified": "修改 {{count}} 个元素",
      "noDiff": "无差异"
    },
    "pages": {
      "label": "页面",
      "all": "全部页面",
      "page": "第 {{number}} 页"
    }
  },
  "createDialog": {
    "title": "创建新版本",
    "description": "为当前项目创建版本快照",
    "form": {
      "versionNumber": {
        "label": "版本号",
        "placeholder": "1.0.0 或 1.0.0.1",
        "description": "语义化版本号（主版本.次版本.修订版本.子版本）",
        "auto": "自动生成",
        "manual": "手动输入"
      },
      "subVersion": {
        "label": "子版本号",
        "description": "在主版本下创建子版本（可选）"
      },
      "description": {
        "label": "版本描述",
        "placeholder": "描述本次版本的更改内容",
        "description": "简要说明此版本的主要变更"
      },
      "createSnapshot": {
        "label": "创建快照",
        "description": "保存当前图纸的完整副本"
      }
    },
    "buttons": {
      "create": "创建",
      "cancel": "取消",
      "creating": "正在创建..."
    },
    "success": "版本 {{version}} 创建成功",
    "error": "创建失败: {{message}}"
  },
  "viewer": {
    "title": "预览",
    "zoom": {
      "in": "放大",
      "out": "缩小",
      "fit": "适应窗口",
      "reset": "重置"
    },
    "pages": {
      "previous": "上一页",
      "next": "下一页",
      "current": "第 {{current}} / {{total}} 页"
    }
  }
}
```

**`validation.json` 版本验证部分**:

```json
{
  "version": {
    "numberRequired": "版本号不能为空",
    "formatInvalid": "版本号格式无效，应为 x.y.z 或 x.y.z.h",
    "reservedVersion": "0.0.0 是保留版本号",
    "subVersionInvalid": "子版本号必须是有效整数",
    "subVersionRange": "子版本号必须在 {{min}} 到 {{max}} 之间",
    "descriptionMaxLength": "描述不能超过 {{max}} 个字符",
    "versionExists": "版本 {{version}} 已存在",
    "parentNotFound": "父版本 {{parent}} 不存在，请先创建主版本"
  }
}
```

### 7.3 改造 VersionCard

**文件**: `app/components/version/VersionCard.tsx`

**改造要点**:

1. 导入 Hook 和格式化工具:

```tsx
import { useTranslation } from "@/app/i18n/hooks";
import { formatVersionTimestamp } from "@/app/lib/format-utils";

export default function VersionCard({ version }) {
  const { t, i18n } = useTranslation("version");
  // ...
}
```

2. 替换版本信息显示:

```tsx
<h4>{t('card.version', { number: version.number })}</h4>
<p>{t('card.createdAt')}: {formatVersionTimestamp(version.timestamp, 'full', i18n.language)}</p>
<p>{version.description || t('card.noDescription')}</p>
```

3. 替换按钮:

```tsx
<Button onPress={handleRestore}>
  {isRestoring ? t("card.actions.restoring") : t("card.buttons.restore")}
</Button>
```

4. 确认对话框:

```tsx
const handleDelete = () => {
  if (confirm(t("card.confirmDelete", { number: version.number }))) {
    deleteVersion(version.id);
  }
};
```

### 7.4 改造 VersionTimeline

**文件**: `app/components/version/VersionTimeline.tsx`

**改造要点**:

1. 时间分组逻辑:

```tsx
const { t } = useTranslation("version");

const getTimeGroup = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const day = 24 * 60 * 60 * 1000;

  if (diff < day) return t("timeline.groups.today");
  if (diff < 2 * day) return t("timeline.groups.yesterday");
  if (diff < 7 * day) return t("timeline.groups.thisWeek");
  if (diff < 14 * day) return t("timeline.groups.lastWeek");
  if (diff < 30 * day) return t("timeline.groups.thisMonth");
  return t("timeline.groups.older");
};
```

2. 总数显示:

```tsx
<p>{t("timeline.total", { count: versions.length })}</p>
```

### 7.5 改造 VersionCompare

**文件**: `app/components/version/VersionCompare.tsx`

**改造要点**:

1. 布局切换:

```tsx
const { t } = useTranslation("version");

<Select
  label={t("compare.layout.label")}
  selectedKey={layout}
  onSelectionChange={setLayout}
>
  <SelectItem key="side-by-side">{t("compare.layout.sideBySide")}</SelectItem>
  <SelectItem key="overlay">{t("compare.layout.overlay")}</SelectItem>
  <SelectItem key="swipe">{t("compare.layout.swipe")}</SelectItem>
</Select>;
```

2. 差异统计:

```tsx
<div>
  <h4>{t("compare.diff.title")}</h4>
  {diff.added > 0 && <p>{t("compare.diff.added", { count: diff.added })}</p>}
  {diff.removed > 0 && (
    <p>{t("compare.diff.removed", { count: diff.removed })}</p>
  )}
  {diff.modified > 0 && (
    <p>{t("compare.diff.modified", { count: diff.modified })}</p>
  )}
  {diff.total === 0 && <p>{t("compare.diff.noDiff")}</p>}
</div>
```

### 7.6 改造 CreateVersionDialog

**文件**: `app/components/version/CreateVersionDialog.tsx`

**改造要点**:

1. 表单标签:

```tsx
const { t } = useTranslation("version");
const { t: tValidation } = useTranslation("validation");

<TextField>
  <Label>{t("createDialog.form.versionNumber.label")}</Label>
  <Input placeholder={t("createDialog.form.versionNumber.placeholder")} />
  <Description>{t("createDialog.form.versionNumber.description")}</Description>
</TextField>;
```

2. 验证消息:

```tsx
const validateVersionNumber = (value: string) => {
  if (!value) {
    return tValidation("version.numberRequired");
  }
  if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(value)) {
    return tValidation("version.formatInvalid");
  }
  return null;
};
```

3. 成功/错误提示:

```tsx
try {
  await createVersion(versionData);
  toast.success(t("createDialog.success", { version: versionData.number }));
} catch (error) {
  toast.error(t("createDialog.error", { message: error.message }));
}
```

### 7.7 修改日期格式化工具

**文件**: `app/lib/format-utils.ts`

**任务**: 添加语言参数支持（如 M5 里程碑所述）

```typescript
/**
 * 获取当前界面语言
 */
function getCurrentLocale(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("drawio2go-language") || "en-US";
  }
  return "en-US";
}

/**
 * 格式化版本时间戳
 * @param timestamp - Unix 时间戳（毫秒）
 * @param mode - 'full' 或 'compact'
 * @param locale - 语言代码（可选）
 */
export function formatVersionTimestamp(
  timestamp: number,
  mode: "full" | "compact" = "full",
  locale?: string,
): string {
  const formatLocale = locale || getCurrentLocale();
  const options: Intl.DateTimeFormatOptions =
    mode === "full"
      ? {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }
      : { year: "numeric", month: "2-digit", day: "2-digit" };

  return new Date(timestamp).toLocaleString(formatLocale, options);
}
```

### 7.8 验证功能

**测试场景**:

1. 打开版本管理侧边栏
2. 切换到英语
3. 验证：
   - [ ] 版本卡片所有文本显示为英文
   - [ ] 时间线分组标签为英文
   - [ ] 日期时间格式为 MM/DD/YYYY HH:mm AM/PM
   - [ ] 对比视图标签为英文
4. 创建新版本
5. 验证：
   - [ ] 对话框标签、占位符为英文
   - [ ] 验证错误消息为英文
6. 切换到中文
7. 验证：
   - [ ] 所有文本立即更新为中文
   - [ ] 日期时间格式为 YYYY/MM/DD HH:mm
8. 测试恢复、删除操作
9. 验证：
   - [ ] 确认对话框消息为当前语言
   - [ ] 操作反馈消息正确

## 翻译资源完整示例

详见上述 7.2 节的完整 JSON 示例。

英文版本对应翻译（部分）：

```json
{
  "card": {
    "version": "Version {{number}}",
    "createdAt": "Created at",
    "description": "Description",
    "noDescription": "No description",
    "current": "Current",
    "wip": "WIP",
    "confirmDelete": "Are you sure you want to delete version {{number}}? This action cannot be undone."
  },
  "timeline": {
    "groups": {
      "today": "Today",
      "yesterday": "Yesterday",
      "thisWeek": "This Week",
      "lastWeek": "Last Week",
      "thisMonth": "This Month",
      "older": "Older"
    }
  }
}
```

## 验收标准

- [ ] `VersionCard.tsx` 完全国际化
- [ ] `VersionTimeline.tsx` 完全国际化
- [ ] `VersionCompare.tsx` 完全国际化
- [ ] `CreateVersionDialog.tsx` 完全国际化
- [ ] `PageSVGViewer.tsx` 完全国际化
- [ ] `VersionSidebar.tsx` 完全国际化
- [ ] `version.json` 翻译文件完整（zh-CN + en-US）
- [ ] `validation.json` 包含版本验证消息
- [ ] `format-utils.ts` 支持 locale 参数
- [ ] 日期时间格式根据语言正确显示
- [ ] 时间线分组根据语言显示
- [ ] 切换语言后所有文本和日期立即更新
- [ ] 验证消息正确显示
- [ ] 运行 `grep -rn "[\u4e00-\u9fa5]" app/components/version --include="*.tsx"` 无硬编码中文
- [ ] 运行 `pnpm run lint` 无错误

## 注意事项

1. **日期格式**: 不同语言的日期格式差异较大，务必测试
2. **时间线分组**: 确保时间计算逻辑正确，不受语言切换影响
3. **版本号**: 版本号本身不翻译，仅周围的标签翻译
4. **确认对话框**: 使用 `confirm()` 或自定义对话框时，消息必须国际化

## 下一步

完成后继续 [M8: 聊天模块国际化](./milestone-8-chat-module.md)
