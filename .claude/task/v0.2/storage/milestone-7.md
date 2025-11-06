# 里程碑 7：DrawIO 数据迁移

**状态**：⏳ 待开始
**预计耗时**：60 分钟
**依赖**：里程碑 2, 3, 4, 5

## 目标
将 DrawIO 图表数据存储从 localStorage 迁移到新的存储抽象层，支持大型图表和实时保存

## 任务清单

### 1. 重构 drawio-tools.ts
- [ ] 修改 `app/lib/drawio-tools.ts`，移除 localStorage 依赖：
  ```typescript
  import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
  import xpath from 'xpath';
  import { getStorage } from '@/lib/storage';
  import { DIAGRAM_KEYS } from '@/lib/storage';

  // 移除旧的 STORAGE_KEY 常量
  // const STORAGE_KEY = "currentDiagram";

  /**
   * 保存 DrawIO XML 到存储
   */
  export async function saveDrawioXML(xml: string): Promise<void> {
    try {
      const decodedXml = decodeBase64XML(xml);
      const storage = await getStorage();

      // 保存到存储
      await storage.saveDiagram(DIAGRAM_KEYS.CURRENT, decodedXml);

      // 触发更新事件（保持现有功能）
      triggerUpdateEvent(decodedXml);

      console.log('[DrawIO] XML 保存成功');
    } catch (error) {
      console.error('[DrawIO] 保存 XML 失败:', error);
      throw error;
    }
  }

  /**
   * 从存储获取 DrawIO XML
   */
  export async function getDrawioXML(): Promise<GetXMLResult> {
    try {
      const storage = await getStorage();
      const diagram = await storage.getDiagram(DIAGRAM_KEYS.CURRENT);

      if (!diagram || !diagram.xml_content) {
        return {
          success: false,
          error: '未找到图表数据',
        };
      }

      return {
        success: true,
        xml: diagram.xml_content,
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
   * 清空当前图表
   */
  export async function clearDrawioXML(): Promise<void> {
    try {
      const storage = await getStorage();
      await storage.delete(DIAGRAM_KEYS.CURRENT);

      // 触发更新事件
      triggerUpdateEvent('');

      console.log('[DrawIO] 图表已清空');
    } catch (error) {
      console.error('[DrawIO] 清空图表失败:', error);
      throw error;
    }
  }

  // 保留现有的其他函数...
  // decodeBase64XML, triggerUpdateEvent, getSelectedElements 等
  ```

### 2. 创建 useDrawioData Hook
- [ ] 创建 `app/hooks/useDrawioData.ts`：
  ```typescript
  'use client';

  import { useState, useEffect, useCallback } from 'react';
  import { getDrawioXML, saveDrawioXML, clearDrawioXML } from '@/lib/drawio-tools';

  export function useDrawioData() {
    const [xml, setXml] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // 初始化：从存储加载图表
    useEffect(() => {
      async function loadDiagram() {
        try {
          setIsLoading(true);
          const result = await getDrawioXML();

          if (result.success && result.xml) {
            setXml(result.xml);
            setError(null);
          } else {
            setXml('');
            setError(new Error(result.error || '加载图表失败'));
          }
        } catch (err) {
          console.error('[useDrawioData] 加载图表失败:', err);
          setError(err as Error);
        } finally {
          setIsLoading(false);
        }
      }

      loadDiagram();
    }, []);

    // 保存图表
    const saveDiagram = useCallback(async (newXml: string) => {
      try {
        await saveDrawioXML(newXml);
        setXml(newXml);
        setLastSaved(new Date());
        setError(null);
      } catch (err) {
        console.error('[useDrawioData] 保存图表失败:', err);
        setError(err as Error);
        throw err;
      }
    }, []);

    // 清空图表
    const clearDiagram = useCallback(async () => {
      try {
        await clearDrawioXML();
        setXml('');
        setLastSaved(null);
        setError(null);
      } catch (err) {
        console.error('[useDrawioData] 清空图表失败:', err);
        setError(err as Error);
        throw err;
      }
    }, []);

    return {
      xml,
      isLoading,
      error,
      lastSaved,
      saveDiagram,
      clearDiagram,
    };
  }
  ```

