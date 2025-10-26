"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Button, TooltipRoot, TooltipContent } from "@heroui/react";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 useChat hook（仅 UI 模式，不连接真实 API）
  const { messages } = useChat();

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 处理发送消息
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // TODO: 发送消息逻辑（后端留空）
    console.log("发送消息:", input);
    setInput("");
  };

  // 新建聊天
  const handleNewChat = () => {
    console.log("新建聊天");
    // TODO: 清空当前对话，开始新对话
  };

  // 历史对话
  const handleHistory = () => {
    console.log("打开历史对话");
    // TODO: 显示历史对话列表
  };

  // 版本管理
  const handleVersionControl = () => {
    console.log("版本管理");
    // TODO: 打开版本管理界面
  };

  // 文件上传
  const handleFileUpload = () => {
    console.log("文件上传");
    // TODO: 打开文件选择器
  };

  return (
    <div className="chat-sidebar-content">
      {/* 消息内容区域 - 无分隔线一体化设计 */}
      <div className="chat-messages-area">
        <div className="messages-scroll-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p className="empty-text">开始与 AI 助手对话</p>
              <p className="empty-hint">输入消息开始聊天</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.role === "user" ? "message-user" : "message-ai"
                }`}
              >
                <div className="message-header">
                  <span className="message-role">
                    {message.role === "user" ? "你" : "AI"}
                  </span>
                  <span className="message-time">
                    {new Date().toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="message-content">
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <div key={`${message.id}-${i}`}>{part.text}</div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 底部输入区域 - 一体化设计 */}
      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-input-container">
          {/* 多行文本输入框 */}
          <textarea
            placeholder="描述你想要对图表进行的修改，或上传（粘贴）图像来复制图表..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="chat-input-textarea"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          {/* 按钮组 */}
          <div className="chat-input-actions">
            {/* 左侧按钮组 */}
            <div className="chat-actions-left">
              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleNewChat}
                  className="chat-icon-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>新建聊天</p>
                </TooltipContent>
              </TooltipRoot>

              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleHistory}
                  className="chat-icon-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3v5h5"></path>
                    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path>
                    <path d="M12 7v5l4 2"></path>
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>历史对话</p>
                </TooltipContent>
              </TooltipRoot>
            </div>

            {/* 右侧按钮组 */}
            <div className="chat-actions-right">
              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleVersionControl}
                  className="chat-icon-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="18" cy="18" r="3"></circle>
                    <circle cx="6" cy="6" r="3"></circle>
                    <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
                    <line x1="6" y1="9" x2="6" y2="21"></line>
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>版本管理</p>
                </TooltipContent>
              </TooltipRoot>

              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleFileUpload}
                  className="chat-icon-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>文件上传</p>
                </TooltipContent>
              </TooltipRoot>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isDisabled={!input.trim()}
                className="chat-send-button button-primary"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                发送
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
