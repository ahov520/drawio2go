/**
 * DrawIO Socket.IO Hook
 *
 * 用于在前端建立 Socket.IO 连接，监听后端的工具调用请求并执行
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { DrawioEditorRef } from "@/app/components/DrawioEditorNative";
import { io, Socket } from "socket.io-client";
import type {
  ToolCallRequest,
  ToolCallResult,
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/app/types/socket-protocol";
import { getDrawioXML, replaceDrawioXML } from "@/app/lib/drawio-tools";
import { useStorageXMLVersions } from "./useStorageXMLVersions";
import { useCurrentProject } from "./useCurrentProject";
import { useStorageSettings } from "./useStorageSettings";
import {
  getNextSubVersion,
  getParentVersion,
  isSubVersion,
  parseVersion,
} from "@/lib/version-utils";
import { DEFAULT_FIRST_VERSION, WIP_VERSION } from "@/app/lib/storage";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Socket Client");

/**
 * DrawIO Socket.IO Hook
 *
 * @param editorRef 可选 DrawIO 编辑器引用，供自动版本快照导出 XML/SVG
 * @returns { isConnected: boolean } - Socket.IO 连接状态
 */
export function useDrawioSocket(
  editorRef?: React.RefObject<DrawioEditorRef | null>,
) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const { createHistoricalVersion, getAllXMLVersions } =
    useStorageXMLVersions();
  const { currentProject } = useCurrentProject();
  const { getSetting } = useStorageSettings();
  const currentProjectRef = useRef(currentProject);
  const cachedProjectUuidRef = useRef<string | null>(null);
  const latestMainVersionRef = useRef<string | null>(null);
  const latestSubVersionRef = useRef<string | null>(null);
  const isCreatingSnapshotRef = useRef(false);

  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    const projectId = currentProject?.uuid ?? null;
    if (cachedProjectUuidRef.current !== projectId) {
      cachedProjectUuidRef.current = projectId;
      latestMainVersionRef.current = null;
      latestSubVersionRef.current = null;
    }
  }, [currentProject]);

  useEffect(() => {
    const getLastSubNumber = (version: string | null): number | null => {
      if (!version) return null;
      try {
        const parsed = parseVersion(version);
        return typeof parsed.sub === "number" ? parsed.sub : null;
      } catch {
        return null;
      }
    };

    const seedVersionCache = async (projectId: string) => {
      if (latestMainVersionRef.current) return;
      const versions = await getAllXMLVersions(projectId);
      const mainVersions = versions.filter(
        (version) =>
          !isSubVersion(version.semantic_version) &&
          version.semantic_version !== WIP_VERSION,
      );

      const latestMain = mainVersions[0]?.semantic_version ?? null;
      latestMainVersionRef.current = latestMain;

      if (!latestMain) {
        latestSubVersionRef.current = null;
        return;
      }

      try {
        const nextSubVersion = getNextSubVersion(versions, latestMain);
        const parsedNext = parseVersion(nextSubVersion);
        const lastSub = (parsedNext.sub ?? 1) - 1;
        latestSubVersionRef.current =
          lastSub > 0 ? `${latestMain}.${lastSub}` : null;
      } catch (error) {
        logger.debug("初始化子版本缓存失败，使用默认子版本起点", {
          projectId,
          parentVersion: latestMain,
          error,
        });
        latestSubVersionRef.current = null;
      }
    };

    const getNextSubVersionIncremental = (parentVersion: string) => {
      const lastSub = latestSubVersionRef.current;
      if (lastSub && getParentVersion(lastSub) === parentVersion) {
        const subNumber = getLastSubNumber(lastSub) ?? 0;
        return `${parentVersion}.${subNumber + 1}`;
      }
      return `${parentVersion}.1`;
    };

    const resetVersionCache = () => {
      latestMainVersionRef.current = null;
      latestSubVersionRef.current = null;
    };

    const handleAutoVersionSnapshot = async (
      request: ToolCallRequest,
      originalToolName?: string,
    ) => {
      try {
        const autoVersionEnabled =
          (await getSetting("autoVersionOnAIEdit")) !== "false";
        const project = currentProjectRef.current;

        if (!autoVersionEnabled || !project?.uuid) {
          return;
        }

        if (isCreatingSnapshotRef.current) {
          logger.debug("已有快照任务进行中，跳过本次自动快照", {
            requestId: request.requestId,
            projectId: project.uuid,
          });
          return;
        }

        isCreatingSnapshotRef.current = true;

        if (cachedProjectUuidRef.current !== project.uuid) {
          cachedProjectUuidRef.current = project.uuid;
          resetVersionCache();
        }

        await seedVersionCache(project.uuid);

        const timestamp = new Date().toLocaleString("zh-CN");
        const aiDescription = request.description || "AI 自动编辑";
        const sourceDescription = originalToolName ?? request.toolName;
        const versionDescription = `${sourceDescription} - ${aiDescription} (${timestamp})`;

        let latestMainVersion = latestMainVersionRef.current;

        // 没有主版本时，先创建首个主版本（关键帧），再创建子版本
        if (!latestMainVersion) {
          logger.info("未检测到主版本，正在创建首个主版本", {
            projectId: project?.uuid,
            version: DEFAULT_FIRST_VERSION,
          });

          await createHistoricalVersion(
            project.uuid,
            DEFAULT_FIRST_VERSION,
            "AI 自动创建的首个主版本",
            editorRef,
            { onExportProgress: undefined },
          );

          latestMainVersion = DEFAULT_FIRST_VERSION;
          latestMainVersionRef.current = DEFAULT_FIRST_VERSION;
          logger.info("首个主版本创建成功，准备创建子版本", {
            projectId: project?.uuid,
            parentVersion: latestMainVersion,
          });
        }

        // 确保父版本实体存在
        if (!latestMainVersion) {
          throw new Error(
            "[自动版本] 找不到可用的父版本，无法生成子版本。请刷新版本列表或重试。",
          );
        }

        const nextSubVersion = getNextSubVersionIncremental(latestMainVersion);

        logger.info("准备创建子版本", {
          projectId: project?.uuid,
          parentVersion: latestMainVersion,
          nextVersion: nextSubVersion,
          requestId: request.requestId,
        });

        await createHistoricalVersion(
          project.uuid,
          nextSubVersion,
          versionDescription,
          editorRef,
          { onExportProgress: undefined },
        );

        logger.info("已创建版本快照", {
          projectId: project?.uuid,
          version: nextSubVersion,
          requestId: request.requestId,
        });

        latestMainVersionRef.current = latestMainVersion;
        latestSubVersionRef.current = nextSubVersion;
      } catch (error) {
        logger.error("自动版本创建失败", {
          projectId: currentProjectRef.current?.uuid,
          error,
        });
        resetVersionCache();
      } finally {
        isCreatingSnapshotRef.current = false;
      }
    };

    // 创建 Socket.IO 客户端
    const socket = io({
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // 连接事件
    socket.on("connect", () => {
      logger.info("Socket 已连接到服务器", { socketId: socket.id });
      setIsConnected(true);
    });

    socket.on("disconnect", (reason: string) => {
      logger.warn("Socket 已断开连接", { reason, socketId: socket.id });
      setIsConnected(false);
    });

    socket.on("connect_error", (error: Error) => {
      logger.error("Socket 连接错误", { error: error.message });
      setIsConnected(false);
    });

    // 监听工具执行请求
    socket.on("tool:execute", async (request: ToolCallRequest) => {
      logger.debug("收到工具调用请求", {
        toolName: request.toolName,
        requestId: request.requestId,
        projectId: currentProjectRef.current?.uuid,
      });

      try {
        const originalTool =
          ((request.input as { _originalTool?: string } | undefined)
            ?._originalTool ??
            request._originalTool) ||
          undefined;

        if (
          request.toolName === "replace_drawio_xml" &&
          (originalTool === "drawio_overwrite" ||
            originalTool === "drawio_edit_batch")
        ) {
          await handleAutoVersionSnapshot(request, originalTool);
        }

        let result: {
          success: boolean;
          error?: string;
          message?: string;
          xml?: string;
        };

        // 根据工具名称执行相应函数
        switch (request.toolName) {
          case "get_drawio_xml":
            result = (await getDrawioXML()) as unknown as {
              success: boolean;
              error?: string;
              message?: string;
              [key: string]: unknown;
            };
            break;

          case "replace_drawio_xml":
            if (!request.input?.drawio_xml) {
              throw new Error("缺少 drawio_xml 参数");
            }
            result = await replaceDrawioXML(request.input.drawio_xml as string);
            // 事件派发已在 replaceDrawioXML 内部处理，这里避免重复派发
            break;

          default:
            throw new Error(`未知工具: ${request.toolName}`);
        }

        // 返回成功结果
        const response: ToolCallResult = {
          requestId: request.requestId,
          success: result.success,
          result: result,
          error: result.success ? undefined : result.error || result.message,
        };

        socket.emit("tool:result", response);
        logger.debug("已返回工具执行结果", {
          toolName: request.toolName,
          success: result.success,
          requestId: request.requestId,
        });
      } catch (error) {
        // 返回错误结果
        const response: ToolCallResult = {
          requestId: request.requestId,
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };

        socket.emit("tool:result", response);
        logger.error("工具执行失败", {
          toolName: request.toolName,
          requestId: request.requestId,
          error,
        });
      }
    });

    // 清理函数
    return () => {
      logger.info("Socket 客户端清理，断开连接");
      socket.disconnect();
    };
  }, [createHistoricalVersion, getAllXMLVersions, getSetting, editorRef]);

  return { isConnected };
}
