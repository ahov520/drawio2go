# M4: ProjectSelector 组件国际化

## 目标

完成 ProjectSelector 组件的国际化改造，包括表单标签、按钮文本、验证消息和空状态提示。

## 预估时间

1.5-2 小时

## 前置依赖

- M1: 基础设施搭建完成
- M2: 语言切换器可用
- M3: TopBar 组件国际化完成

## 任务清单

### 4.1 提取中文文本

**文件**: `app/components/ProjectSelector.tsx`

**需要提取的文本** (~30 条):

- 表单标签（项目名称、描述等）
- 按钮文本（创建、取消、选择等）
- 占位符文本
- 空状态提示
- 验证错误消息
- 帮助文本

**文本分类**:

1. **表单相关**: 标签、占位符、描述
2. **按钮操作**: 创建、取消、选择、删除
3. **空状态**: 无项目提示
4. **验证消息**: 名称必填、长度限制等

### 4.2 创建翻译资源

**更新文件**:

- `locales/zh-CN/project.json`
- `locales/en-US/project.json`
- `locales/zh-CN/validation.json`（验证消息）
- `locales/en-US/validation.json`

**翻译结构示例**:

**`project.json`**:

```json
{
  "selector": {
    "title": "选择项目",
    "createNew": "创建新项目",
    "emptyState": {
      "title": "暂无项目",
      "description": "创建一个新项目开始使用",
      "action": "创建项目"
    }
  },
  "form": {
    "name": {
      "label": "项目名称",
      "placeholder": "输入项目名称",
      "description": "用于识别项目的名称"
    },
    "description": {
      "label": "项目描述",
      "placeholder": "输入项目描述（可选）",
      "description": "对项目的简要说明"
    }
  },
  "buttons": {
    "create": "创建",
    "cancel": "取消",
    "select": "选择",
    "delete": "删除"
  },
  "actions": {
    "creating": "正在创建...",
    "created": "项目已创建",
    "deleted": "项目已删除"
  }
}
```

**`validation.json`** (项目验证部分):

```json
{
  "project": {
    "nameRequired": "项目名称不能为空",
    "nameMinLength": "项目名称至少需要 {{min}} 个字符",
    "nameMaxLength": "项目名称不能超过 {{max}} 个字符",
    "descriptionMaxLength": "描述不能超过 {{max}} 个字符",
    "nameInvalid": "项目名称包含非法字符"
  }
}
```

### 4.3 改造组件代码

**改造步骤**:

1. 导入多个命名空间的 Hook:

```tsx
import { useTranslation } from "@/app/i18n/hooks";

export default function ProjectSelector() {
  const { t: tProject } = useTranslation("project");
  const { t: tValidation } = useTranslation("validation");

  // 或者使用单个 Hook 引用多个命名空间
  const { t } = useTranslation("project");

  // 引用其他命名空间: t('validation:project.nameRequired')
}
```

2. 替换表单标签:

```tsx
// 改造前
<Label>项目名称</Label>
<Input placeholder="输入项目名称" />
<Description>用于识别项目的名称</Description>

// 改造后
<Label>{t('form.name.label')}</Label>
<Input placeholder={t('form.name.placeholder')} />
<Description>{t('form.name.description')}</Description>
```

3. 替换按钮文本:

```tsx
// 改造前
<Button>{isCreating ? '正在创建...' : '创建'}</Button>

// 改造后
<Button>{isCreating ? t('actions.creating') : t('buttons.create')}</Button>
```

4. 替换验证消息:

```tsx
// 改造前
if (!name) {
  return "项目名称不能为空";
}

// 改造后
if (!name) {
  return t("validation:project.nameRequired");
}
```

5. 替换空状态:

```tsx
// 改造前
<div>
  <h3>暂无项目</h3>
  <p>创建一个新项目开始使用</p>
  <Button>创建项目</Button>
</div>

// 改造后
<div>
  <h3>{t('selector.emptyState.title')}</h3>
  <p>{t('selector.emptyState.description')}</p>
  <Button>{t('selector.emptyState.action')}</Button>
</div>
```

### 4.4 处理验证逻辑

如果组件使用表单验证库（如 Zod、Yup），确保验证消息也国际化：

```tsx
// 示例：使用 Zod
import { z } from "zod";

const projectSchema = z.object({
  name: z
    .string()
    .min(1, { message: t("validation:project.nameRequired") })
    .min(3, { message: t("validation:project.nameMinLength", { min: 3 }) })
    .max(50, { message: t("validation:project.nameMaxLength", { max: 50 }) }),
  description: z
    .string()
    .max(200, {
      message: t("validation:project.descriptionMaxLength", { max: 200 }),
    })
    .optional(),
});
```

### 4.5 验证功能

**测试场景**:

