# 里程碑 7：DrawIO 多版本管理实现

**状态**：⏳ 待开始
**预计耗时**：120 分钟
**依赖**：里程碑 2, 3, 4, 5

## 目标
完全重写 DrawIO 图表数据管理系统，实现多版本XML管理、版本切换、历史追溯等功能。当前阶段默认所有操作定向到版本 "1.0.0"，为后续多版本管理UI预留接口

## 任务清单

### 1. 完全重写 drawio-tools.ts - 核心版本管理
- [ ] 重写 `app/lib/drawio-tools.ts`，实现多版本XML管理：
  ```typescript
  import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
  import xpath from 'xpath';
  import { getStorage } from '@/lib/storage';
  import { XML_VERSION_KEYS, TABLE_NAMES } from '@/lib/storage';
  import type { XmlVersionModel } from '@/lib/storage';

  /**
   * 获取当前活动的XML版本号
   */
  export async function getActiveXmlVersion(): Promise<string> {
    try {
      const storage = await getStorage();
      const projectState = await storage.get('project_state:current');

      return projectState?.active_xml_version || XML_VERSION_KEYS.DEFAULT_VERSION;
    } catch (error) {
      console.error('[DrawIO] 获取活动版本失败:', error);
      return XML_VERSION_KEYS.DEFAULT_VERSION;
    }
  }

  /**
   * 设置当前活动的XML版本号
   */
  export async function setActiveXmlVersion(versionId: string): Promise<void> {
    try {
      const storage = await getStorage();

      // 验证版本是否存在
      const version = await storage.get(`xml_version:${versionId}`);
      if (!version) {
        throw new Error(`版本 ${versionId} 不存在`);
      }

      // 更新项目状态
      await storage.set('project_state:current', {
        id: 'current',
        active_xml_version: versionId,
        last_modified: Date.now(),
      });

      console.log(`[DrawIO] 切换到版本 ${versionId}`);
    } catch (error) {
      console.error('[DrawIO] 设置活动版本失败:', error);
      throw error;
    }
  }

  /**
   * 保存 DrawIO XML 到当前活动版本
   */
  export async function saveDrawioXML(xml: string): Promise<void> {
    try {
      const decodedXml = decodeBase64XML(xml);
      const storage = await getStorage();
      const versionId = await getActiveXmlVersion();

      // 获取现有版本数据
      let version = await storage.get<XmlVersionModel>(`xml_version:${versionId}`);

      if (!version) {
        // 如果版本不存在，创建新版本
        version = {
          version_id: versionId,
          xml_content: decodedXml,
          name: '默认版本',
          notes: '自动创建的默认版本',
          created_at: Date.now(),
          updated_at: Date.now(),
        };
      } else {
        // 更新现有版本
        version.xml_content = decodedXml;
        version.updated_at = Date.now();
      }

      // 保存到存储
      await storage.set(`xml_version:${versionId}`, version);

      // 触发更新事件
      triggerUpdateEvent(decodedXml);

      console.log(`[DrawIO] XML 保存到版本 ${versionId} 成功`);
    } catch (error) {
      console.error('[DrawIO] 保存 XML 失败:', error);
      throw error;
    }
  }

  /**
   * 从当前活动版本获取 DrawIO XML
   */
  export async function getDrawioXML(): Promise<GetXMLResult> {
    try {
      const storage = await getStorage();
      const versionId = await getActiveXmlVersion();

      const version = await storage.get<XmlVersionModel>(`xml_version:${versionId}`);

      if (!version || !version.xml_content) {
        return {
          success: false,
          error: `未找到版本 ${versionId} 的图表数据`,
        };
      }

      return {
        success: true,
        xml: version.xml_content,
        version: versionId,
      };
    } catch (error) {
      console.error('[DrawIO] 获取 XML 失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 获取指定版本的 DrawIO XML
   */
  export async function getDrawioXMLByVersion(versionId: string): Promise<GetXMLResult> {
    try {
      const storage = await getStorage();
      const version = await storage.get<XmlVersionModel>(`xml_version:${versionId}`);

      if (!version || !version.xml_content) {
        return {
          success: false,
          error: `未找到版本 ${versionId} 的图表数据`,
        };
      }

      return {
        success: true,
        xml: version.xml_content,
        version: versionId,
      };
    } catch (error) {
      console.error('[DrawIO] 获取版本 XML 失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  // 保留现有的工具函数...
  // decodeBase64XML, triggerUpdateEvent, getSelectedElements 等
  ```

