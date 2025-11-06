# 里程碑 8：LLM 配置数据迁移

**状态**：⏳ 待开始
**预计耗时**：45 分钟
**依赖**：里程碑 2, 3, 4, 5

## 目标
将 LLM 配置和其他 UI 配置从 localStorage 迁移到新的存储抽象层

## 任务清单

### 1. 重构 useLLMConfig Hook
- [ ] 修改 `app/hooks/useLLMConfig.ts`，移除 localStorage 依赖：
  ```typescript
  'use client';

  import { useState, useEffect, useCallback } from 'react';
  import type { LLMConfig } from '@/types/chat';
  import { DEFAULT_LLM_CONFIG, normalizeLLMConfig } from '@/lib/llm-config';
  import { getStorage } from '@/lib/storage';
  import { SETTINGS_KEYS } from '@/lib/storage';

  export function useLLMConfig() {
    const [config, setConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // 初始化：从存储加载配置
    useEffect(() => {
      async function loadConfig() {
        try {
          setIsLoading(true);
          const storage = await getStorage();
          const saved = await storage.get<LLMConfig>(SETTINGS_KEYS.LLM_CONFIG);

          if (saved) {
            const normalized = normalizeLLMConfig(saved);
            setConfig(normalized);
          } else {
            // 首次使用，保存默认配置
            await storage.set(SETTINGS_KEYS.LLM_CONFIG, DEFAULT_LLM_CONFIG);
            setConfig(DEFAULT_LLM_CONFIG);
          }

          setError(null);
        } catch (err) {
          console.error('[useLLMConfig] 加载配置失败:', err);
          setError(err as Error);
          // 使用默认配置
          setConfig(DEFAULT_LLM_CONFIG);
        } finally {
          setIsLoading(false);
        }
      }

      loadConfig();
    }, []);

    // 保存配置
    const saveConfig = useCallback(async (newConfig: LLMConfig) => {
      try {
        const normalized = normalizeLLMConfig(newConfig);
        const storage = await getStorage();
        await storage.set(SETTINGS_KEYS.LLM_CONFIG, normalized);

        setConfig(normalized);
        setError(null);

        console.log('[useLLMConfig] 配置保存成功');
      } catch (err) {
        console.error('[useLLMConfig] 保存配置失败:', err);
        setError(err as Error);
        throw err;
      }
    }, []);

    // 重置配置
    const resetConfig = useCallback(async () => {
      try {
        const storage = await getStorage();
        await storage.set(SETTINGS_KEYS.LLM_CONFIG, DEFAULT_LLM_CONFIG);

        setConfig(DEFAULT_LLM_CONFIG);
        setError(null);

        console.log('[useLLMConfig] 配置已重置');
      } catch (err) {
        console.error('[useLLMConfig] 重置配置失败:', err);
        setError(err as Error);
        throw err;
      }
    }, []);

    return {
      config,
      isLoading,
      error,
      saveConfig,
      resetConfig,
    };
  }
  ```

### 2. 更新 SettingsSidebar 组件
- [ ] 修改 `app/components/SettingsSidebar.tsx`，使用新的 Hook：
  ```typescript
  'use client';

  import { useLLMConfig } from '@/hooks/useLLMConfig';
  import { Spinner, Button } from '@heroui/react';

  export function SettingsSidebar() {
    const { config, isLoading, error, saveConfig, resetConfig } = useLLMConfig();
    const [localConfig, setLocalConfig] = useState(config);

    // 同步配置
    useEffect(() => {
      setLocalConfig(config);
    }, [config]);

    // 加载状态
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" label="加载配置中..." />
        </div>
      );
    }

    // 错误状态
    if (error) {
      return (
        <div className="p-4">
          <p className="text-red-500 mb-4">加载配置失败</p>
          <p className="text-sm text-gray-500">{error.message}</p>
          <Button onClick={resetConfig} className="mt-4">
            重置为默认配置
          </Button>
        </div>
      );
    }

    // 保存处理
    const handleSave = async () => {
      try {
        await saveConfig(localConfig);
        // 显示成功提示
      } catch (err) {
        // 显示错误提示
      }
    };

    return (
      <div className="settings-sidebar">
        {/* 配置表单 */}
        <form>
          {/* API URL */}
          <input
            value={localConfig.apiUrl}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, apiUrl: e.target.value })
            }
          />

          {/* 其他配置项... */}
        </form>

        {/* 保存按钮 */}
        <Button onClick={handleSave}>保存配置</Button>
        <Button onClick={resetConfig} variant="ghost">
          重置
        </Button>
      </div>
    );
  }
  ```