1. 打开项目选择器
2. 切换到英语
3. 验证：
   - [ ] 表单标签显示为英文
   - [ ] 占位符文本显示为英文
   - [ ] 按钮文本显示为英文
4. 尝试提交无效表单
5. 验证：
   - [ ] 验证错误消息显示为英文
6. 切换到中文
7. 验证：
   - [ ] 所有文本立即更新为中文
   - [ ] 验证错误消息为中文
8. 创建项目
9. 验证：
   - [ ] 创建过程提示文本正确

## 翻译资源完整示例

**`locales/zh-CN/project.json`**:

```json
{
  "selector": {
    "title": "选择项目",
    "createNew": "创建新项目",
    "emptyState": {
      "title": "暂无项目",
      "description": "创建一个新项目开始使用",
      "action": "创建项目"
    }
  },
  "form": {
    "name": {
      "label": "项目名称",
      "placeholder": "输入项目名称",
      "description": "用于识别项目的名称"
    },
    "description": {
      "label": "项目描述",
      "placeholder": "输入项目描述（可选）",
      "description": "对项目的简要说明"
    },
    "path": {
      "label": "保存路径",
      "placeholder": "选择保存位置",
      "selectButton": "选择目录",
      "description": "项目文件保存的目录"
    }
  },
  "buttons": {
    "create": "创建",
    "cancel": "取消",
    "select": "选择",
    "delete": "删除",
    "rename": "重命名"
  },
  "actions": {
    "creating": "正在创建...",
    "created": "项目已创建",
    "deleted": "项目已删除",
    "renamed": "项目已重命名",
    "selected": "已选择项目: {{name}}"
  }
}
```

**`locales/en-US/project.json`**:

```json
{
  "selector": {
    "title": "Select Project",
    "createNew": "Create New Project",
    "emptyState": {
      "title": "No Projects",
      "description": "Create a new project to get started",
      "action": "Create Project"
    }
  },
  "form": {
    "name": {
      "label": "Project Name",
      "placeholder": "Enter project name",
      "description": "Name to identify the project"
    },
    "description": {
      "label": "Project Description",
      "placeholder": "Enter project description (optional)",
      "description": "Brief description of the project"
    },
    "path": {
      "label": "Save Path",
      "placeholder": "Select save location",
      "selectButton": "Select Directory",
      "description": "Directory where project files will be saved"
    }
  },
  "buttons": {
    "create": "Create",
    "cancel": "Cancel",
    "select": "Select",
    "delete": "Delete",
    "rename": "Rename"
  },
  "actions": {
    "creating": "Creating...",
    "created": "Project created",
    "deleted": "Project deleted",
    "renamed": "Project renamed",
    "selected": "Selected project: {{name}}"
  }
}
```

**`locales/zh-CN/validation.json`**:

```json
{
  "project": {
    "nameRequired": "项目名称不能为空",
    "nameMinLength": "项目名称至少需要 {{min}} 个字符",
    "nameMaxLength": "项目名称不能超过 {{max}} 个字符",
    "descriptionMaxLength": "描述不能超过 {{max}} 个字符",
    "nameInvalid": "项目名称包含非法字符",
    "pathRequired": "必须选择保存路径"
  }
}
```

**`locales/en-US/validation.json`**:

```json
{
  "project": {
    "nameRequired": "Project name is required",
    "nameMinLength": "Project name must be at least {{min}} characters",
    "nameMaxLength": "Project name cannot exceed {{max}} characters",
    "descriptionMaxLength": "Description cannot exceed {{max}} characters",
    "nameInvalid": "Project name contains invalid characters",
    "pathRequired": "Save path must be selected"
  }
}
```

## 验收标准

- [ ] `ProjectSelector.tsx` 已导入 `useTranslation`
- [ ] 表单标签、占位符、描述全部国际化
- [ ] 按钮文本全部国际化
- [ ] 空状态提示国际化
- [ ] 验证消息国际化
- [ ] `project.json` 翻译文件完整（zh-CN + en-US）
- [ ] `validation.json` 包含项目验证消息
- [ ] 切换语言后所有文本立即更新
- [ ] 表单验证错误消息根据语言显示
- [ ] 运行 `grep -n "[\u4e00-\u9fa5]" app/components/ProjectSelector.tsx` 无硬编码中文
- [ ] 运行 `pnpm run lint` 无错误

## 注意事项

1. **验证消息动态性**: 如果使用验证库，确保在语言切换后重新创建验证 schema
2. **插值变量**: 确保验证消息中的插值变量（如 `{{min}}`, `{{max}}`）在中英文中一致
3. **表单状态**: 切换语言不应重置表单输入内容

## 下一步

完成后继续 [M5: UnifiedSidebar 组件国际化](./milestone-5-unified-sidebar.md)