### 2. 添加版本管理功能
- [ ] 在 `app/lib/drawio-tools.ts` 中添加版本管理功能：
  ```typescript
  /**
   * 创建新的XML版本
   */
  export async function createXmlVersion(
    versionId: string,
    name: string,
    xmlContent: string = '',
    notes?: string
  ): Promise<void> {
    try {
      // 验证版本号格式（语义化版本）
      if (!/^\d+\.\d+\.\d+$/.test(versionId)) {
        throw new Error('版本号必须符合语义化版本格式（如 1.0.0）');
      }

      const storage = await getStorage();

      // 检查版本是否已存在
      const existingVersion = await storage.get(`xml_version:${versionId}`);
      if (existingVersion) {
        throw new Error(`版本 ${versionId} 已存在`);
      }

      // 创建新版本
      const newVersion: XmlVersionModel = {
        version_id: versionId,
        xml_content: xmlContent,
        name,
        notes,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await storage.set(`xml_version:${versionId}`, newVersion);

      console.log(`[DrawIO] 创建版本 ${versionId} 成功`);
    } catch (error) {
      console.error('[DrawIO] 创建版本失败:', error);
      throw error;
    }
  }

  /**
   * 删除XML版本
   */
  export async function deleteXmlVersion(versionId: string): Promise<void> {
    try {
      // 禁止删除默认版本
      if (versionId === XML_VERSION_KEYS.DEFAULT_VERSION) {
        throw new Error('无法删除默认版本');
      }

      const storage = await getStorage();

      // 检查是否为当前活动版本
      const activeVersion = await getActiveXmlVersion();
      if (activeVersion === versionId) {
        throw new Error('无法删除当前活动版本，请先切换到其他版本');
      }

      // 删除版本
      await storage.delete(`xml_version:${versionId}`);

      console.log(`[DrawIO] 删除版本 ${versionId} 成功`);
    } catch (error) {
      console.error('[DrawIO] 删除版本失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有XML版本列表
   */
  export async function listXmlVersions(): Promise<XmlVersionModel[]> {
    try {
      const storage = await getStorage();

      const result = await storage.query<XmlVersionModel>({
        table: TABLE_NAMES.XML_VERSIONS,
        orderBy: { field: 'created_at', direction: 'desc' },
      });

      return result.data;
    } catch (error) {
      console.error('[DrawIO] 获取版本列表失败:', error);
      return [];
    }
  }

  /**
   * 更新版本信息（名称和备注）
   */
  export async function updateXmlVersionInfo(
    versionId: string,
    updates: { name?: string; notes?: string }
  ): Promise<void> {
    try {
      const storage = await getStorage();
      const version = await storage.get<XmlVersionModel>(`xml_version:${versionId}`);

      if (!version) {
        throw new Error(`版本 ${versionId} 不存在`);
      }

      if (updates.name !== undefined) {
        version.name = updates.name;
      }
      if (updates.notes !== undefined) {
        version.notes = updates.notes;
      }
      version.updated_at = Date.now();

      await storage.set(`xml_version:${versionId}`, version);

      console.log(`[DrawIO] 更新版本 ${versionId} 信息成功`);
    } catch (error) {
      console.error('[DrawIO] 更新版本信息失败:', error);
      throw error;
    }
  }

  /**
   * 复制版本
   */
  export async function duplicateXmlVersion(
    sourceVersionId: string,
    newVersionId: string,
    newName: string
  ): Promise<void> {
    try {
      const storage = await getStorage();

      // 获取源版本
      const sourceVersion = await storage.get<XmlVersionModel>(`xml_version:${sourceVersionId}`);
      if (!sourceVersion) {
        throw new Error(`源版本 ${sourceVersionId} 不存在`);
      }

      // 创建新版本
      await createXmlVersion(
        newVersionId,
        newName,
        sourceVersion.xml_content,
        `从版本 ${sourceVersionId} 复制`
      );

      console.log(`[DrawIO] 复制版本 ${sourceVersionId} 到 ${newVersionId} 成功`);
    } catch (error) {
      console.error('[DrawIO] 复制版本失败:', error);
      throw error;
    }
  }
  ```

