"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { getStorage, DEFAULT_PROJECT_UUID } from "@/app/lib/storage";
import type {
  Conversation,
  Message,
  CreateMessageInput,
} from "@/app/lib/storage";
import { runStorageTask } from "@/app/lib/utils";

/**
 * 对话管理 Hook
 *
 * 管理对话和消息的创建、读取、更新、删除
 */
export function useStorageConversations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 创建对话
   *
   * @param title 对话标题
   * @param projectUuid 工程 UUID（默认使用 DEFAULT_PROJECT_UUID）
   * @returns 创建的对话
   */
  const createConversation = useCallback(
    async (
      title: string = "New Chat",
      projectUuid: string = DEFAULT_PROJECT_UUID,
    ): Promise<Conversation> => {
      return runStorageTask(
        async () => {
          const storage = await getStorage();
          const conversation = await storage.createConversation({
            id: uuidv4(),
            project_uuid: projectUuid,
            title,
          });
          return conversation;
        },
        { setLoading, setError },
      );
    },
    [],
  );

  /**
   * 获取对话
   */
  const getConversation = useCallback(
    async (id: string): Promise<Conversation | null> => {
      return runStorageTask(
        async () => {
          const storage = await getStorage();
          const conversation = await storage.getConversation(id);
          return conversation;
        },
        { setLoading, setError },
      );
    },
    [],
  );

  /**
   * 更新对话
   */
  const updateConversation = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Conversation, "title">>,
    ): Promise<void> => {
      await runStorageTask(
        async () => {
          const storage = await getStorage();
          await storage.updateConversation(id, updates);
        },
        { setLoading, setError },
      );
    },
    [],
  );

  /**
   * 删除对话
   */
  const deleteConversation = useCallback(async (id: string): Promise<void> => {
    await runStorageTask(
      async () => {
        const storage = await getStorage();
        await storage.deleteConversation(id);
      },
      { setLoading, setError },
    );
  }, []);

  /**
   * 批量删除对话
   */
  const batchDeleteConversations = useCallback(
    async (ids: string[]): Promise<void> => {
      if (!ids || ids.length === 0) return;
      await runStorageTask(
        async () => {
          const storage = await getStorage();
          await storage.batchDeleteConversations(ids);
        },
        { setLoading, setError },
      );
    },
    [],
  );

  /**
   * 获取所有对话
   *
   * @param projectUuid 工程 UUID（默认使用 DEFAULT_PROJECT_UUID）
   */
  const getAllConversations = useCallback(
    async (
      projectUuid: string = DEFAULT_PROJECT_UUID,
    ): Promise<Conversation[]> => {
      return runStorageTask(
        async () => {
          const storage = await getStorage();
          const conversations =
            await storage.getConversationsByProject(projectUuid);
          return conversations;
        },
        { setLoading, setError },
      );
    },
    [],
  );

  /**
   * 获取对话的所有消息
   */
  const getMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      return runStorageTask(
        async () => {
          const storage = await getStorage();
          const messages =
            await storage.getMessagesByConversation(conversationId);
          return messages;
        },
        { setLoading, setError },
      );
    },
    [],
  );

  /**
   * 添加消息
   */
  const addMessage = useCallback(
    async (
      conversationId: string,
      role: "user" | "assistant" | "system",
      content: string,
      toolInvocations?: unknown,
      modelName?: string | null,
    ): Promise<Message> => {
      return runStorageTask(
        async () => {
          const storage = await getStorage();
          const message = await storage.createMessage({
            id: uuidv4(),
            conversation_id: conversationId,
            role,
            content,
            tool_invocations: toolInvocations
              ? JSON.stringify(toolInvocations)
              : undefined,
            model_name: modelName ?? null,
          });

          return message;
        },
        { setLoading, setError },
      );
    },
    [],
  );

  /**
   * 批量添加消息
   */
  const addMessages = useCallback(
    async (messages: CreateMessageInput[]): Promise<Message[]> => {
      return runStorageTask(
        async () => {
          const storage = await getStorage();
          const created = await storage.createMessages(messages);
          return created;
        },
        { setLoading, setError },
      );
    },
    [],
  );

  /**
   * 导出对话为 JSON Blob
   */
  const exportConversations = useCallback(
    async (ids: string[]): Promise<Blob> => {
      return runStorageTask(
        async () => {
          const storage = await getStorage();
          const blob = await storage.exportConversations(ids);
          return blob;
        },
        { setLoading, setError },
      );
    },
    [],
  );

  return {
    loading,
    error,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    batchDeleteConversations,
    getAllConversations,
    getMessages,
    addMessage,
    addMessages,
    exportConversations,
  };
}
