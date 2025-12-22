"use client";

import type { Key } from "react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Description,
  Label,
  ListBox,
  Select,
  Surface,
} from "@heroui/react";
import { XCircle } from "lucide-react";
import { Dialog as AriaDialog, type Selection } from "react-aria-components";

import type { McpClientType } from "@/app/types/mcp";
import { extractSingleKey, normalizeSelection } from "@/app/lib/select-utils";
import { McpConfigDisplay } from "@/app/components/mcp/McpConfigDisplay";
import { useAppTranslation } from "@/app/i18n/hooks";

/**
 * MCP 全屏暴露界面 Props
 */
export interface McpExposureOverlayProps {
  /**
   * 是否打开。
   */
  isOpen: boolean;

  /**
   * 将 Overlay Portal 到指定容器，而不是默认的 document.body。
   *
   * - 用于实现“局部遮罩”（仅覆盖 ChatSidebar 区域）
   */
  portalContainer?: Element | null;

  /**
   * MCP Server 监听地址。
   */
  host: string;

  /**
   * MCP Server 监听端口。
   */
  port: number;

  /**
   * 停止暴露回调。
   */
  onStop: () => void;
}

/**
 * MCP 全屏暴露界面
 *
 * - 使用普通 div + createPortal 实现"局部遮罩"（仅覆盖 ChatSidebar 区域），避免触发全局 inert/focus trap
 * - 提供客户端选择器与配置示例（McpConfigDisplay）
 */
export function McpExposureOverlay({
  isOpen,
  portalContainer,
  host,
  port,
  onStop,
}: McpExposureOverlayProps) {
  const { t } = useAppTranslation("mcp");
  const [clientType, setClientType] = useState<McpClientType>("cursor");

  const CLIENT_OPTIONS: Array<{ id: McpClientType; label: string }> = useMemo(
    () => [
      { id: "cursor", label: t("overlay.client.cursor") },
      { id: "claude-code", label: t("overlay.client.claudeCode") },
      { id: "codex", label: t("overlay.client.codex") },
      { id: "gemini-cli", label: t("overlay.client.geminiCli") },
      { id: "generic", label: t("overlay.client.generic") },
    ],
    [t],
  );

  const statusText = useMemo(
    () => t("overlay.status", { host, port }),
    [t, host, port],
  );

  const handleClientSelectionChange = useCallback(
    (keys: Selection | Key | null) => {
      const selection = normalizeSelection(keys);
      if (!selection || selection === "all") return;
      const key = extractSingleKey(selection);
      if (!key) return;
      const next = CLIENT_OPTIONS.find((opt) => opt.id === key)?.id;
      if (next) setClientType(next);
    },
    [CLIENT_OPTIONS],
  );

  if (!isOpen) return null;
  const resolvedPortalContainer =
    portalContainer ?? (typeof document !== "undefined" ? document.body : null);
  if (!resolvedPortalContainer) return null;

  return createPortal(
    <div
      className="pointer-events-auto absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={(event) => {
        // 避免点击遮罩层时触发 ChatSidebar 外层的点击逻辑（例如某些容器的点击透传）。
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="w-full max-w-3xl">
        <Surface className="w-full rounded-2xl bg-content1 p-5 shadow-2xl outline-none">
          <AriaDialog
            aria-label={t("overlay.title")}
            className="flex max-h-[85vh] flex-col gap-5 overflow-auto"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("overlay.title")}
                </h2>
                <p className="mt-1 truncate text-sm text-default-500">
                  {statusText}
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                aria-label={t("overlay.stopAriaLabel")}
                onPress={onStop}
                className="shrink-0"
              >
                <XCircle size={16} aria-hidden />
                {t("overlay.stop")}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <Select
                  selectedKey={clientType}
                  onSelectionChange={handleClientSelectionChange}
                >
                  <Label>{t("overlay.client.label")}</Label>
                  <Description className="text-default-500">
                    {t("overlay.client.description")}
                  </Description>
                  <Select.Trigger className="mt-2 flex w-full items-center justify-between rounded-md border border-default-200 bg-content1 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 hover:border-primary">
                    <Select.Value className="text-sm leading-6 text-foreground" />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover className="rounded-2xl border border-default-200 bg-content1 p-2 shadow-2xl">
                    <ListBox className="flex flex-col gap-1">
                      {CLIENT_OPTIONS.map((opt) => (
                        <ListBox.Item
                          key={opt.id}
                          id={opt.id}
                          textValue={opt.label}
                          className="select-item flex items-center justify-between rounded-xl px-3 py-2 text-sm text-foreground hover:bg-primary-50"
                        >
                          <span className="font-medium text-foreground">
                            {opt.label}
                          </span>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary-50 px-4 py-3 text-sm text-foreground">
                <span className="font-medium text-primary">
                  {t("overlay.versionHint.title")}
                </span>
                <div className="mt-1 text-default-600">
                  {t("overlay.versionHint.description")}
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <McpConfigDisplay
                clientType={clientType}
                host={host}
                port={port}
              />
            </div>
          </AriaDialog>
        </Surface>
      </div>
    </div>,
    resolvedPortalContainer,
  );
}
