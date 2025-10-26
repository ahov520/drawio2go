"use client";

import { useState, useEffect } from "react";
// import DrawioEditor from "./components/DrawioEditor";
import DrawioEditorNative from "./components/DrawioEditorNative"; // 使用原生 iframe 实现
import BottomBar from "./components/BottomBar";
import SettingsSidebar from "./components/SettingsSidebar";

export default function Home() {
  const [diagramXml, setDiagramXml] = useState<string>("");
  const [currentXml, setCurrentXml] = useState<string>("");
  const [settings, setSettings] = useState({ defaultPath: "" });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 加载保存的图表
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedXml = localStorage.getItem("currentDiagram");
      if (savedXml) {
        setDiagramXml(savedXml);
        setCurrentXml(savedXml);
      }

      const savedPath = localStorage.getItem("defaultPath");
      if (savedPath) {
        setSettings({ defaultPath: savedPath });
      }
    }
  }, []);

  // 自动保存图表到 localStorage
  const handleAutoSave = (xml: string) => {
    setCurrentXml(xml);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentDiagram", xml);
    }
  };

  // 手动保存到文件
  const handleManualSave = async () => {
    if (!currentXml) {
      alert("没有可保存的内容");
      return;
    }

    // 如果在 Electron 环境中,保存到文件系统
    if (typeof window !== "undefined" && (window as any).electron) {
      const result = await (window as any).electron.saveDiagram(
        currentXml,
        settings.defaultPath
      );
      if (result.success) {
        alert(`文件已保存到: ${result.filePath}`);
      } else {
        alert(`保存失败: ${result.message}`);
      }
    } else {
      // 浏览器环境下载文件
      const blob = new Blob([currentXml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagram.drawio";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // 加载文件
  const handleLoad = async () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      const result = await (window as any).electron.loadDiagram();
      if (result.success) {
        setDiagramXml(result.xml);
        setCurrentXml(result.xml);
        localStorage.setItem("currentDiagram", result.xml);
      } else if (result.message !== "用户取消打开") {
        alert(`加载失败: ${result.message}`);
      }
    } else {
      // 浏览器环境上传文件
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".drawio";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const xml = event.target?.result as string;
            setDiagramXml(xml);
            setCurrentXml(xml);
            localStorage.setItem("currentDiagram", xml);
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  // 设置变更
  const handleSettingsChange = (newSettings: { defaultPath: string }) => {
    setSettings(newSettings);
  };

  // 切换设置侧栏
  const handleToggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <main className="main-container">
      {/* DrawIO 编辑器区域 */}
      <div className={`editor-container ${isSettingsOpen ? 'sidebar-open' : ''}`}>
        <DrawioEditorNative
          initialXml={diagramXml}
          onSave={handleAutoSave}
        />
      </div>

      {/* 设置侧拉栏 */}
      <SettingsSidebar
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
      />

      {/* 底部工具栏 */}
      <BottomBar
        onToggleSettings={handleToggleSettings}
        onSave={handleManualSave}
        onLoad={handleLoad}
      />
    </main>
  );
}
