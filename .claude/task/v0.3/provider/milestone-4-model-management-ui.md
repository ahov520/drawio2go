# Milestone 4: 模型管理UI

## 目标

在供应商管理面板中添加模型列表展示和管理功能，实现添加/编辑/删除模型、设置默认模型的对话框。

## 优先级

🟡 **高优先级** - 核心UI功能

## 任务列表

### 1. 扩展供应商管理面板

**文件**: `app/components/settings/ModelsSettingsPanel.tsx`

- [ ] 在 `Accordion.Content` 中添加模型列表区域
- [ ] 实现模型列表结构
  - 使用HeroUI v3 `Card` 组件展示每个模型
  - 每个模型卡片包含：Header（模型名称 + 默认标记 + 操作菜单）和 Content（参数显示）
- [ ] 显示模型参数
  - 温度（temperature）
  - 最大工具调用轮次（maxToolRounds，999显示为"无限制"）
- [ ] 实现模型操作菜单（Dropdown + ListBox）
  - 编辑模型
  - 设为默认模型
  - 删除模型
- [ ] 实现"添加模型"按钮
  - 每个供应商的模型列表上方
  - 使用 `Button` 组件，variant="secondary", size="sm"
  - 点击打开模型编辑对话框
- [ ] 处理模型删除的级联逻辑
  - 检查是否为当前活动模型
  - 显示确认对话框
  - 切换活动模型到同供应商的其他模型（如需要）
- [ ] 实现设置默认模型功能
  - 更新模型的 `isDefault` 标志
  - 同一供应商只能有一个默认模型
  - 更新UI显示默认标记
- [ ] 添加空状态提示（供应商无模型时）

- [ ] 在模型卡片中显示能力徽章
  - 使用 HeroUI v3 Chip 组件
  - supportsThinking 为 true 时显示"思考"徽章（Brain图标）
  - supportsVision 为 true 时显示"视觉"徽章（Eye图标）
  - enableToolsInThinking 为 true 时显示"工具"徽章（Wrench图标）
  - 徽章使用 variant="secondary"（能力）和 variant="tertiary"（工具）
  - 导入图标: `import { Brain, Eye, Wrench } from "lucide-react"`

### 2. 创建模型编辑对话框

**文件**: `app/components/settings/ModelEditDialog.tsx`（新建）

- [ ] 使用HeroUI v3 `Modal` 组件（复合组件模式）
- [ ] 实现对话框结构
  - `Modal.Header`: 标题（"添加模型" / "编辑模型"）+ 关闭按钮
  - `Modal.Body`: 表单字段
  - `Modal.Footer`: 取消和保存按钮
- [ ] 实现表单字段
  - 模型名称（TextField + Input）
    - 必填，用于API请求的模型标识符
  - 显示名称（TextField + Input）
    - 可选，用于界面显示的友好名称
  - 温度（Slider）
    - 范围：0-2
    - 步进：0.01
    - 显示当前值（Slider.Output）
  - 最大工具调用轮次（Slider）
    - 范围：5-999
    - 步进：1
    - 999显示为"无限制"
    - 显示当前值（Slider.Output formatValue）
- [ ] 实现表单验证
  - 模型名称不能为空
  - 温度范围验证（0-2）
  - 工具轮次范围验证（5-999）
- [ ] 实现保存逻辑
  - 新增：调用 `addModel(providerId, ...)` 方法
  - 编辑：调用 `updateModel(providerId, modelId, ...)` 方法
  - 保存成功后关闭对话框并刷新列表
- [ ] 实现取消逻辑
  - 关闭对话框并清空表单

- [ ] 添加模型能力复选框区域

  ```tsx
  <Fieldset>
    <Label>模型能力</Label>
    <Description>标记此模型支持的功能特性</Description>

    <Checkbox isSelected={capabilities.supportsThinking} ...>
      <Label>思考能力 (Reasoning)</Label>
      <Description>支持多步推理和思维链输出</Description>
    </Checkbox>

    <Checkbox isSelected={capabilities.supportsVision} ...>
      <Label>视觉能力 (Vision)</Label>
      <Description>支持图像输入和分析</Description>
    </Checkbox>
  </Fieldset>
  ```

- [ ] 添加"思考中使用工具"复选框（条件显示）

  ```tsx
  {capabilities.supportsThinking && (
    <Checkbox isSelected={enableToolsInThinking} ...>
      <Label>思考中使用工具调用</Label>
      <Description>
        允许模型在思考过程中执行工具调用(如 DrawIO 编辑)
      </Description>
    </Checkbox>
  )}
  ```

- [ ] 初始化状态管理
  - 添加 `const [capabilities, setCapabilities] = useState<ModelCapabilities>(...)`
  - 添加 `const [enableToolsInThinking, setEnableToolsInThinking] = useState<boolean>(...)`
  - 编辑模式下从 modelData 加载初始值
  - 新建模式下使用 `getDefaultCapabilities(modelName)` 初始化

### 3. 创建模型参数显示组件（可选辅助组件）

**文件**: `app/components/settings/ParamBadge.tsx`（新建，可选）

