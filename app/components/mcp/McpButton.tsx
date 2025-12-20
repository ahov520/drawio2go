"use client";

import { Button } from "@heroui/react";
import { Server as ServerIcon } from "lucide-react";

/**
 * MCP 按钮组件 Props
 */
export interface McpButtonProps {
  /**
   * 是否处于激活状态（正在暴露 MCP 接口）。
   */
  isActive: boolean;

  /**
   * 点击回调（HeroUI v3：使用 onPress）。
   */
  onPress: () => void;

  /**
   * 是否禁用。
   */
  isDisabled?: boolean;
}

/**
 * MCP 按钮组件
 *
 * - 未激活：`variant="secondary"`，文案 "MCP 接口"
 * - 已激活：`variant="primary"`，文案 "暴露中"
 */
export function McpButton({ isActive, onPress, isDisabled }: McpButtonProps) {
  const label = isActive ? "暴露中" : "MCP 接口";

  return (
    <Button
      variant={isActive ? "primary" : "secondary"}
      isDisabled={isDisabled}
      aria-label={label}
      aria-pressed={isActive}
      onPress={onPress}
    >
      <ServerIcon size={16} aria-hidden />
      {label}
    </Button>
  );
}