### 3. 创建 useUIConfig Hook
- [ ] 创建 `app/hooks/useUIConfig.ts` 管理 UI 配置：
  ```typescript
  'use client';

  import { useState, useEffect, useCallback } from 'react';
  import { getStorage } from '@/lib/storage';
  import { SETTINGS_KEYS } from '@/lib/storage';

  export interface UIConfig {
    defaultPath: string;
    sidebarWidth: number;
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-CN' | 'en-US';
  }

  const DEFAULT_UI_CONFIG: UIConfig = {
    defaultPath: '',
    sidebarWidth: 300,
    theme: 'auto',
    language: 'zh-CN',
  };

  export function useUIConfig() {
    const [config, setConfig] = useState<UIConfig>(DEFAULT_UI_CONFIG);
    const [isLoading, setIsLoading] = useState(true);

    // 初始化：从存储加载配置
    useEffect(() => {
      async function loadConfig() {
        try {
          setIsLoading(true);
          const storage = await getStorage();

          // 加载各个配置项
          const [defaultPath, sidebarWidth, theme, language] =
            await Promise.all([
              storage.get<string>(SETTINGS_KEYS.DEFAULT_PATH),
              storage.get<number>(SETTINGS_KEYS.SIDEBAR_WIDTH),
              storage.get<'light' | 'dark' | 'auto'>('theme'),
              storage.get<'zh-CN' | 'en-US'>('language'),
            ]);

          setConfig({
            defaultPath: defaultPath || DEFAULT_UI_CONFIG.defaultPath,
            sidebarWidth: sidebarWidth || DEFAULT_UI_CONFIG.sidebarWidth,
            theme: theme || DEFAULT_UI_CONFIG.theme,
            language: language || DEFAULT_UI_CONFIG.language,
          });
        } catch (err) {
          console.error('[useUIConfig] 加载配置失败:', err);
          setConfig(DEFAULT_UI_CONFIG);
        } finally {
          setIsLoading(false);
        }
      }

      loadConfig();
    }, []);

    // 保存单个配置项
    const saveConfigItem = useCallback(
      async <K extends keyof UIConfig>(key: K, value: UIConfig[K]) => {
        try {
          const storage = await getStorage();
          const storageKey =
            key === 'defaultPath'
              ? SETTINGS_KEYS.DEFAULT_PATH
              : key === 'sidebarWidth'
              ? SETTINGS_KEYS.SIDEBAR_WIDTH
              : key;

          await storage.set(storageKey, value);

          setConfig((prev) => ({ ...prev, [key]: value }));

          console.log(`[useUIConfig] ${key} 保存成功`);
        } catch (err) {
          console.error(`[useUIConfig] 保存 ${key} 失败:`, err);
          throw err;
        }
      },
      []
    );

    // 保存所有配置
    const saveConfig = useCallback(async (newConfig: UIConfig) => {
      try {
        const storage = await getStorage();

        await storage.setMany(
          new Map([
            [SETTINGS_KEYS.DEFAULT_PATH, newConfig.defaultPath],
            [SETTINGS_KEYS.SIDEBAR_WIDTH, newConfig.sidebarWidth],
            ['theme', newConfig.theme],
            ['language', newConfig.language],
          ])
        );

        setConfig(newConfig);

        console.log('[useUIConfig] 配置保存成功');
      } catch (err) {
        console.error('[useUIConfig] 保存配置失败:', err);
        throw err;
      }
    }, []);

    return {
      config,
      isLoading,
      saveConfigItem,
      saveConfig,
    };
  }
  ```

### 4. 更新 UnifiedSidebar 组件
- [ ] 修改 `app/components/UnifiedSidebar.tsx`，使用新的 Hook：
  ```typescript
  'use client';

  import { useUIConfig } from '@/hooks/useUIConfig';

  export function UnifiedSidebar() {
    const { config, saveConfigItem } = useUIConfig();
    const [width, setWidth] = useState(config.sidebarWidth);

    // 处理宽度变化
    const handleWidthChange = useCallback(
      async (newWidth: number) => {
        setWidth(newWidth);
        try {
          await saveConfigItem('sidebarWidth', newWidth);
        } catch (err) {
          console.error('保存侧边栏宽度失败:', err);
        }
      },
      [saveConfigItem]
    );

    return (
      <div
        className="unified-sidebar"
        style={{ width: `${width}px` }}
        onResize={(e) => handleWidthChange(e.width)}
      >
        {/* 侧边栏内容 */}
      </div>
    );
  }
  ```

