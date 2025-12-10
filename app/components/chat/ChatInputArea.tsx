"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef } from "react";
import { TextArea } from "@heroui/react";
import {
  type LLMConfig,
  type ModelConfig,
  type ProviderConfig,
} from "@/app/types/chat";
import ChatInputActions from "./ChatInputActions";
import { useAppTranslation } from "@/app/i18n/hooks";

const MIN_BASE_TEXTAREA_HEIGHT = 60;

interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  isChatStreaming: boolean;
  configLoading: boolean;
  llmConfig: LLMConfig | null;
  canSendNewMessage: boolean;
  lastMessageIsUser: boolean;
  isOnline: boolean;
  isSocketConnected: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  onNewChat: () => void;
  onHistory: () => void;
  onRetry: () => void;
  modelSelectorProps: {
    providers: ProviderConfig[];
    models: ModelConfig[];
    selectedModelId: string | null;
    onSelectModel: (modelId: string) => Promise<void> | void;
    isDisabled: boolean;
    isLoading: boolean;
    modelLabel: string;
  };
}

export default function ChatInputArea({
  input,
  setInput,
  isChatStreaming,
  configLoading,
  llmConfig,
  canSendNewMessage,
  lastMessageIsUser,
  isOnline,
  isSocketConnected,
  onSubmit,
  onCancel,
  onNewChat,
  onHistory,
  onRetry,
  modelSelectorProps,
}: ChatInputAreaProps) {
  const { t } = useAppTranslation("chat");
  const textareaContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const baseHeightRef = useRef<number | null>(null);
  const isSendDisabled =
    !input.trim() ||
    isChatStreaming ||
    configLoading ||
    !llmConfig ||
    !canSendNewMessage ||
    !isOnline ||
    !isSocketConnected;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSendDisabled) {
        const formEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(formEvent, "target", {
          value: event.currentTarget.form,
          enumerable: true,
        });
        onSubmit(formEvent as unknown as FormEvent<HTMLFormElement>);
      }
    }
  };

  useEffect(() => {
    const textarea =
      textareaRef.current ??
      textareaContainerRef.current?.querySelector("textarea");
    if (!textarea) return;
    textareaRef.current = textarea;

    // 重置为 auto 以便获取真实 scrollHeight（删除内容时可回落）
    textarea.style.height = "auto";

    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight || "0");
    if (!baseHeightRef.current) {
      const defaultHeight =
        !Number.isNaN(lineHeight) && lineHeight > 0
          ? lineHeight * 3 // 默认 3 行高度
          : Math.max(textarea.scrollHeight, MIN_BASE_TEXTAREA_HEIGHT);
      baseHeightRef.current = Math.max(defaultHeight, MIN_BASE_TEXTAREA_HEIGHT);
    }

    const minHeight = baseHeightRef.current;
    const maxHeight = baseHeightRef.current * 4;
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  return (
    <div className="chat-input-area" ref={textareaContainerRef}>
      <form onSubmit={onSubmit} className="chat-input-container">
        {/* 多行文本输入框 */}
        <TextArea
          placeholder={t("input.placeholder")}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={
            configLoading ||
            !llmConfig ||
            !canSendNewMessage ||
            !isOnline ||
            !isSocketConnected
          }
          onKeyDown={handleKeyDown}
          className="w-full"
          aria-label={t("aria.input")}
        />

        {!isSocketConnected ? (
          <div className="chat-network-status" role="status" aria-live="polite">
            ⚠️ {t("status.socketDisconnected")} ·{" "}
            {t("status.socketRequiredForChat")}
          </div>
        ) : null}

        {isSocketConnected && !isOnline && (
          <div className="chat-network-status" role="status" aria-live="polite">
            ⚠️ {t("status.networkOfflineShort", "网络已断开")} ·{" "}
            {t("status.networkDisconnectedHint")}
          </div>
        )}

        {/* 按钮组 */}
        <ChatInputActions
          isSendDisabled={isSendDisabled}
          isChatStreaming={isChatStreaming}
          canSendNewMessage={canSendNewMessage}
          lastMessageIsUser={lastMessageIsUser}
          isOnline={isOnline}
          isSocketConnected={isSocketConnected}
          onCancel={onCancel}
          onNewChat={onNewChat}
          onHistory={onHistory}
          onRetry={onRetry}
          modelSelectorProps={modelSelectorProps}
        />
      </form>
    </div>
  );
}
