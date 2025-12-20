"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { McpConfig, McpServerStatus } from "@/app/types/mcp";
import { useOperationToast } from "@/app/hooks/useOperationToast";

/**
 * MCP 服务器状态管理 Hook 返回值。
 */
export interface UseMcpServerResult {
  /**
   * 服务器是否正在运行。
   */
  running: boolean;

  /**
   * 当前绑定的 IP（未运行时为 null）。
   */
  host: string | null;

  /**
   * 当前端口（未运行时为 null）。
   */
  port: number | null;

  /**
   * 是否正在进行操作（start/stop/refresh）。
   */
  isLoading: boolean;

  /**
   * 启动 MCP 服务器。
   */
  startServer: (config: McpConfig) => Promise<void>;

  /**
   * 停止 MCP 服务器。
   */
  stopServer: () => Promise<void>;

  /**
   * 刷新 MCP 服务器状态。
   */
  refreshStatus: () => Promise<void>;
}

const isElectronMcpAvailable = (): boolean =>
  typeof window !== "undefined" && typeof window.electronMcp !== "undefined";

const toNullableHost = (status: McpServerStatus): string | null => {
  const host = status.host;
  return typeof host === "string" && host.trim() ? host : null;
};

const toNullablePort = (status: McpServerStatus): number | null => {
  const port = status.port;
  return typeof port === "number" && Number.isFinite(port) ? port : null;
};

/**
 * MCP 服务器状态管理 Hook。
 *
 * - Electron 环境下通过 `window.electronMcp`（preload.js 注入）控制 MCP 服务
 * - 组件挂载时会自动调用 refreshStatus()
 */
export function useMcpServer(): UseMcpServerResult {
  const { pushErrorToast, showNotice, extractErrorMessage } =
    useOperationToast();

  const [running, setRunning] = useState(false);
  const [host, setHost] = useState<string | null>(null);
  const [port, setPort] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const operationCountRef = useRef(0);
  const beginOperation = useCallback(() => {
    operationCountRef.current += 1;
    setIsLoading(true);
  }, []);

  const endOperation = useCallback(() => {
    operationCountRef.current = Math.max(0, operationCountRef.current - 1);
    if (operationCountRef.current === 0) {
      setIsLoading(false);
    }
  }, []);

  const applyStatus = useCallback((status: McpServerStatus | null) => {
    if (!status) {
      setRunning(false);
      setHost(null);
      setPort(null);
      return;
    }

    setRunning(Boolean(status.running));
    setHost(toNullableHost(status));
    setPort(toNullablePort(status));
  }, []);

  const fetchStatus = useCallback(async (): Promise<McpServerStatus | null> => {
    if (!isElectronMcpAvailable()) return null;
    const status = await window.electronMcp?.getStatus?.();
    return status ?? null;
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!isElectronMcpAvailable()) {
      applyStatus(null);
      return;
    }

    beginOperation();
    try {
      const status = await fetchStatus();
      applyStatus(status);
    } finally {
      endOperation();
    }
  }, [applyStatus, beginOperation, endOperation, fetchStatus]);

  const startServer = useCallback(
    async (config: McpConfig) => {
      if (!isElectronMcpAvailable()) {
        const error = new Error("当前环境不支持 MCP 服务器（仅 Electron 可用）");
        pushErrorToast(error.message);
        throw error;
      }

      beginOperation();
      try {
        await window.electronMcp?.start?.(config);
        showNotice("MCP 服务器已启动", "success");
        const status = await fetchStatus();
        applyStatus(status);
      } catch (error) {
        const message = extractErrorMessage(error) ?? "未知错误";
        pushErrorToast(`MCP 服务器启动失败：${message}`);
        throw error instanceof Error ? error : new Error(message);
      } finally {
        endOperation();
      }
    },
    [
      applyStatus,
      beginOperation,
      endOperation,
      extractErrorMessage,
      fetchStatus,
      pushErrorToast,
      showNotice,
    ],
  );

  const stopServer = useCallback(
    async () => {
      if (!isElectronMcpAvailable()) {
        const error = new Error("当前环境不支持 MCP 服务器（仅 Electron 可用）");
        pushErrorToast(error.message);
        throw error;
      }

      beginOperation();
      try {
        await window.electronMcp?.stop?.();
        showNotice("MCP 服务器已停止", "success");
        const status = await fetchStatus();
        applyStatus(status);
      } catch (error) {
        const message = extractErrorMessage(error) ?? "未知错误";
        pushErrorToast(`MCP 服务器停止失败：${message}`);
        throw error instanceof Error ? error : new Error(message);
      } finally {
        endOperation();
      }
    },
    [
      applyStatus,
      beginOperation,
      endOperation,
      extractErrorMessage,
      fetchStatus,
      pushErrorToast,
      showNotice,
    ],
  );

  useEffect(() => {
    refreshStatus().catch((error) => {
      const message = extractErrorMessage(error) ?? "未知错误";
      pushErrorToast(`刷新 MCP 状态失败：${message}`);
    });
  }, [extractErrorMessage, pushErrorToast, refreshStatus]);

  return {
    running,
    host,
    port,
    isLoading,
    startServer,
    stopServer,
    refreshStatus,
  };
}
