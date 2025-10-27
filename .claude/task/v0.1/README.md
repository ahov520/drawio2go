# AI Agent Loop 实现任务规划 v0.1

## 项目目标
使用 @ai-sdk/react 构建一个 React loop Agent，自动循环执行工具调用直到模型不再返回 function call。

## 技术要求
1. ✅ 必须使用设置中的**所有** AI API 配置
2. ✅ 以 function call 的形式集成 DrawIO 工具集
3. ✅ 当使用旧式格式时，使用 @ai-sdk/deepseek 进行请求
4. ✅ 自动循环执行工具调用，除非模型返回没有 function call

## 里程碑总览

| 里程碑 | 文件 | 预计耗时 | 状态 | 依赖 |
|--------|------|----------|------|------|
| 1. 基础配置扩展 | [milestone-1.md](./milestone-1.md) | 30 分钟 | ⏸️ 待执行 | 无 |
| 2. 工具定义层 | [milestone-2.md](./milestone-2.md) | 45 分钟 | ⏸️ 待执行 | 无 |
| 3. 聊天 API 核心逻辑 | [milestone-3.md](./milestone-3.md) | 90 分钟 | ⏸️ 待执行 | 1, 2 |
| 4. 聊天 UI 集成 | [milestone-4.md](./milestone-4.md) | 60 分钟 | ⏸️ 待执行 | 1, 3 |
| 5. 类型定义与优化 | [milestone-5.md](./milestone-5.md) | 30 分钟 | ⏸️ 待执行 | 1-4 |
| 6. 集成测试与调试 | [milestone-6.md](./milestone-6.md) | 90 分钟 | ⏸️ 待执行 | 1-5 |

**总预计耗时**：约 5.5 小时

## 推荐执行顺序
```
里程碑 1 → 里程碑 2 → 里程碑 3 → 里程碑 4 → 里程碑 5 → 里程碑 6
```

## 环境要求
- ✅ 已安装 `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/deepseek`, `ai`, `zod`
- ✅ DrawIO 工具集已实现（`app/lib/drawio-tools.ts`）

## 快速开始
```bash
# 开始执行第一个里程碑
cat .claude/task/v0.1/milestone-1.md
```

---

*创建时间: 2025-10-27*
*版本: v0.1*
*状态: 待执行*
