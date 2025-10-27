# 里程碑 3：聊天 API 核心逻辑

**状态**：⏸️ 待执行
**预计耗时**：90 分钟
**依赖**：里程碑 1, 2

## 目标
实现支持 agentic loop 的流式聊天 API

## 任务清单

### 1. 创建 API 路由文件
- [ ] 创建 `app/api/chat/route.ts`
- [ ] 设置 Edge Runtime：
  ```typescript
  export const runtime = 'edge';
  ```

### 2. 添加必要的导入
- [ ] 添加导入语句：
  ```typescript
  import { streamText, CoreMessage } from 'ai';
  import { createDeepSeek } from '@ai-sdk/deepseek';
  import { createOpenAI } from '@ai-sdk/openai';
  import { NextRequest, NextResponse } from 'next/server';
  import { drawioTools } from '@/lib/drawio-ai-tools';
  ```

### 3. 定义 LLMConfig 接口
- [ ] 定义配置类型（与设置侧边栏保持一致）：
  ```typescript
  interface LLMConfig {
    apiUrl: string;
    apiKey: string;
    temperature: number;
    modelName: string;
    systemPrompt: string;
    useLegacyOpenAIFormat: boolean;
    maxToolRounds: number;
  }
  ```

### 4. 实现 POST 处理函数
- [ ] 创建请求处理函数：
  ```typescript
  export async function POST(req: NextRequest) {
    try {
      // 1. 解析请求体
      const body = await req.json();
      const { messages, llmConfig } = body as {
        messages: CoreMessage[];
        llmConfig: LLMConfig;
      };

      // 2. 验证必要参数
      if (!messages || !llmConfig) {
        return NextResponse.json(
          { error: '缺少必要参数：messages 或 llmConfig' },
          { status: 400 }
        );
      }

      if (!llmConfig.apiUrl || !llmConfig.modelName) {
        return NextResponse.json(
          { error: '缺少必要的配置参数：apiUrl 和 modelName' },
          { status: 400 }
        );
      }

      // ... 继续实现
    } catch (error: any) {
      console.error('聊天 API 错误:', error);
      return NextResponse.json(
        { error: error.message || '服务器内部错误' },
        { status: 500 }
      );
    }
  }
  ```

### 5. 实现动态 Provider 选择
- [ ] 添加 Provider 选择逻辑：
  ```typescript
  // 根据配置选择 Provider
  let provider;

  if (llmConfig.useLegacyOpenAIFormat) {
    // 使用 DeepSeek Provider
    provider = createDeepSeek({
      baseURL: llmConfig.apiUrl,
      apiKey: llmConfig.apiKey || 'dummy-key',
    });
  } else {
    // 使用 OpenAI 兼容 Provider
    provider = createOpenAI({
      baseURL: llmConfig.apiUrl,
      apiKey: llmConfig.apiKey || 'dummy-key',
    });
  }

  const model = provider(llmConfig.modelName);
  ```

### 6. 实现 Agent Loop
- [ ] 调用 streamText API：
  ```typescript
  const result = streamText({
    model: model,
    system: llmConfig.systemPrompt,
    messages: messages,
    temperature: llmConfig.temperature,
    tools: drawioTools,
    maxSteps: llmConfig.maxToolRounds,

    // 可选：添加调试日志
    onStepFinish: (step) => {
      console.log('步骤完成:', {
        stepType: step.stepType,
        toolCalls: step.toolCalls?.length || 0,
        text: step.text?.slice(0, 100),
      });
    },
  });

  // 返回流式响应
  return result.toDataStreamResponse();
  ```

### 7. 完善错误处理
- [ ] 捕获并返回友好的错误消息：
  ```typescript
  } catch (error: any) {
    console.error('聊天 API 错误:', error);

    // 区分不同类型的错误
    let errorMessage = '服务器内部错误';
    let statusCode = 500;

    if (error.message?.includes('API key')) {
      errorMessage = 'API 密钥无效或缺失';
      statusCode = 401;
    } else if (error.message?.includes('model')) {
      errorMessage = '模型不存在或不可用';
      statusCode = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
  ```

## 完整代码结构
```typescript
export const runtime = 'edge';

import { streamText, CoreMessage } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest, NextResponse } from 'next/server';
import { drawioTools } from '@/lib/drawio-ai-tools';

interface LLMConfig {
  apiUrl: string;
  apiKey: string;
  temperature: number;
  modelName: string;
  systemPrompt: string;
  useLegacyOpenAIFormat: boolean;
  maxToolRounds: number;
}

export async function POST(req: NextRequest) {
  try {
    // 1. 解析和验证
    // 2. 选择 Provider
    // 3. 调用 streamText
    // 4. 返回流式响应
  } catch (error) {
    // 错误处理
  }
}
```

## 验收标准
- [ ] API 路由能正确处理 POST 请求
- [ ] 能正确解析 messages 和 llmConfig
- [ ] `useLegacyOpenAIFormat = true` 时使用 DeepSeek
- [ ] `useLegacyOpenAIFormat = false` 时使用 OpenAI
- [ ] 工具调用能正确执行
- [ ] 达到 `maxToolRounds` 限制时停止
- [ ] 流式响应能正确返回
- [ ] 错误能被正确捕获和返回
- [ ] 无 TypeScript 编译错误

## 测试步骤
1. 使用 Postman 或 curl 测试 API：
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{"role": "user", "content": "Hello"}],
       "llmConfig": {
         "apiUrl": "https://api.deepseek.com",
         "apiKey": "your-key",
         "temperature": 0.3,
         "modelName": "deepseek-chat",
         "systemPrompt": "You are a helpful assistant.",
         "useLegacyOpenAIFormat": true,
         "maxToolRounds": 5
       }
     }'
   ```

2. 检查响应是否为流式格式
3. 查看服务器日志确认步骤完成事件

## 注意事项
- **Edge Runtime**：必须使用 Edge Runtime 以支持流式响应
- **API Key**：如果为空，使用 `'dummy-key'` 占位符
- **错误处理**：确保所有错误都被捕获并返回 JSON 格式
- **调试日志**：生产环境可移除 `onStepFinish` 回调
- **导入路径**：使用 `@/lib/drawio-ai-tools` 别名导入

## 常见问题
**Q: streamText 返回什么？**
A: 返回一个包含 `toDataStreamResponse()` 方法的对象，可直接返回给客户端。

**Q: maxSteps 和 maxToolRounds 的关系？**
A: `maxSteps` 是 AI SDK 的参数，表示最大交互轮次（包括工具调用和文本生成），我们用 `maxToolRounds` 配置它。

**Q: 如果工具执行失败会怎样？**
A: AI SDK 会捕获错误，将错误信息作为工具结果返回给模型，模型可以根据错误调整策略。

---

**下一步**：完成后继续 [里程碑 4：聊天 UI 集成](./milestone-4.md)
