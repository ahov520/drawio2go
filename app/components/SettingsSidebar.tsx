"use client";

import { useState, useEffect, useRef } from "react";
import { Button, TextField, Label, Input, Description } from "@heroui/react";

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: { defaultPath: string }) => void;
}

export default function SettingsSidebar({ isOpen, onClose, onSettingsChange }: SettingsSidebarProps) {
  const [defaultPath, setDefaultPath] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 加载保存的设置
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPath = localStorage.getItem("defaultPath") || "";
      setDefaultPath(savedPath);

      const savedWidth = localStorage.getItem("sidebarWidth");
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        setSidebarWidth(width);
        document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
      }
    }
  }, []);

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
      if (onSettingsChange) {
        onSettingsChange({ defaultPath });
      }
      // 不关闭侧栏,保持打开状态
    }
  };

  // 开始拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // 拖拽调整大小
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = 800;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
        document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // 保存宽度到 localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("sidebarWidth", sidebarWidth.toString());
        }
      }
    };

    if (isResizing) {
      document.body.classList.add("resizing");
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.body.classList.remove("resizing");
    }

    return () => {
      document.body.classList.remove("resizing");
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  return (
    <div ref={sidebarRef} className={`settings-sidebar ${isOpen ? 'open' : ''}`}>
      {/* 拖拽分隔条 */}
      {isOpen && (
        <div
          className="resize-handle"
          onMouseDown={handleMouseDown}
          title="拖拽调整侧边栏宽度"
        />
      )}

      <div className="sidebar-container">
        {/* 标题栏 */}
        <div className="sidebar-header">
          <h2 className="sidebar-title">应用设置</h2>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="close-button"
            onPress={onClose}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

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

        {/* 底部操作按钮 */}
        <div className="sidebar-footer">
          <Button
            variant="ghost"
            size="md"
            className="sidebar-button"
            onPress={onClose}
          >
            关闭
          </Button>
          <Button
            variant="primary"
            size="md"
            className="sidebar-button button-primary"
            onPress={handleSave}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
