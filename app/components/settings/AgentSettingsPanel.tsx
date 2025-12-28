"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Button,
  Description,
  FieldError,
  Label,
  ListBox,
  TextArea,
  TextField,
} from "@heroui/react";
import { RotateCcw } from "lucide-react";
import Image from "next/image";
import type { Selection } from "react-aria-components";
import { useTranslation } from "react-i18next";

import ConfirmDialog from "../common/ConfirmDialog";
import { useAppTranslation } from "@/app/i18n/hooks";
import { DEFAULT_SYSTEM_PROMPT } from "@/app/lib/config-utils";
import type { SkillKnowledgeId, SkillSettings } from "@/app/types/chat";
import {
  getRequiredKnowledge,
  getThemeById,
  skillKnowledgeConfig,
} from "@/app/config/skill-elements";

export interface AgentSettingsPanelProps {
  systemPrompt: string;
  onChange: (systemPrompt: string) => void;
  skillSettings: SkillSettings;
  onSkillSettingsChange: (settings: SkillSettings) => void;
  // 可选：由父组件传入的错误信息
  error?: string;
}

export const isSystemPromptValid = (value: string): boolean =>
  value.trim().length > 0;

export const getSystemPromptError = (value: string): string | null =>
  isSystemPromptValid(value) ? null : "系统提示词不能为空";

const themeOptions = skillKnowledgeConfig.themes;
const knowledgeOptions = skillKnowledgeConfig.knowledge;
const knowledgeOrder = knowledgeOptions.map((item) => item.id);

const buildOrderedKnowledge = (
  ids: Set<SkillKnowledgeId>,
): SkillKnowledgeId[] => {
  return knowledgeOrder.filter((id) => ids.has(id));
};

