"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Check, Copy } from "lucide-react";

import type { McpClientType } from "@/app/types/mcp";
import { useToast } from "@/app/components/toast";

/**
 * MCP 配置展示组件 Props
 */
export interface McpConfigDisplayProps {
  /**
   * 客户端类型。
   */
  clientType: McpClientType;

  /**
   * MCP Server 监听地址（用于生成配置示例）。
   */
  host: string;

  /**
   * MCP Server 监听端口（用于生成配置示例）。
   */
  port: number;
}

const buildMcpUrl = (host: string, port: number) => `http://${host}:${port}/mcp`;

const toPrettyJson = (value: unknown) => JSON.stringify(value, null, 2);

const buildConfigTemplate = (
  clientType: McpClientType,
  host: string,
  port: number,
): string => {
  const url = buildMcpUrl(host, port);

  // 里程碑 5 尚未实现：此处先提供“可复制”的占位模板，后续再替换为各客户端真实格式。
  switch (clientType) {
    case "cursor":
      return toPrettyJson({
        mcpServers: {
          drawio2go: {
            url,
          },
        },
      });
    case "claude-code":
      return toPrettyJson({
        mcp: {
          servers: [
            {
              name: "drawio2go",
              url,
            },
          ],
        },
      });
    case "codex":
      return toPrettyJson({
        mcp: {
          serverUrl: url,
        },
      });
    case "gemini-cli":
      return toPrettyJson({
        mcpServers: [
          {
            name: "drawio2go",
            url,
          },
        ],
      });
    case "generic":
    default:
      return toPrettyJson({
        name: "drawio2go",
        url,
      });
  }
};

/**
 * MCP 配置展示组件
 *
 * - 根据客户端类型生成配置示例（当前为 JSON 占位模板）
 * - 提供右上角复制按钮，复制后 Toast 提示“配置已复制”
 */
export function McpConfigDisplay({
  clientType,
  host,
  port,
}: McpConfigDisplayProps) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  const configText = useMemo(
    () => buildConfigTemplate(clientType, host, port),
    [clientType, host, port],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(configText);
      setCopied(true);
      push({ variant: "success", description: "配置已复制" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      push({ variant: "danger", description: "复制失败，请手动复制" });
    }
  }, [configText, push]);

  return (
    <div className="rounded-2xl border border-default-200 bg-content1">
      <div className="flex items-center justify-end p-2">
        <Button
          size="sm"
          isIconOnly
          variant="tertiary"
          aria-label={copied ? "已复制" : "复制配置"}
          onPress={handleCopy}
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        </Button>
      </div>

      <pre className="m-0 max-h-96 overflow-auto px-4 pb-4 text-sm text-foreground">
        <code className="language-json">{configText}</code>
      </pre>
    </div>
  );
}

