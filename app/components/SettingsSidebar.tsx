"use client";

import { useState, useEffect } from "react";
import { Button, TextField, Label, Input, Description } from "@heroui/react";

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: { defaultPath: string }) => void;
}

export default function SettingsSidebar({ isOpen, onClose, onSettingsChange }: SettingsSidebarProps) {
  const [defaultPath, setDefaultPath] = useState("");
  const [savedPath, setSavedPath] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // 加载保存的设置
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("defaultPath") || "";
      setDefaultPath(saved);
      setSavedPath(saved);
    }
  }, []);

  // 监听路径变化，检测是否有修改
  useEffect(() => {
    setHasChanges(defaultPath !== savedPath);
  }, [defaultPath, savedPath]);

  // 选择文件夹
  const handleSelectFolder = async () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      const result = await (window as any).electron.selectFolder();
      if (result) {
        setDefaultPath(result);
      }
    } else {
      // 浏览器模式下的占位逻辑
      alert("文件夹选择功能仅在 Electron 环境下可用");
    }
  };

  // 保存设置
  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("defaultPath", defaultPath);
      setSavedPath(defaultPath);
      if (onSettingsChange) {
        onSettingsChange({ defaultPath });
      }
    }
  };

  // 取消修改
  const handleCancel = () => {
    setDefaultPath(savedPath);
  };

  return (
    <div className="sidebar-container">
      {/* 设置内容区域 */}
      <div className="sidebar-content">
        <div className="settings-section">
          <h3 className="section-title">文件路径配置</h3>
          <p className="section-description">
            设置 DrawIO 文件的默认保存位置
          </p>

          <TextField className="w-full mt-4">
            <Label>默认启动路径</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={defaultPath}
                onChange={(e) => setDefaultPath(e.target.value)}
                placeholder="/path/to/folder"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                className="button-small-optimized button-secondary"
                onPress={handleSelectFolder}
              >
                浏览
              </Button>
            </div>
            <Description className="mt-2">
              保存文件时将优先使用此路径,仅在 Electron 环境下生效
            </Description>
          </TextField>
        </div>
      </div>

      {/* 浮动操作按钮 - 仅在有修改时显示 */}
      {hasChanges && (
        <div className="floating-actions">
          <Button
            variant="ghost"
            size="sm"
            className="sidebar-button"
            onPress={handleCancel}
          >
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="sidebar-button button-primary"
            onPress={handleSave}
          >
            保存
          </Button>
        </div>
      )}
    </div>
  );
}
