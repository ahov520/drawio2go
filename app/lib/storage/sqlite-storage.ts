import type { StorageAdapter } from "./adapter";
import type {
  Setting,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  XMLVersion,
  CreateXMLVersionInput,
  Conversation,
  CreateConversationInput,
  UpdateConversationInput,
  Message,
  CreateMessageInput,
} from "./types";

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("[SQLiteStorage] Failed to parse metadata", error);
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizePreview(
  preview: Blob | Buffer | ArrayBuffer | null | undefined,
): Blob | undefined {
  if (!preview) return undefined;
  if (preview instanceof Blob) return preview;
  const buffer = preview as ArrayBuffer;
  return new Blob([buffer]);
}

/**
 * SQLite 存储实现（Electron 环境）
 * 通过 IPC 调用主进程的 SQLiteManager
 */
export class SQLiteStorage implements StorageAdapter {
  private async ensureElectron() {
    if (!window.electronStorage) {
      throw new Error(
        "electronStorage is not available. Not in Electron environment.",
      );
    }
  }

  private normalizeVersion(
    version:
      | (XMLVersion & { metadata?: unknown; preview_image?: unknown })
      | null,
  ): XMLVersion | null {
    if (!version) return null;
    return {
      ...version,
      metadata: parseMetadata((version as { metadata?: unknown }).metadata),
      preview_image: normalizePreview(
        (version as { preview_image?: Blob | Buffer | ArrayBuffer | null })
          .preview_image,
      ),
    };
  }

  async initialize(): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.initialize();
  }

  // ==================== Settings ====================

  async getSetting(key: string): Promise<string | null> {
    await this.ensureElectron();
    return window.electronStorage!.getSetting(key);
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.setSetting(key, value);
  }

  async deleteSetting(key: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteSetting(key);
  }

  async getAllSettings(): Promise<Setting[]> {
    await this.ensureElectron();
    return window.electronStorage!.getAllSettings();
  }

  // ==================== Projects ====================

  async getProject(uuid: string): Promise<Project | null> {
    await this.ensureElectron();
    return window.electronStorage!.getProject(uuid);
  }

  async createProject(project: CreateProjectInput): Promise<Project> {
    await this.ensureElectron();
    return window.electronStorage!.createProject(project);
  }

  async updateProject(
    uuid: string,
    updates: UpdateProjectInput,
  ): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.updateProject(uuid, updates);
  }

  async deleteProject(uuid: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteProject(uuid);
  }

  async getAllProjects(): Promise<Project[]> {
    await this.ensureElectron();
    return window.electronStorage!.getAllProjects();
  }

  // ==================== XMLVersions ====================

  async getXMLVersion(id: string): Promise<XMLVersion | null> {
    await this.ensureElectron();
    const result = await window.electronStorage!.getXMLVersion(id);
    return this.normalizeVersion(result);
  }

  async createXMLVersion(version: CreateXMLVersionInput): Promise<XMLVersion> {
    await this.ensureElectron();
    // Blob → ArrayBuffer 转换
    const versionToCreate: CreateXMLVersionInput = { ...version };
    if (version.preview_image instanceof Blob) {
      versionToCreate.preview_image =
        (await version.preview_image.arrayBuffer()) as unknown as Blob;
    }
    const result =
      await window.electronStorage!.createXMLVersion(versionToCreate);
    return this.normalizeVersion(result)!;
  }

  async getXMLVersionsByProject(projectUuid: string): Promise<XMLVersion[]> {
    await this.ensureElectron();
    const results =
      await window.electronStorage!.getXMLVersionsByProject(projectUuid);
    return results
      .map((version) => this.normalizeVersion(version))
      .filter((v): v is XMLVersion => !!v);
  }

  async updateXMLVersion(
    id: string,
    updates: Partial<Omit<XMLVersion, "id" | "created_at">>,
  ): Promise<void> {
    await this.ensureElectron();
    // Blob → ArrayBuffer 转换（如果有 preview_image）
    const updatesToSend = { ...updates };
    if (updates.preview_image instanceof Blob) {
      updatesToSend.preview_image =
        (await updates.preview_image.arrayBuffer()) as unknown as Blob;
    }
    await window.electronStorage!.updateXMLVersion(id, updatesToSend);
  }

  async deleteXMLVersion(id: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteXMLVersion(id);
  }

  // ==================== Conversations ====================

  async getConversation(id: string): Promise<Conversation | null> {
    await this.ensureElectron();
    return window.electronStorage!.getConversation(id);
  }

  async createConversation(
    conversation: CreateConversationInput,
  ): Promise<Conversation> {
    await this.ensureElectron();
    return window.electronStorage!.createConversation(conversation);
  }

  async updateConversation(
    id: string,
    updates: UpdateConversationInput,
  ): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.updateConversation(id, updates);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteConversation(id);
  }

  async getConversationsByProject(
    projectUuid: string,
  ): Promise<Conversation[]> {
    await this.ensureElectron();
    return window.electronStorage!.getConversationsByProject(projectUuid);
  }

  async getConversationsByXMLVersion(
    xmlVersionId: string,
  ): Promise<Conversation[]> {
    await this.ensureElectron();
    return window.electronStorage!.getConversationsByXMLVersion(xmlVersionId);
  }

  // ==================== Messages ====================

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    await this.ensureElectron();
    return window.electronStorage!.getMessagesByConversation(conversationId);
  }

  async createMessage(message: CreateMessageInput): Promise<Message> {
    await this.ensureElectron();
    return window.electronStorage!.createMessage(message);
  }

  async deleteMessage(id: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteMessage(id);
  }

  async createMessages(messages: CreateMessageInput[]): Promise<Message[]> {
    await this.ensureElectron();
    return window.electronStorage!.createMessages(messages);
  }
}
