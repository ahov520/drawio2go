import { drawioTools } from "@/app/lib/drawio-ai-tools";
import { normalizeLLMConfig } from "@/app/lib/config-utils";
import { LLMConfig } from "@/app/types/chat";
import { ErrorCodes, type ErrorCode } from "@/app/errors/error-codes";
import { createLogger } from "@/lib/logger";
import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { NextRequest, NextResponse } from "next/server";

const logger = createLogger("Chat API");

function extractRecentReasoning(messages: ModelMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "assistant") {
      continue;
    }

    const { content } = message;
    if (!Array.isArray(content)) {
      return undefined;
    }

    const reasoningText = content
      .filter((part) => part.type === "reasoning")
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    return reasoningText || undefined;
  }

  return undefined;
}

function isNewUserQuestion(messages: ModelMessage[]): boolean {
  if (messages.length === 0) {
    return false;
  }

  const lastMessage = messages[messages.length - 1];
  return lastMessage.role === "user";
}

function apiError(code: ErrorCode, message: string, status = 500) {
  return NextResponse.json({ code, message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body?.messages as UIMessage[] | undefined;
    const rawConfig = body?.llmConfig;

    if (!Array.isArray(messages) || !rawConfig) {
      return apiError(
        ErrorCodes.CHAT_MISSING_PARAMS,
        "Missing required parameters: messages or llmConfig",
        400,
      );
    }

    const modelMessages = convertToModelMessages(messages, {
      tools: drawioTools,
    });

    let normalizedConfig: LLMConfig;

    try {
      normalizedConfig = normalizeLLMConfig(rawConfig);
    } catch {
      return apiError(
        ErrorCodes.CHAT_INVALID_CONFIG,
        "Invalid LLM configuration",
        400,
      );
    }

    const requestLogger = logger.withContext({
      provider: normalizedConfig.providerType,
      model: normalizedConfig.modelName,
      maxRounds: normalizedConfig.maxToolRounds,
    });

    requestLogger.info("收到请求", {
      messagesCount: modelMessages.length,
      capabilities: normalizedConfig.capabilities,
      enableToolsInThinking: normalizedConfig.enableToolsInThinking,
    });

    // 根据 providerType 选择合适的 provider
    let model;

    if (normalizedConfig.providerType === "openai-reasoning") {
      // OpenAI Reasoning 模型：使用原生 @ai-sdk/openai
      const openaiProvider = createOpenAI({
        baseURL: normalizedConfig.apiUrl,
        apiKey: normalizedConfig.apiKey || "dummy-key",
      });
      model = openaiProvider.chat(normalizedConfig.modelName);
    } else if (normalizedConfig.providerType === "deepseek-native") {
      // DeepSeek Native：使用 @ai-sdk/deepseek
      const deepseekProvider = createDeepSeek({
        baseURL: normalizedConfig.apiUrl,
        apiKey: normalizedConfig.apiKey || "dummy-key",
      });
      // deepseekProvider 直接返回模型调用函数（无需 .chat）
      model = deepseekProvider(normalizedConfig.modelName);
    } else {
      // OpenAI Compatible：使用 @ai-sdk/openai-compatible
      const compatibleProvider = createOpenAICompatible({
        name: normalizedConfig.providerType,
        baseURL: normalizedConfig.apiUrl,
        apiKey: normalizedConfig.apiKey || "dummy-key",
      });
      model = compatibleProvider(normalizedConfig.modelName);
    }

    let experimentalParams: Record<string, unknown> | undefined;
    let reasoningContent: string | undefined;

    try {
      if (
        normalizedConfig.enableToolsInThinking &&
        normalizedConfig.capabilities?.supportsThinking
      ) {
        const isNewQuestion = isNewUserQuestion(modelMessages);

        if (!isNewQuestion) {
          reasoningContent = extractRecentReasoning(modelMessages);

          if (reasoningContent) {
            experimentalParams = { reasoning_content: reasoningContent };

            requestLogger.debug("复用 reasoning_content", {
              length: reasoningContent.length,
            });
          } else {
            requestLogger.debug("无可复用的 reasoning_content");
          }
        } else {
          requestLogger.debug("新用户问题，跳过 reasoning_content 复用");
        }
      }
    } catch (reasoningError) {
      requestLogger.error("构建 reasoning_content 失败，已降级为普通模式", {
        error:
          reasoningError instanceof Error
            ? reasoningError.message
            : reasoningError,
        stack:
          reasoningError instanceof Error ? reasoningError.stack : undefined,
      });
    }

    const result = streamText({
      model,
      system: normalizedConfig.systemPrompt,
      messages: modelMessages,
      temperature: normalizedConfig.temperature,
      tools: drawioTools,
      stopWhen: stepCountIs(normalizedConfig.maxToolRounds),
      ...(experimentalParams && { experimental: experimentalParams }),
      onStepFinish: (step) => {
        requestLogger.debug("步骤完成", {
          toolCalls: step.toolCalls.length,
          textLength: step.text.length,
          reasoning: step.reasoning.length,
        });
      },
    });

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (error: unknown) {
    logger.error("Chat API error", error);

    let statusCode = 500;
    let code: ErrorCode = ErrorCodes.CHAT_SEND_FAILED;
    let message = "Failed to send request";

    const err = error as Error;
    if (err.message?.includes("Anthropic")) {
      message = err.message;
      statusCode = 400;
    } else if (err.message?.includes("API key")) {
      code = ErrorCodes.CHAT_API_KEY_INVALID;
      message = "API key is missing or invalid";
      statusCode = 401;
    } else if (err.message?.includes("model")) {
      code = ErrorCodes.CHAT_MODEL_NOT_FOUND;
      message = "Model does not exist or is unavailable";
      statusCode = 400;
    } else if (err.message?.includes("配置参数")) {
      code = ErrorCodes.CHAT_INVALID_CONFIG;
      message = "Invalid LLM configuration";
      statusCode = 400;
    } else if (err.message) {
      message = err.message;
    }

    return apiError(code, message, statusCode);
  }
}