- [ ] 创建小型Badge组件用于显示参数
- [ ] 接收 label 和 value props
- [ ] 使用HeroUI Badge或自定义样式
- [ ] 紧凑的横向布局

## 涉及文件

- 📝 修改：`app/components/settings/ModelsSettingsPanel.tsx`
- ✨ 新建：`app/components/settings/ModelEditDialog.tsx`
- ✨ 新建：`app/components/settings/ParamBadge.tsx`（可选）
- 📖 依赖：`app/hooks/useStorageSettings.ts`（使用存储方法）

## HeroUI v3 组件使用

### 必须遵循的规范

- ✅ 使用复合组件模式
- ✅ 使用语义化variant
- ✅ 使用 `onPress` 而不是 `onClick`
- ✅ 使用 `isDisabled` 而不是 `disabled`

### 使用的组件

- `Card` + `Card.Header` + `Card.Content`
- `Modal` + `Modal.Header` + `Modal.Body` + `Modal.Footer`
- `Button`（variant: secondary, primary, ghost, danger）
- `Dropdown` + `Dropdown.Trigger` + `Dropdown.Content`
- `ListBox` + `ListBox.Item`
- `TextField` + `Label` + `Input` + `Description`
- `Slider` + `Slider.Track` + `Slider.Fill` + `Slider.Thumb` + `Slider.Output`
- `Badge`（显示"默认"标记）
- `Checkbox` + `Label` + `Description`（能力选择框）
- `Chip`（能力徽章显示）
- `Fieldset`（能力分组）
- lucide-react 图标（Brain, Eye, Wrench）

## 验收标准

### UI显示

- [ ] 每个供应商下的模型列表正确展示
- [ ] 模型卡片显示完整信息（名称、参数）
- [ ] 默认模型显示Badge标记
- [ ] 操作菜单（编辑/设为默认/删除）正常工作
- [ ] 添加模型按钮位置合理

### 对话框功能

- [ ] 模型编辑对话框正确打开/关闭
- [ ] 所有表单字段正常输入
- [ ] 温度Slider拖动流畅，显示实时值
- [ ] 工具轮次Slider拖动流畅，999显示为"无限制"

### 数据操作

- [ ] 新增模型成功保存到对应供应商
- [ ] 编辑模型成功更新存储
- [ ] 删除模型时显示确认对话框
- [ ] 删除当前活动模型时正确切换
- [ ] 设置默认模型功能正常
- [ ] 同一供应商只有一个默认模型

### 表单验证

- [ ] 必填字段验证生效
- [ ] 温度范围验证生效
- [ ] 工具轮次范围验证生效
- [ ] 验证错误显示清晰

### HeroUI规范

- [ ] 所有组件使用复合组件模式
- [ ] Slider使用复合组件模式（Track + Fill + Thumb + Output）
- [ ] 所有Button使用语义化variant
- [ ] 深色/浅色主题适配正常

### 能力UI验收

- [ ] 模型编辑对话框正确显示能力复选框
- [ ] "思考能力"和"视觉能力"复选框状态正确保存和加载
- [ ] enableToolsInThinking 复选框在 supportsThinking 为 false 时隐藏
- [ ] 模型列表正确显示能力徽章（条件显示）
- [ ] 徽章使用正确的 HeroUI v3 Chip 组件和语义化variant
- [ ] 图标清晰且语义准确（Brain/Eye/Wrench）
- [ ] 深色/浅色主题下均正常显示

### 数据同步验收

- [ ] 能力字段变更正确保存到存储层
- [ ] 刷新页面后能力状态正确还原
- [ ] 新建模型时从白名单自动填充能力

## 依赖关系

**前置依赖**:

- ✅ Milestone 1（类型定义）
- ✅ Milestone 2（存储层方法）
- ✅ Milestone 3（供应商管理UI）

**后续依赖**:

- Milestone 6（聊天页面模型选择器）将使用模型列表数据

## 注意事项

1. **Slider复合组件**: HeroUI v3的Slider必须使用复合组件模式，包含Track、Fill、Thumb等子组件
2. **formatValue**: 工具轮次Slider的Output需要使用formatValue属性，将999格式化为"无限制"字符串
3. **级联删除**: 删除模型时必须处理活动模型切换逻辑
4. **默认模型**: 设置默认模型时，需要将同供应商的其他模型的isDefault设为false
5. **空状态**: 供应商无模型时显示友好的空状态提示（如"该供应商还没有模型，点击添加"）
6. **参数显示**: 使用小型Badge或自定义组件紧凑地显示温度和工具轮次
7. **条件渲染**: enableToolsInThinking 复选框使用 `{supportsThinking && <Checkbox>...}` 条件渲染
8. **徽章颜色**: 能力徽章使用 secondary，工具调用徽章使用 tertiary，保持视觉层级
9. **图标选择**: 使用 lucide-react 的语义化图标，保持风格统一
10. **可访问性**: Checkbox 必须包含 Label 和 Description，符合 WCAG 2.1 AA

## 预计时间

⏱️ **4-5 小时**
