"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getStorage,
  DEFAULT_XML_VERSION,
  ZERO_SOURCE_VERSION_ID,
} from "@/app/lib/storage";
import {
  getStoredCurrentProjectId,
  persistCurrentProjectId,
} from "@/app/lib/storage/current-project";
import type { Project, CreateXMLVersionInput } from "@/app/lib/storage";

/**
 * 当前工程管理 Hook
 *
 * 功能：
 * - 通过统一存储层读取/写入当前工程 ID（仅统一存储，不再使用 localStorage）
 * - 从统一存储层加载工程信息
 * - 如无工程，自动创建默认工程 "New Project"
 * - 提供工程切换功能
 */
export function useCurrentProject() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 创建默认工程 "New Project"
   */
  const createDefaultProject = useCallback(async (): Promise<Project> => {
    const storage = await getStorage();
    const uuid = `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    const newProject: Project = {
      uuid,
      name: "New Project",
      description: "默认工程",
      created_at: now,
      updated_at: now,
    };

    await storage.createProject(newProject);

    // 创建空白 XML 版本
    const emptyXML = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio2go" agent="DrawIO2Go" version="24.7.17">
  <diagram name="Page-1" id="page1">
    <mxGraphModel dx="1434" dy="844" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

    const xmlVersion: CreateXMLVersionInput = {
      id: uuidv4(),
      project_uuid: uuid,
      semantic_version: DEFAULT_XML_VERSION,
      name: "初始版本",
      description: "默认空白画布",
      source_version_id: ZERO_SOURCE_VERSION_ID,
      xml_content: emptyXML,
      is_keyframe: true,
      diff_chain_depth: 0,
      metadata: null,
    };

    const createdVersion = await storage.createXMLVersion(xmlVersion);

    // 更新工程的激活版本
    await storage.updateProject(uuid, {
      active_xml_version_id: createdVersion.id,
    });

    return newProject;
  }, []);

  /**
   * 加载当前工程
   */
  const loadCurrentProject = useCallback(async () => {
    try {
      setLoading(true);
      const storage = await getStorage();

      // 1. 检查统一存储层中的当前工程 ID
      let projectId = await getStoredCurrentProjectId(storage);

      // 2. 如果没有，检查是否有任何工程
      if (!projectId) {
        const allProjects = await storage.getAllProjects();
        if (allProjects.length === 0) {
          // 3. 没有任何工程，创建默认工程
          const defaultProject = await createDefaultProject();
          projectId = defaultProject.uuid;
          await persistCurrentProjectId(projectId, storage);
          setCurrentProject(defaultProject);
          setLoading(false);
          return defaultProject;
        } else {
          // 4. 有工程，使用第一个
          projectId = allProjects[0].uuid;
          await persistCurrentProjectId(projectId, storage);
        }
      }

      // 5. 加载工程信息
      const project = await storage.getProject(projectId);
      if (!project) {
        // 工程不存在，创建默认工程
        const defaultProject = await createDefaultProject();
        await persistCurrentProjectId(defaultProject.uuid, storage);
        setCurrentProject(defaultProject);
        setLoading(false);
        return defaultProject;
      }

      setCurrentProject(project);
      setLoading(false);
      return project;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setLoading(false);
      throw error;
    }
  }, [createDefaultProject]);

  /**
   * 切换工程
   */
  const switchProject = useCallback(
    async (projectId: string) => {
      try {
        const storage = await getStorage();
        const project = await storage.getProject(projectId);
        if (!project) {
          throw new Error(`工程不存在: ${projectId}`);
        }

        await persistCurrentProjectId(projectId, storage);
        setCurrentProject(project);
        return project;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    [],
  );

  /**
   * 刷新当前工程信息
   */
  const refreshCurrentProject = useCallback(async () => {
    if (!currentProject) return;
    const storage = await getStorage();
    const updated = await storage.getProject(currentProject.uuid);
    if (updated) {
      setCurrentProject(updated);
    }
  }, [currentProject]);

  // 初始化时加载当前工程
  useEffect(() => {
    loadCurrentProject().catch((err) => {
      console.error("Failed to load current project:", err);
    });
  }, [loadCurrentProject]);

  return {
    currentProject,
    loading,
    error,
    switchProject,
    refreshCurrentProject,
    loadCurrentProject,
  };
}
