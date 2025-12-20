"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  CloseButton,
  Description,
  FieldError,
  Input,
  Label,
  Radio,
  RadioGroup,
  Spinner,
  Surface,
  TextField,
} from "@heroui/react";
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay,
} from "react-aria-components";

import type { McpConfig, McpHost } from "@/app/types/mcp";
import { useOperationToast } from "@/app/hooks/useOperationToast";

/**
 * MCP 配置对话框 Props
 */
export interface McpConfigDialogProps {
  /**
   * 是否打开对话框。
   */
  isOpen: boolean;

  /**
   * 关闭回调。
   */
  onClose: () => void;

  /**
   * 确认回调（提交配置并启动 MCP）。
   */
  onConfirm: (config: McpConfig) => Promise<void>;
}

type FormErrors = {
  port?: string;
  general?: string;
};

const DEFAULT_HOST: McpHost = "127.0.0.1";
const DEFAULT_PORT = 8000;

const isElectronEnv = (): boolean =>
  typeof window !== "undefined" && typeof window.electronMcp !== "undefined";

const validatePort = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return "端口不能为空";

  const port = Number(trimmed);
  if (!Number.isInteger(port)) return "端口必须是整数";
  if (port < 8000 || port > 9000) return "端口范围必须在 8000-9000";

  return null;
};

/**
 * MCP 配置对话框
 *
 * - 使用 React Aria 的 `ModalOverlay` + `Modal` 作为可访问性基础
 * - 使用 HeroUI 的 `Surface` 作为内容容器
 * - Web 环境显示“仅支持 APP 端”提示
 */
export function McpConfigDialog({
  isOpen,
  onClose,
  onConfirm,
}: McpConfigDialogProps) {
  const { pushErrorToast, extractErrorMessage } = useOperationToast();

  const [host, setHost] = useState<McpHost>(DEFAULT_HOST);
  const [port, setPort] = useState<string>(String(DEFAULT_PORT));
  const [errors, setErrors] = useState<FormErrors>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickingPort, setIsPickingPort] = useState(false);

  const canUseMcp = useMemo(() => (isOpen ? isElectronEnv() : true), [isOpen]);

  const isBusy = isSubmitting || isPickingPort;

  const resetState = useCallback(() => {
    setHost(DEFAULT_HOST);
    setPort(String(DEFAULT_PORT));
    setErrors({});
    setIsSubmitting(false);
    setIsPickingPort(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handlePortChange = useCallback((value: string) => {
    setPort(value);
    setErrors((prev) => {
      const message = validatePort(value);
      if (!message && !prev.port) return prev;
      const next: FormErrors = { ...prev };
      if (message) next.port = message;
      else delete next.port;
      return next;
    });
  }, []);

  const handlePickRandomPort = useCallback(async () => {
    if (!isElectronEnv()) return;
    if (isBusy) return;

    setIsPickingPort(true);
    try {
      const nextPort = await window.electronMcp?.getRandomPort?.();
      if (!Number.isInteger(nextPort)) {
        throw new Error("Random port is invalid");
      }
      handlePortChange(String(nextPort));
    } catch (error) {
      const message = extractErrorMessage(error) ?? "未知错误";
      pushErrorToast(`获取随机端口失败：${message}`);
    } finally {
      setIsPickingPort(false);
    }
  }, [extractErrorMessage, handlePortChange, isBusy, pushErrorToast]);

  const isFormValid = useMemo(() => {
    if (!canUseMcp) return false;
    return validatePort(port) === null;
  }, [canUseMcp, port]);

  const submit = useCallback(async () => {
    if (isBusy) return;
    if (!canUseMcp) return;

    const portError = validatePort(port);
    if (portError) {
      setErrors((prev) => ({ ...prev, port: portError }));
      return;
    }

    const config: McpConfig = { host, port: Number(port) };

    setIsSubmitting(true);
    setErrors({});
    try {
      await onConfirm(config);
      onClose();
    } catch (error) {
      const message = extractErrorMessage(error) ?? "未知错误";
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canUseMcp,
    extractErrorMessage,
    host,
    isBusy,
    onClose,
    onConfirm,
    port,
  ]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submit();
    },
    [submit],
  );

  return (
    <ModalOverlay
      isOpen={isOpen}
      isDismissable={!isSubmitting}
      isKeyboardDismissDisabled={isSubmitting}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <AriaModal className="w-full max-w-lg px-4">
        <Surface className="w-full rounded-2xl bg-content1 p-4 shadow-2xl outline-none">
          <AriaDialog aria-label="MCP 配置" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                MCP 配置
              </h2>
              <CloseButton
                aria-label="关闭"
                onPress={onClose}
                isDisabled={isSubmitting}
              />
            </div>

            {!canUseMcp ? (
              <Alert status="warning">
                <Alert.Title>仅支持 APP 端</Alert.Title>
                <Alert.Description>
                  Web 端无法启动 MCP 服务器，请在 Electron 应用中使用该功能。
                </Alert.Description>
              </Alert>
            ) : null}

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <RadioGroup
                value={host}
                orientation="horizontal"
                onChange={(value) => setHost(value as McpHost)}
                isDisabled={!canUseMcp || isBusy}
              >
                <Label>监听地址</Label>
                <Description className="mt-2">
                  选择 MCP 服务绑定的 IP 地址。
                </Description>

                <Radio value="127.0.0.1">
                  <Radio.Content>
                    <Label>127.0.0.1（本地）</Label>
                    <Description className="text-xs text-default-500">
                      仅本机可访问，安全性更高
                    </Description>
                  </Radio.Content>
                </Radio>

                <Radio value="0.0.0.0">
                  <Radio.Content>
                    <Label>0.0.0.0（局域网）</Label>
                    <Description className="text-xs text-default-500">
                      局域网设备可访问
                    </Description>
                  </Radio.Content>
                </Radio>
              </RadioGroup>

              {host === "0.0.0.0" ? (
                <Alert status="warning">
                  <Alert.Title>安全提示</Alert.Title>
                  <Alert.Description>
                    绑定到 0.0.0.0 会让同一局域网内设备可访问 MCP 接口，请确保网络可信，
                    并避免在公共 Wi‑Fi 下开启。
                  </Alert.Description>
                </Alert>
              ) : null}

              <TextField isRequired isInvalid={Boolean(errors.port)}>
                <Label>端口</Label>
                <div className="mt-2 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      type="number"
                      step="1"
                      min={8000}
                      max={9000}
                      inputMode="numeric"
                      value={port}
                      onChange={(event) => handlePortChange(event.target.value)}
                      disabled={!canUseMcp || isBusy}
                      aria-label="端口"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onPress={handlePickRandomPort}
                    isDisabled={!canUseMcp || isBusy}
                  >
                    随机端口
                  </Button>
                </div>
                <Description>范围 8000-9000</Description>
                {errors.port ? <FieldError>{errors.port}</FieldError> : null}
              </TextField>

              {errors.general ? (
                <FieldError className="text-sm">{errors.general}</FieldError>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="tertiary"
                  onPress={onClose}
                  isDisabled={isBusy}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={!isFormValid || isBusy}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      启动
                    </span>
                  ) : (
                    "启动"
                  )}
                </Button>
              </div>
            </form>
          </AriaDialog>
        </Surface>
      </AriaModal>
    </ModalOverlay>
  );
}
