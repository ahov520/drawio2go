"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@heroui/react";
import {
  type ActiveModelReference,
  type AgentSettings,
  type ModelConfig,
  type ProviderConfig,
} from "@/app/types/chat";
import { DEFAULT_AGENT_SETTINGS } from "@/app/lib/config-utils";
import { debounce } from "@/app/lib/utils";
import { useStorageSettings } from "@/app/hooks/useStorageSettings";
import SettingsNav, { type SettingsTab } from "./settings/SettingsNav";
import ModelsSettingsPanel from "./settings/ModelsSettingsPanel";
import { VersionSettingsPanel } from "./settings/VersionSettingsPanel";
import {
  AgentSettingsPanel,
  isSystemPromptValid,
  GeneralSettingsPanel,
} from "@/app/components/settings";
import { useAppTranslation } from "@/app/i18n/hooks";
import { useToast } from "@/app/components/toast";
import { createLogger } from "@/lib/logger";
import { subscribeSidebarNavigate } from "@/app/lib/ui-events";

const logger = createLogger("SettingsSidebar");

type SaveStatus = "idle" | "saving" | "saved" | "failed";

type FailedSave =
  | { kind: "defaultPath"; value: string }
  | { kind: "agentSettings"; value: AgentSettings }
  | { kind: "versionSettings"; value: { autoVersionOnAIEdit: boolean } };

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: { defaultPath: string }) => void;
}