### 3. 更新主页面组件
- [ ] 修改 `app/page.tsx`，使用新的 Hook：
  ```typescript
  'use client';

  import { useDrawioData } from '@/hooks/useDrawioData';
  import { Spinner } from '@heroui/react';

  export default function Home() {
    const { xml, isLoading, error, lastSaved } = useDrawioData();

    // 加载状态
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <Spinner size="lg" label="加载图表中..." />
        </div>
      );
    }

    // 错误状态
    if (error) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-4">加载图表失败</p>
            <p className="text-sm text-gray-500">{error.message}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen">
        {/* DrawIO 编辑器 */}
        <DrawioEditor initialXml={xml} />

        {/* 显示最后保存时间 */}
        {lastSaved && (
          <div className="absolute bottom-4 right-4 text-xs text-gray-500">
            最后保存: {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>
    );
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

### 5. 实现图表版本历史
- [ ] 添加图表版本历史功能：
  ```typescript
  // 在 storage/schema.ts 中添加版本历史表
  CREATE TABLE IF NOT EXISTS diagram_history (
    id TEXT PRIMARY KEY,
    diagram_id TEXT NOT NULL,
    xml_content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_history_diagram_id
    ON diagram_history(diagram_id);
  CREATE INDEX IF NOT EXISTS idx_history_created_at
    ON diagram_history(created_at DESC);
  ```

- [ ] 实现保存历史版本：
  ```typescript
  export async function saveDiagramWithHistory(
    id: string,
    xmlContent: string
  ): Promise<void> {
    const storage = await getStorage();

    // 保存当前版本
    await storage.saveDiagram(id, xmlContent);

    // 保存历史版本
    const historyId = `${id}-${Date.now()}`;
    await storage.set(`diagram_history:${historyId}`, {
      diagram_id: id,
      xml_content: xmlContent,
      created_at: Date.now(),
    });
  }
  ```

- [ ] 实现获取历史版本：
  ```typescript
  export async function getDiagramHistory(
    diagramId: string,
    limit: number = 10
  ): Promise<Array<{ id: string; created_at: number }>> {
    const storage = await getStorage();

    const result = await storage.query({
      table: 'diagram_history',
      where: { diagram_id: diagramId },
      orderBy: { field: 'created_at', direction: 'desc' },
      limit,
    });

    return result.data;
  }
  ```

### 6. 实现图表导入导出
- [ ] 添加导出图表为文件的功能：
  ```typescript
  export async function exportDiagram(id: string): Promise<void> {
    const storage = await getStorage();
    const diagram = await storage.getDiagram(id);

    if (!diagram) {
      throw new Error('图表不存在');
    }

    const blob = new Blob([diagram.xml_content], {
      type: 'application/xml',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${id}-${Date.now()}.drawio`;
    a.click();

    URL.revokeObjectURL(url);
  }
  ```

- [ ] 添加从文件导入图表的功能：
  ```typescript
  export async function importDiagram(file: File): Promise<void> {
    const xmlContent = await file.text();

    // 验证 XML 格式
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');

      if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('无效的 XML 格式');
      }
    } catch (error) {
      throw new Error('导入失败: 无效的图表文件');
    }

    // 保存到存储
    await saveDrawioXML(xmlContent);
  }
  ```

### 7. 添加图表大小监控
- [ ] 实现图表大小监控和警告：
  ```typescript
  export function getXmlSize(xml: string): number {
    return new Blob([xml]).size;
  }

  export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  export async function checkDiagramSize(): Promise<{
    size: number;
    formatted: string;
    warning: boolean;
  }> {
    const result = await getDrawioXML();

    if (!result.success || !result.xml) {
      return { size: 0, formatted: '0 B', warning: false };
    }

    const size = getXmlSize(result.xml);
    const formatted = formatSize(size);
    const warning = size > 5 * 1024 * 1024; // 超过 5MB 警告

    return { size, formatted, warning };
  }
  ```

## 验收标准
- [ ] 图表数据成功从存储加载
- [ ] 保存和清空图表正常工作
- [ ] 自动保存功能正常（2 秒延迟）
- [ ] 加载状态和错误状态正确显示
- [ ] 支持大型图表（> 10MB）
- [ ] 图表导入导出功能正常
- [ ] 版本历史功能正常（可选）
- [ ] 图表大小监控正常

## 测试步骤
1. 启动应用并打开 DrawIO 编辑器
2. 创建一个简单的图表
3. 等待 2 秒，验证自动保存
4. 刷新页面，验证图表正确加载
5. 创建一个大型图表（> 10MB）
6. 验证保存和加载性能
7. 导出图表为文件
8. 清空图表后导入文件
9. 查看版本历史（如果实现）

## 性能优化

### 1. 增量保存
- 只保存变化的部分
- 使用 diff 算法减少存储量

### 2. 压缩存储
- 使用 gzip 压缩 XML
- 减少存储空间占用

### 3. 延迟加载
- 大型图表分块加载
- 提升初始加载速度

## 注意事项
- DrawIO XML 可能很大（> 10MB），需要测试性能
- 自动保存要防抖，避免频繁写入
- 错误处理要完善，避免图表丢失
- 考虑添加本地备份机制

---

**下一步**：完成后继续 [里程碑 8：LLM 配置数据迁移](./milestone-8.md)