export default function AgentSettingsPanel({
  systemPrompt,
  onChange,
  skillSettings,
  onSkillSettingsChange,
  error,
}: AgentSettingsPanelProps) {
  const { t } = useTranslation("settings");
  const { t: tChat } = useAppTranslation("chat");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleReset = useCallback(() => {
    onChange(DEFAULT_SYSTEM_PROMPT);
  }, [onChange]);

  const derivedError = useMemo(() => {
    if (error) return error;
    return isSystemPromptValid(systemPrompt)
      ? undefined
      : t("agent.systemPrompt.errorEmpty", "系统提示词不能为空");
  }, [error, systemPrompt, t]);

  const requiredKnowledgeIds = useMemo<Set<SkillKnowledgeId>>(
    () => new Set(getRequiredKnowledge().map((item) => item.id)),
    [],
  );

  const availableKnowledgeIds = useMemo<Set<SkillKnowledgeId>>(
    () => new Set(knowledgeOptions.map((item) => item.id)),
    [],
  );

  const selectedKnowledgeIds = useMemo(() => {
    const next = new Set<SkillKnowledgeId>();
    for (const id of skillSettings.selectedKnowledge) {
      if (availableKnowledgeIds.has(id)) {
        next.add(id);
      }
    }
    for (const id of requiredKnowledgeIds) {
      next.add(id);
    }
    return next;
  }, [
    availableKnowledgeIds,
    skillSettings.selectedKnowledge,
    requiredKnowledgeIds,
  ]);

  const selectedTheme = useMemo(() => {
    return (
      getThemeById(
        skillSettings.selectedTheme as Parameters<typeof getThemeById>[0],
      ) ?? themeOptions[0]
    );
  }, [skillSettings.selectedTheme]);

  const handleThemeChange = useCallback(
    (value: string) => {
      if (!value || value === skillSettings.selectedTheme) return;
      onSkillSettingsChange({
        ...skillSettings,
        selectedTheme: value,
      });
    },
    [onSkillSettingsChange, skillSettings],
  );

  const handleKnowledgeChange = useCallback(
    (keys: Selection) => {
      if (keys === "all") {
        const allIds = new Set<SkillKnowledgeId>(knowledgeOrder);
        for (const id of requiredKnowledgeIds) {
          allIds.add(id);
        }
        onSkillSettingsChange({
          ...skillSettings,
          selectedKnowledge: buildOrderedKnowledge(allIds),
        });
        return;
      }

      const next = new Set<SkillKnowledgeId>();
      for (const key of keys) {
        const id = String(key) as SkillKnowledgeId;
        if (availableKnowledgeIds.has(id)) {
          next.add(id);
        }
      }
      for (const id of requiredKnowledgeIds) {
        next.add(id);
      }

      onSkillSettingsChange({
        ...skillSettings,
        selectedKnowledge: buildOrderedKnowledge(next),
      });
    },
    [
      availableKnowledgeIds,
      onSkillSettingsChange,
      requiredKnowledgeIds,
      skillSettings,
    ],
  );

  return (
    <div className="settings-panel flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="section-title">{t("agent.title", "Agent 设置")}</h3>
        <p className="section-description">
          {t("agent.description", "配置 AI 助手的全局行为")}
        </p>
      </div>

      <TextField className="w-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-foreground">
              {t("agent.systemPrompt.label", "系统提示词")}
            </Label>
            <Description className="text-sm text-default-500">
              {t(
                "agent.systemPrompt.description",
                "定义 AI 助手的行为规则和工作模式，对所有模型生效",
              )}
            </Description>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onPress={() => setIsResetDialogOpen(true)}
            className="shrink-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("agent.systemPrompt.reset", "恢复默认")}
          </Button>
        </div>

        <TextArea
          value={systemPrompt}
          onChange={(event) => onChange(event.target.value)}
          rows={15}
          aria-label={t("agent.systemPrompt.label", "系统提示词")}
          className="mt-4 w-full min-h-[15rem] max-h-[60vh]"
        />

        {derivedError ? (
          <FieldError className="mt-2 text-sm">{derivedError}</FieldError>
        ) : null}
      </TextField>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-sm font-semibold text-foreground">
            {t("agent.defaultSettings.title", "新对话默认设置")}
          </Label>
          <Description className="text-sm text-default-500">
            {t("agent.defaultSettings.description", "新对话将使用这些默认设置")}
          </Description>
        </div>

        <div className="skill-section">
          <div className="skill-section__header">
            <Label className="skill-section__title">
              {t("agent.defaultSettings.themeLabel", "默认风格设置")}
            </Label>
            <p className="skill-section__hint">
              {tChat("skill.theme.description")}
            </p>
          </div>
          <div
            className="skill-theme-grid"
            role="radiogroup"
            aria-label={t("agent.defaultSettings.themeLabel", "默认风格设置")}
          >
            {themeOptions.map((theme) => {
              const isSelected =
                (selectedTheme?.id ?? skillSettings.selectedTheme) === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={tChat(theme.nameKey)}
                  className={[
                    "skill-theme-card",
                    isSelected && "skill-theme-card--selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleThemeChange(theme.id)}
                >
                  <span className="skill-theme-thumbnail">
                    <Image
                      src={`/images/skill-themes/${theme.id}.svg`}
                      alt=""
                      aria-hidden="true"
                      className="skill-theme-thumbnail__image"
                      width={80}
                      height={60}
                    />
                  </span>
                  <span className="skill-theme-label">
                    {tChat(theme.nameKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="skill-section">
          <div className="skill-section__header">
            <Label className="skill-section__title">
              {t("agent.defaultSettings.knowledgeLabel", "默认知识选择")}
            </Label>
            <p className="skill-section__hint">
              {tChat("skill.knowledge.description")}
            </p>
          </div>
          <ListBox
            aria-label={t(
              "agent.defaultSettings.knowledgeLabel",
              "默认知识选择",
            )}
            selectionMode="multiple"
            selectedKeys={selectedKnowledgeIds}
            onSelectionChange={handleKnowledgeChange}
            disabledKeys={new Set(requiredKnowledgeIds.values())}
            className="skill-elements-list"
          >
            {knowledgeOptions.map((item) => {
              const isRequired = requiredKnowledgeIds.has(item.id);
              return (
                <ListBox.Item
                  key={item.id}
                  id={item.id}
                  textValue={tChat(item.nameKey)}
                  className="skill-element-item"
                >
                  <span className="skill-element-item__label">
                    {tChat(item.nameKey)}
                  </span>
                  {isRequired ? (
                    <span className="skill-element-item__required">
                      {tChat("skill.knowledge.required")}
                    </span>
                  ) : null}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              );
            })}
          </ListBox>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        title={t("agent.systemPrompt.resetTitle", "恢复默认系统提示词")}
        description={t(
          "agent.systemPrompt.resetConfirm",
          "此操作将丢失当前编辑的内容，确认恢复默认系统提示词吗？",
        )}
        confirmText={t("common.confirm", "确认")}
        cancelText={t("common.cancel", "取消")}
        variant="danger"
        onConfirm={handleReset}
      />
    </div>
  );
}