### 5. 实现配置导入导出
- [ ] 添加导出所有配置的功能：
  ```typescript
  export async function exportAllConfig(): Promise<void> {
    const storage = await getStorage();

    // 获取所有配置
    const [llmConfig, uiConfig] = await Promise.all([
      storage.get(SETTINGS_KEYS.LLM_CONFIG),
      storage.getMany([
        SETTINGS_KEYS.DEFAULT_PATH,
        SETTINGS_KEYS.SIDEBAR_WIDTH,
        'theme',
        'language',
      ]),
    ]);

    const allConfig = {
      llm: llmConfig,
      ui: Object.fromEntries(uiConfig),
      exportedAt: Date.now(),
    };

    const jsonData = JSON.stringify(allConfig, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `config-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }
  ```

- [ ] 添加导入配置的功能：
  ```typescript
  export async function importAllConfig(jsonData: string): Promise<void> {
    try {
      const imported = JSON.parse(jsonData);

      if (!imported.llm || !imported.ui) {
        throw new Error('无效的配置文件格式');
      }

      const storage = await getStorage();

      // 保存 LLM 配置
      await storage.set(SETTINGS_KEYS.LLM_CONFIG, imported.llm);

      // 保存 UI 配置
      const uiEntries = new Map(Object.entries(imported.ui));
      await storage.setMany(uiEntries);

      console.log('[Config] 配置导入成功');
    } catch (err) {
      console.error('[Config] 导入配置失败:', err);
      throw err;
    }
  }
  ```

### 6. 实现配置验证
- [ ] 添加配置验证功能：
  ```typescript
  import { z } from 'zod';

  const LLMConfigSchema = z.object({
    apiUrl: z.string().url(),
    apiKey: z.string().min(1),
    temperature: z.number().min(0).max(2),
    modelName: z.string().min(1),
    systemPrompt: z.string(),
    providerType: z.enum(['openai', 'openai-response', 'deepseek', 'anthropic']),
    maxToolRounds: z.number().int().min(1).max(20),
  });

  const UIConfigSchema = z.object({
    defaultPath: z.string(),
    sidebarWidth: z.number().int().min(200).max(800),
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.enum(['zh-CN', 'en-US']),
  });

  export function validateLLMConfig(config: unknown): LLMConfig {
    return LLMConfigSchema.parse(config);
  }

  export function validateUIConfig(config: unknown): UIConfig {
    return UIConfigSchema.parse(config);
  }
  ```

### 7. 添加配置同步功能
- [ ] 实现多窗口配置同步（Web 环境）：
  ```typescript
  export function useConfigSync() {
    useEffect(() => {
      // 监听存储变化事件
      const handleStorageChange = async (event: StorageEvent) => {
        if (event.key === SETTINGS_KEYS.LLM_CONFIG) {
          // 重新加载配置
          const storage = await getStorage();
          const newConfig = await storage.get<LLMConfig>(
            SETTINGS_KEYS.LLM_CONFIG
          );
          if (newConfig) {
            setConfig(newConfig);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }, []);
  }
  ```

## 验收标准
- [ ] LLM 配置成功从存储加载
- [ ] UI 配置成功从存储加载
- [ ] 保存配置正常工作
- [ ] 重置配置正常工作
- [ ] 加载状态和错误状态正确显示
- [ ] 配置导入导出功能正常
- [ ] 配置验证正常工作
- [ ] 多窗口配置同步正常（Web 环境）

## 测试步骤
1. 启动应用并打开设置页面
2. 修改 LLM 配置并保存
3. 刷新页面，验证配置正确加载
4. 修改 UI 配置（侧边栏宽度等）
5. 导出配置为 JSON 文件
6. 重置配置
7. 导入之前导出的配置
8. 打开多个窗口，验证配置同步（Web 环境）

## 性能优化

### 1. 配置缓存
- 配置加载后缓存在内存中
- 避免重复查询存储

### 2. 批量保存
- 使用 `setMany` 批量保存配置
- 减少存储操作次数

### 3. 防抖保存
- UI 配置变化时防抖保存
- 避免频繁写入

## 注意事项
- 配置数据较小，性能不是主要问题
- 重点关注数据验证和错误处理
- 确保默认配置始终可用
- 配置导入时要验证格式

---

**下一步**：完成后继续 [里程碑 9：UI 组件适配](./milestone-9.md)