export default function SettingsSidebar({
  onSettingsChange,
}: SettingsSidebarProps) {
  const { t } = useAppTranslation("settings");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const {
    getProviders,
    getModels,
    getAgentSettings,
    saveAgentSettings,
    getActiveModel,
    getDefaultPath,
    saveDefaultPath,
    getSetting,
    setSetting,
  } = useStorageSettings();

  const [defaultPath, setDefaultPath] = useState("");

  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(
    DEFAULT_AGENT_SETTINGS,
  );
  const [activeModel, setActiveModelState] =
    useState<ActiveModelReference | null>(null);

  const [versionSettings, setVersionSettings] = useState({
    autoVersionOnAIEdit: true,
  });

  const { push } = useToast();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [failedSave, setFailedSave] = useState<FailedSave | null>(null);

  const showToast = useCallback(
    (params: Parameters<typeof push>[0]) => {
      push(params);
    },
    [push],
  );

  const isMountedRef = useRef(false);
  const inFlightSavesRef = useRef(0);
  const hasFailureRef = useRef(false);
  const hideSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDefaultPathNowRef = useRef<(path: string) => Promise<void>>(
    async () => {},
  );
  const saveAgentSettingsNowRef = useRef<
    (settings: AgentSettings) => Promise<void>
  >(async () => {});

  const agentSettingsRef = useRef(agentSettings);
  useEffect(() => {
    agentSettingsRef.current = agentSettings;
  }, [agentSettings]);

  const clearHideSavedTimer = useCallback(() => {
    if (hideSavedTimerRef.current) {
      clearTimeout(hideSavedTimerRef.current);
      hideSavedTimerRef.current = null;
    }
  }, []);

  const scheduleHideSaved = useCallback(() => {
    clearHideSavedTimer();
    hideSavedTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setSaveStatus("idle");
    }, 2000);
  }, [clearHideSavedTimer]);

  /**
   * 统一的保存包装器：
   * - 维护 Saving/Saved/Failed 状态
   * - 处理 toast 错误提示
   * - 支持并发保存（以最后一次完成为准）
   */
  const runSaveTask = useCallback(
    async (task: () => Promise<void>, failure: FailedSave) => {
      inFlightSavesRef.current += 1;

      if (isMountedRef.current) {
        clearHideSavedTimer();
        hasFailureRef.current = false;
        setFailedSave(null);
        setSaveStatus("saving");
      }

      try {
        await task();
      } catch (e) {
        hasFailureRef.current = true;
        logger.error(t("errors.saveFailed"), e);
        showToast({
          variant: "danger",
          description: t("toasts.saveFailed", {
            error: (e as Error)?.message || "unknown",
          }),
        });

        if (isMountedRef.current) {
          setFailedSave(failure);
          setSaveStatus("failed");
        }
        return;
      } finally {
        inFlightSavesRef.current = Math.max(0, inFlightSavesRef.current - 1);
      }

      if (!isMountedRef.current) return;
      if (hasFailureRef.current) return;
      if (inFlightSavesRef.current !== 0) return;

      setSaveStatus("saved");
      scheduleHideSaved();
    },
    [clearHideSavedTimer, scheduleHideSaved, showToast, t],
  );

  const saveDefaultPathNow = useCallback(
    async (path: string) => {
      await runSaveTask(
        async () => {
          await saveDefaultPath(path);
          onSettingsChange?.({ defaultPath: path });
        },
        { kind: "defaultPath", value: path },
      );
    },
    [onSettingsChange, runSaveTask, saveDefaultPath],
  );

  const saveAgentSettingsNow = useCallback(
    async (settings: AgentSettings) => {
      if (!isSystemPromptValid(settings.systemPrompt)) return;

      await runSaveTask(
        async () => {
          await saveAgentSettings(settings);
        },
        { kind: "agentSettings", value: settings },
      );
    },
    [runSaveTask, saveAgentSettings],
  );

  const saveVersionSettingsNow = useCallback(
    async (settings: { autoVersionOnAIEdit: boolean }) => {
      await runSaveTask(
        async () => {
          await setSetting(
            "version.autoVersionOnAIEdit",
            settings.autoVersionOnAIEdit ? "1" : "0",
          );
        },
        { kind: "versionSettings", value: settings },
      );
    },
    [runSaveTask, setSetting],
  );

  useEffect(() => {
    saveDefaultPathNowRef.current = saveDefaultPathNow;
  }, [saveDefaultPathNow]);

  useEffect(() => {
    saveAgentSettingsNowRef.current = saveAgentSettingsNow;
  }, [saveAgentSettingsNow]);

  const debouncedSaveDefaultPath = useMemo(
    () =>
      debounce((path: string) => {
        saveDefaultPathNowRef.current(path).catch(() => {});
      }, 500),
    [],
  );

  const debouncedSaveAgentSettings = useMemo(
    () =>
      debounce((settings: AgentSettings) => {
        saveAgentSettingsNowRef.current(settings).catch(() => {});
      }, 800),
    [],
  );

  const flushPendingSaves = useCallback(() => {
    debouncedSaveDefaultPath.flush();
    debouncedSaveAgentSettings.flush();
  }, [debouncedSaveAgentSettings, debouncedSaveDefaultPath]);

  useEffect(() => {
    isMountedRef.current = true;
    return subscribeSidebarNavigate((detail) => {
      if (detail.tab === "settings" && detail.settingsTab) {
        flushPendingSaves();
        setActiveTab(detail.settingsTab);
      }
    });
  }, [flushPendingSaves]);

  // 加载保存的设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [
          path,
          loadedProviders,
          loadedModels,
          loadedAgent,
          loadedActiveModel,
          versionSetting,
        ] = await Promise.all([
          getDefaultPath(),
          getProviders(),
          getModels(),
          getAgentSettings(),
          getActiveModel(),
          getSetting("version.autoVersionOnAIEdit"),
        ]);

        const normalizedPath = path || "";
        setDefaultPath(normalizedPath);

        setProviders(loadedProviders);

        setModels(loadedModels);

        const agent = loadedAgent ?? DEFAULT_AGENT_SETTINGS;
        setAgentSettings(agent);

        setActiveModelState(loadedActiveModel);

        const autoVersionOnAIEdit =
          versionSetting !== "0" && versionSetting !== "false";
        setVersionSettings({ autoVersionOnAIEdit });
      } catch (e) {
        logger.error(t("errors.loadFailed"), e);
        setProviders([]);
        setModels([]);
        setAgentSettings(DEFAULT_AGENT_SETTINGS);
        setActiveModelState(null);
        setVersionSettings({ autoVersionOnAIEdit: true });
        showToast({
          variant: "danger",
          description: t("toasts.loadFailed", {
            error: (e as Error)?.message || "unknown",
          }),
        });
      }
    };

    loadSettings().catch(() => {});
  }, [
    getAgentSettings,
    getDefaultPath,
    getModels,
    getProviders,
    getActiveModel,
    getSetting,
    showToast,
    t,
  ]);

  // 组件卸载时强制 flush，确保最后一次编辑被写入存储
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      flushPendingSaves();
      clearHideSavedTimer();
    };
  }, [clearHideSavedTimer, flushPendingSaves]);

  const systemPromptError = useMemo(
    () =>
      isSystemPromptValid(agentSettings.systemPrompt)
        ? undefined
        : t("agent.systemPrompt.errorEmpty", "系统提示词不能为空"),
    [agentSettings.systemPrompt, t],
  );

  const handleDefaultPathChange = useCallback(
    (path: string) => {
      setDefaultPath(path);
      debouncedSaveDefaultPath(path);
    },
    [debouncedSaveDefaultPath],
  );

  const handleProvidersChange = (items: ProviderConfig[]) => {
    setProviders(items);
  };

  const handleModelsChange = (items: ModelConfig[]) => {
    setModels(items);
  };

  const handleActiveModelChange = (model: ActiveModelReference | null) => {
    setActiveModelState(model);
  };

  const handleAgentSystemPromptChange = useCallback(
    (nextPrompt: string) => {
      const nextSettings: AgentSettings = {
        ...agentSettingsRef.current,
        systemPrompt: nextPrompt,
        updatedAt: Date.now(),
      };

      setAgentSettings(nextSettings);

      // 文本输入频繁，使用更长的防抖；无效内容（空）不写入存储
      if (!isSystemPromptValid(nextSettings.systemPrompt)) {
        debouncedSaveAgentSettings.cancel();
        return;
      }

      debouncedSaveAgentSettings(nextSettings);
    },
    [debouncedSaveAgentSettings],
  );

  const handleVersionSettingsChange = useCallback(
    (settings: { autoVersionOnAIEdit: boolean }) => {
      setVersionSettings(settings);
      saveVersionSettingsNow(settings).catch(() => {});
    },
    [saveVersionSettingsNow],
  );

  const handleTabChange = useCallback(
    (tab: SettingsTab) => {
      // 切换 Tab 前 flush，避免最后一次输入还在防抖队列中
      flushPendingSaves();
      setActiveTab(tab);
    },
    [flushPendingSaves],
  );

  const handleRetrySave = useCallback(() => {
    flushPendingSaves();
    const target = failedSave;
    if (!target) return;

    switch (target.kind) {
      case "defaultPath":
        saveDefaultPathNow(target.value).catch(() => {});
        break;
      case "agentSettings":
        saveAgentSettingsNow(target.value).catch(() => {});
        break;
      case "versionSettings":
        saveVersionSettingsNow(target.value).catch(() => {});
        break;
      default:
        break;
    }
  }, [
    failedSave,
    flushPendingSaves,
    saveAgentSettingsNow,
    saveDefaultPathNow,
    saveVersionSettingsNow,
  ]);

  const saveIndicatorText = useMemo(() => {
    switch (saveStatus) {
      case "saving":
        return t("saveIndicator.saving", "Saving...");
      case "saved":
        return t("saveIndicator.saved", "Saved");
      case "failed":
        return t("saveIndicator.failed", "Failed");
      default:
        return "";
    }
  }, [saveStatus, t]);

  const saveIndicatorDotStyle = useMemo(() => {
    let colorVar = "var(--warning)";
    if (saveStatus === "failed") {
      colorVar = "var(--danger)";
    } else if (saveStatus === "saved") {
      colorVar = "var(--success)";
    }

    return {
      background: colorVar,
      boxShadow: `0 0 0 4px color-mix(in oklch, ${colorVar} 25%, transparent)`,
    } as const;
  }, [saveStatus]);

  return (
    <div className="sidebar-container settings-sidebar-new">
      <div className="settings-layout">
        <SettingsNav activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="settings-content">
          {saveStatus !== "idle" ? (
            <div
              className="mb-3 flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm"
              style={{
                border: "1px solid var(--border-light)",
                background: "var(--surface)",
              }}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={saveIndicatorDotStyle}
                  aria-hidden="true"
                />
                <span className="text-foreground-secondary">
                  {saveIndicatorText}
                </span>
              </div>

              {saveStatus === "failed" ? (
                <Button variant="tertiary" size="sm" onPress={handleRetrySave}>
                  {t("saveIndicator.retry", "Retry")}
                </Button>
              ) : null}
            </div>
          ) : null}

          {activeTab === "general" && (
            <GeneralSettingsPanel
              defaultPath={defaultPath}
              onDefaultPathChange={handleDefaultPathChange}
            />
          )}

          {activeTab === "models" && (
            <ModelsSettingsPanel
              providers={providers}
              models={models}
              activeModel={activeModel}
              onProvidersChange={handleProvidersChange}
              onModelsChange={handleModelsChange}
              onActiveModelChange={handleActiveModelChange}
            />
          )}

          {activeTab === "agent" && (
            <AgentSettingsPanel
              systemPrompt={agentSettings.systemPrompt}
              onChange={handleAgentSystemPromptChange}
              error={systemPromptError}
            />
          )}

          {activeTab === "version" && (
            <VersionSettingsPanel
              settings={versionSettings}
              onChange={handleVersionSettingsChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