### 3. 创建版本管理 Hook
- [ ] 创建 `app/hooks/useXmlVersion.ts`：
  ```typescript
  'use client';

  import { useState, useEffect, useCallback } from 'react';
  import {
    getActiveXmlVersion,
    setActiveXmlVersion,
    listXmlVersions,
    createXmlVersion,
    deleteXmlVersion,
    getDrawioXML,
    getDrawioXMLByVersion,
  } from '@/lib/drawio-tools';
  import type { XmlVersionModel } from '@/lib/storage';

  export function useXmlVersion() {
    const [activeVersion, setActiveVersionState] = useState<string>('1.0.0');
    const [versions, setVersions] = useState<XmlVersionModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // 加载活动版本和版本列表
    const loadVersions = useCallback(async () => {
      try {
        setIsLoading(true);
        const [currentVersion, versionList] = await Promise.all([
          getActiveXmlVersion(),
          listXmlVersions(),
        ]);

        setActiveVersionState(currentVersion);
        setVersions(versionList);
        setError(null);
      } catch (err) {
        console.error('[useXmlVersion] 加载版本失败:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      loadVersions();
    }, [loadVersions]);

    // 切换活动版本
    const switchVersion = useCallback(async (versionId: string) => {
      try {
        await setActiveXmlVersion(versionId);
        setActiveVersionState(versionId);
        setError(null);
      } catch (err) {
        console.error('[useXmlVersion] 切换版本失败:', err);
        setError(err as Error);
        throw err;
      }
    }, []);

    // 创建新版本
    const createVersion = useCallback(async (
      versionId: string,
      name: string,
      xmlContent?: string,
      notes?: string
    ) => {
      try {
        await createXmlVersion(versionId, name, xmlContent, notes);
        await loadVersions();
        setError(null);
      } catch (err) {
        console.error('[useXmlVersion] 创建版本失败:', err);
        setError(err as Error);
        throw err;
      }
    }, [loadVersions]);

    // 删除版本
    const deleteVersion = useCallback(async (versionId: string) => {
      try {
        await deleteXmlVersion(versionId);
        await loadVersions();
        setError(null);
      } catch (err) {
        console.error('[useXmlVersion] 删除版本失败:', err);
        setError(err as Error);
        throw err;
      }
    }, [loadVersions]);

    // 获取当前版本的XML
    const getCurrentXml = useCallback(async () => {
      const result = await getDrawioXML();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.xml || '';
    }, []);

    // 获取指定版本的XML
    const getVersionXml = useCallback(async (versionId: string) => {
      const result = await getDrawioXMLByVersion(versionId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.xml || '';
    }, []);

    return {
      activeVersion,
      versions,
      isLoading,
      error,
      switchVersion,
      createVersion,
      deleteVersion,
      getCurrentXml,
      getVersionXml,
      reloadVersions: loadVersions,
    };
  }
  ```

### 4. 实现自动保存功能
- [ ] 创建 `app/hooks/useAutoSave.ts`：
  ```typescript
  'use client';

  import { useEffect, useRef } from 'react';

  export function useAutoSave(
    value: string,
    onSave: (value: string) => Promise<void>,
    delay: number = 2000
  ) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousValueRef = useRef<string>(value);

    useEffect(() => {
      // 如果值没有变化，不触发保存
      if (value === previousValueRef.current) {
        return;
      }

      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 设置新的定时器
      timeoutRef.current = setTimeout(async () => {
        try {
          await onSave(value);
          previousValueRef.current = value;
          console.log('[AutoSave] 自动保存成功');
        } catch (error) {
          console.error('[AutoSave] 自动保存失败:', error);
        }
      }, delay);

      // 清理函数
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [value, onSave, delay]);
  }
  ```

