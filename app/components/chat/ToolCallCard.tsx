"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { usePress } from "@react-aria/interactions";
import { type ToolMessagePart } from "./constants/toolConstants";
import {
  getToolTitle,
  getToolSummary,
  getToolStatusMeta,
} from "./utils/toolUtils";
import { useAppTranslation } from "@/app/i18n/hooks";
import { createLogger } from "@/lib/logger";
import { isToolErrorResult } from "@/app/types/tool-errors";

const logger = createLogger("ToolCallCard");

const I18N_KEYS = {
  copied: "messages.actions.copied",
  expand: "toolCalls.actions.expand",
  collapse: "toolCalls.actions.collapse",
  copyInput: "toolCalls.actions.copyInput",
  copyOutput: "toolCalls.actions.copyOutput",
  copyError: "toolCalls.actions.copyError",
  error: "toolCalls.error",
  parameters: "toolCalls.parameters",
  result: "toolCalls.result",
} as const;

function formatZodValidationDetails(details: Record<string, unknown>): string {
  const issuesRaw = (details as { issues?: unknown }).issues;
  const issues = Array.isArray(issuesRaw)
    ? (issuesRaw as Array<Record<string, unknown>>)
    : [];

  if (issues.length === 0) {
    return JSON.stringify(details, null, 2);
  }

  return issues
    .map((issue) => {
      const path = Array.isArray(issue.path)
        ? (issue.path as Array<string | number>).map(String).join(".")
        : "";
      const label = path ? path : "(root)";
      const msg =
        typeof issue.message === "string"
          ? issue.message
          : JSON.stringify(issue);
      return `- ${label}: ${msg}`;
    })
    .join("\n");
}

function formatXmlParseDetails(
  details: Record<string, unknown>,
): string | null {
  const formatted =
    typeof (details as { formatted?: unknown }).formatted === "string"
      ? ((details as { formatted?: string }).formatted as string)
      : null;
  return formatted || null;
}

function formatToolErrorDetails(errorDetails: unknown): string | null {
  if (errorDetails == null) return null;

  if (typeof errorDetails !== "object") {
    return JSON.stringify(errorDetails, null, 2);
  }

  const details = errorDetails as Record<string, unknown>;
  const kind = typeof details.kind === "string" ? details.kind : "";

  if (kind === "zod_validation") {
    return formatZodValidationDetails(details);
  }

  if (kind === "xml_parse") {
    return formatXmlParseDetails(details) ?? JSON.stringify(details, null, 2);
  }

  return JSON.stringify(details, null, 2);
}

interface ToolCallCardProps {
  part: ToolMessagePart;
  expanded: boolean;
  onToggle: () => void;
}

export default function ToolCallCard({
  part,
  expanded,
  onToggle,
}: ToolCallCardProps) {
  const { t } = useAppTranslation("chat");
  const title = getToolTitle(part.type, t);
  const toolErrorResult = isToolErrorResult(part.output) ? part.output : null;
  const effectiveState = toolErrorResult ? "output-error" : part.state;
  const meta = getToolStatusMeta(effectiveState, t);
  const StatusIcon = meta.Icon;
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedError, setCopiedError] = useState(false);

  const showInput = part.input !== undefined;
  const showOutput = part.output !== undefined;

  const errorSummary =
    part.errorText ?? toolErrorResult?.message ?? t(I18N_KEYS.error);
  const errorDetails =
    part.errorDetails ?? toolErrorResult?.errorDetails ?? undefined;
  const errorDetailsText = formatToolErrorDetails(errorDetails);

  // 判断是否为进行中状态（正在调用或等待执行）
  const isInProgress =
    effectiveState === "input-streaming" ||
    effectiveState === "input-available";

  // 通用复制处理函数
  const handleCopy = async (
    text: string,
    setStateFn: React.Dispatch<React.SetStateAction<boolean>>,
    context: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setStateFn(true);
      setTimeout(() => setStateFn(false), 2000);
    } catch (error) {
      logger.error(`[ToolCallCard] copy ${context} failed:`, error);
    }
  };

  // 复制输入参数
  const handleCopyInput = () =>
    handleCopy(JSON.stringify(part.input, null, 2), setCopiedInput, "input");

  // 复制输出结果
  const handleCopyOutput = () =>
    handleCopy(JSON.stringify(part.output, null, 2), setCopiedOutput, "output");

  // 复制错误信息
  const handleCopyError = () => {
    const payload: Record<string, unknown> = {
      type: part.type,
      state: part.state,
      toolCallId: part.toolCallId,
      errorText: errorSummary,
    };
    if (errorDetails !== undefined) payload.errorDetails = errorDetails;
    if (part.output !== undefined) payload.output = part.output;
    return handleCopy(
      JSON.stringify(payload, null, 2),
      setCopiedError,
      "error",
    );
  };

  const { pressProps: togglePressProps } = usePress({ onPress: onToggle });
  const { pressProps: copyErrorPressProps } = usePress({
    onPress: handleCopyError,
  });
  const { pressProps: copyInputPressProps } = usePress({
    onPress: handleCopyInput,
  });
  const { pressProps: copyOutputPressProps } = usePress({
    onPress: handleCopyOutput,
  });

  return (
    <div
      className={`tool-call-card tool-call-card--${meta.tone} ${
        expanded ? "tool-call-card--expanded" : ""
      } ${isInProgress ? "tool-call-card--scanning" : ""}`.trim()}
    >
      <button
        type="button"
        className="tool-call-header"
        aria-expanded={expanded}
        aria-label={expanded ? t(I18N_KEYS.collapse) : t(I18N_KEYS.expand)}
        {...togglePressProps}
      >
        <div className="tool-call-title">{title}</div>
        <div className="tool-call-status">
          <span
            className={`tool-call-status-icon ${
              isInProgress ? "tool-call-status-icon--spinning" : ""
            }`.trim()}
            aria-hidden
          >
            <StatusIcon size={16} />
          </span>
          <span className="tool-call-status-label">{meta.label}</span>
          <svg
            className={`tool-call-chevron ${expanded ? "tool-call-chevron--open" : ""}`.trim()}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      <div className="tool-call-summary">
        {getToolSummary({ ...part, state: effectiveState }, t)}
      </div>
      {expanded ? (
        <div className="tool-call-body">
          {/* 错误信息区块 */}
          {effectiveState === "output-error" && (
            <div className="tool-call-section">
              <div className="tool-call-section-header">
                <div className="tool-call-section-title">
                  {t(I18N_KEYS.error)}
                </div>
                <button
                  type="button"
                  className="tool-call-copy-icon-button"
                  title={
                    copiedError ? t(I18N_KEYS.copied) : t(I18N_KEYS.copyError)
                  }
                  aria-label={
                    copiedError ? t(I18N_KEYS.copied) : t(I18N_KEYS.copyError)
                  }
                  {...copyErrorPressProps}
                >
                  {copiedError ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="tool-call-error-text">{errorSummary}</div>
              {errorDetailsText && (
                <pre className="tool-call-json">{errorDetailsText}</pre>
              )}
            </div>
          )}

          {/* 输入参数区块 */}
          {showInput && (
            <div className="tool-call-section">
              <div className="tool-call-section-header">
                <div className="tool-call-section-title">
                  {t(I18N_KEYS.parameters)}
                </div>
                <button
                  type="button"
                  className="tool-call-copy-icon-button"
                  title={
                    copiedInput ? t(I18N_KEYS.copied) : t(I18N_KEYS.copyInput)
                  }
                  aria-label={
                    copiedInput ? t(I18N_KEYS.copied) : t(I18N_KEYS.copyInput)
                  }
                  {...copyInputPressProps}
                >
                  {copiedInput ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="tool-call-json">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}

          {/* 输出结果区块 */}
          {showOutput && (
            <div className="tool-call-section">
              <div className="tool-call-section-header">
                <div className="tool-call-section-title">
                  {t(I18N_KEYS.result)}
                </div>
                <button
                  type="button"
                  className="tool-call-copy-icon-button"
                  title={
                    copiedOutput ? t(I18N_KEYS.copied) : t(I18N_KEYS.copyOutput)
                  }
                  aria-label={
                    copiedOutput ? t(I18N_KEYS.copied) : t(I18N_KEYS.copyOutput)
                  }
                  {...copyOutputPressProps}
                >
                  {copiedOutput ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="tool-call-json">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