- [ ] 在 DrawIO 编辑器中使用自动保存：
  ```typescript
  import { useAutoSave } from '@/hooks/useAutoSave';
  import { useDrawioData } from '@/hooks/useDrawioData';

  export function DrawioEditor() {
    const { saveDiagram } = useDrawioData();
    const [currentXml, setCurrentXml] = useState('');

    // 自动保存（2 秒延迟）
    useAutoSave(currentXml, saveDiagram, 2000);

    // 监听 DrawIO 编辑器的变化
    useEffect(() => {
      const handleXmlChange = (event: CustomEvent) => {
        setCurrentXml(event.detail.xml);
      };

      window.addEventListener('drawio:xmlUpdated', handleXmlChange);

      return () => {
        window.removeEventListener('drawio:xmlUpdated', handleXmlChange);
      };
    }, []);

    return <iframe src="/drawio/index.html" />;
  }
  ```

### 5. 实现从文件导入/导出版本
- [ ] 添加从文件导入XML并创建版本的功能：
  ```typescript
  /**
   * 从文件导入XML并创建新版本
   */
  export async function importXmlFromFile(
    file: File,
    versionId: string,
    name: string
  ): Promise<void> {
    try {
      const xmlContent = await file.text();

      // 验证 XML 格式
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');

      if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('无效的 XML 格式');
      }

      // 创建新版本
      await createXmlVersion(
        versionId,
        name,
        xmlContent,
        `从文件 ${file.name} 导入`
      );

      console.log(`[DrawIO] 从文件导入到版本 ${versionId} 成功`);
    } catch (error) {
      console.error('[DrawIO] 导入文件失败:', error);
      throw error;
    }
  }

  /**
   * 导出指定版本的XML为文件
   */
  export async function exportXmlToFile(versionId: string): Promise<void> {
    try {
      const result = await getDrawioXMLByVersion(versionId);

      if (!result.success || !result.xml) {
        throw new Error(result.error || '未找到版本数据');
      }

      const storage = await getStorage();
      const version = await storage.get<XmlVersionModel>(`xml_version:${versionId}`);

      const blob = new Blob([result.xml], {
        type: 'application/xml',
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${version?.name || 'diagram'}-${versionId}.drawio`;
      a.click();

      URL.revokeObjectURL(url);

      console.log(`[DrawIO] 导出版本 ${versionId} 成功`);
    } catch (error) {
      console.error('[DrawIO] 导出文件失败:', error);
      throw error;
    }
  }
  ```

### 6. 实现localStorage数据迁移
- [ ] 添加数据迁移功能，将现有localStorage的DrawIO数据迁移到版本1.0.0：
  ```typescript
  /**
   * 从localStorage迁移数据到版本1.0.0
   */
  export async function migrateFromLocalStorage(): Promise<void> {
    try {
      const storage = await getStorage();

      // 检查是否已迁移
      const existingVersion = await storage.get<XmlVersionModel>('xml_version:1.0.0');
      if (existingVersion) {
        console.log('[DrawIO] 数据已迁移，跳过');
        return;
      }

      // 从localStorage读取旧数据
      const oldXml = localStorage.getItem('currentDiagram');
      if (!oldXml) {
        console.log('[DrawIO] 没有需要迁移的数据');

        // 创建空的默认版本
        await createXmlVersion(
          '1.0.0',
          '默认版本',
          '',
          '初始化创建的版本'
        );

        // 设置为活动版本
        await storage.set('project_state:current', {
          id: 'current',
          active_xml_version: '1.0.0',
          last_modified: Date.now(),
        });

        return;
      }

      // 解码base64
      const decodedXml = decodeBase64XML(oldXml);

      // 创建版本1.0.0
      await createXmlVersion(
        '1.0.0',
        '默认版本',
        decodedXml,
        '从localStorage迁移的数据'
      );

      // 设置为活动版本
      await storage.set('project_state:current', {
        id: 'current',
        active_xml_version: '1.0.0',
        last_modified: Date.now(),
      });

      // 清除localStorage中的旧数据（可选）
      // localStorage.removeItem('currentDiagram');

      console.log('[DrawIO] 数据迁移成功');
    } catch (error) {
      console.error('[DrawIO] 数据迁移失败:', error);
      throw error;
    }
  }

  /**
   * 应用启动时自动执行迁移
   */
  export async function initializeDrawioStorage(): Promise<void> {
    await migrateFromLocalStorage();
  }
  ```

### 7. 更新聊天会话集成
- [ ] 修改聊天会话创建逻辑，记录XML版本：
  ```typescript
  // 在 useChatSessions.ts 中更新创建会话的逻辑
  import { getActiveXmlVersion } from '@/lib/drawio-tools';

  export async function createNewChatSession(title: string): Promise<ChatSessionModel> {
    const storage = await getStorage();
    const xmlVersion = await getActiveXmlVersion();

    const newSession: ChatSessionModel = {
      id: crypto.randomUUID(),
      title,
      xml_version: xmlVersion,  // 记录创建时的XML版本
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await storage.set(`chat_session:${newSession.id}`, newSession);

    return newSession;
  }
  ```

## 验收标准
- [ ] 默认版本 "1.0.0" 自动创建并设置为活动版本
- [ ] localStorage 数据成功迁移到版本 "1.0.0"
- [ ] 能够创建、删除、切换XML版本
- [ ] 版本号验证（语义化版本格式）正常工作
- [ ] 无法删除默认版本和当前活动版本
- [ ] 能够获取版本列表并正确排序
- [ ] 图表XML保存到当前活动版本成功
- [ ] 能够从指定版本加载XML
- [ ] 自动保存功能正常（2 秒延迟）
- [ ] 版本导入导出功能正常
- [ ] 版本复制功能正常
- [ ] 聊天会话创建时正确记录XML版本
- [ ] 支持大型XML数据（> 10MB）

## 测试步骤

### 基础功能测试
1. 启动应用，验证版本 "1.0.0" 自动创建
2. 检查localStorage数据是否成功迁移
3. 创建一个简单的图表并编辑
4. 等待 2 秒，验证自动保存到版本 "1.0.0"
5. 刷新页面，验证图表正确从版本 "1.0.0" 加载

### 版本管理测试
6. 创建新版本 "1.1.0"，验证版本号格式验证
7. 切换到版本 "1.1.0"，验证编辑器加载空白图表
8. 在版本 "1.1.0" 中创建不同的图表内容
9. 切换回版本 "1.0.0"，验证显示原始内容
10. 获取版本列表，验证所有版本都存在
11. 尝试删除当前活动版本，验证被拒绝
12. 切换到其他版本后删除版本 "1.1.0"，验证成功

### 导入导出测试
13. 导出版本 "1.0.0" 为文件
14. 创建版本 "2.0.0"，从文件导入
15. 验证导入的内容与原版本一致

### 复制功能测试
16. 复制版本 "1.0.0" 为版本 "1.0.1"
17. 验证两个版本内容一致但独立

### 聊天集成测试
18. 创建新的聊天会话
19. 验证会话记录了当前活动的XML版本
20. 切换版本后创建新会话，验证记录了新版本

### 性能测试
21. 创建大型图表（> 10MB）
22. 验证保存和加载性能
23. 测试在多个版本间切换的性能

## 设计要点

### 1. 版本隔离
- 每个版本的XML数据完全独立
- 版本间切换不影响各自的内容
- 当前未实现版本UI，所有操作通过代码

### 2. 默认行为
- 所有DrawIO操作定向到当前活动版本
- 首次启动自动创建版本 "1.0.0"
- localStorage数据自动迁移到版本 "1.0.0"

### 3. 数据安全
- 禁止删除默认版本 "1.0.0"
- 禁止删除当前活动版本
- 版本切换前验证版本存在性

### 4. 扩展性
- 为后续版本管理UI预留完整接口
- 支持版本元数据（名称、备注）管理
- 支持版本复制和导入导出

## 注意事项
- DrawIO XML 可能很大（> 10MB），需要测试性能
- 自动保存要防抖，避免频繁写入
- 版本号必须符合语义化版本格式（如 1.0.0）
- 当前阶段所有操作默认定向到版本 "1.0.0"
- 聊天会话与XML版本关联，支持历史追溯
- localStorage数据迁移只执行一次
- 错误处理要完善，避免数据丢失

---

**下一步**：完成后继续 [里程碑 8：LLM 配置数据迁移](./milestone-8.md)
