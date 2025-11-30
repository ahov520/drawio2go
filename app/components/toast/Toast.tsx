"use client";

import React from "react";
import { useEffect, useState, FocusEvent, KeyboardEvent } from "react";
import { CloseButton } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Toast as ToastItem } from "@/app/types/toast";
import { useAppTranslation } from "@/app/i18n/hooks";

interface ToastRootProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  isLeaving?: boolean;
}

interface ToastIconProps {
  variant: ToastItem["variant"];
}

interface ToastContentProps {
  title?: string;
  description: string;
}

interface ToastCloseProps {
  onPress: () => void;
  ariaLabel: string;
}

function ToastIcon({ variant }: ToastIconProps) {
  const iconProps = { size: 20, strokeWidth: 2.3, "aria-hidden": true };
  switch (variant) {
    case "success":
      return <CheckCircle2 {...iconProps} />;
    case "info":
      return <Info {...iconProps} />;
    case "warning":
      return <AlertTriangle {...iconProps} />;
    case "danger":
    default:
      return <XCircle {...iconProps} />;
  }
}

function ToastContent({ title, description }: ToastContentProps) {
  return (
    <div className="toast__content">
      {title ? <div className="toast__title">{title}</div> : null}
      <div className="toast__description">{description}</div>
    </div>
  );
}

function ToastClose({ onPress, ariaLabel }: ToastCloseProps) {
  return (
    <CloseButton
      aria-label={ariaLabel}
      onPress={onPress}
      className="toast__close"
    />
  );
}

function ToastRoot({
  toast,
  onDismiss,
  onPause,
  onResume,
  isLeaving = false,
}: ToastRootProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { t } = useAppTranslation("common");

  const closeLabel = t("toast.close", "Close notification");

  const role =
    toast.variant === "warning" || toast.variant === "danger"
      ? "alert"
      : "status";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onDismiss(toast.id);
    }
  };

  const handleFocus = () => {
    onPause(toast.id);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      onResume(toast.id);
    }
  };

  return (
    <div
      className={`toast ${isMounted ? "toast--open" : ""} ${
        isLeaving ? "toast--leaving" : ""
      }`}
      role={role}
      tabIndex={0}
      data-variant={toast.variant}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast.id)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <ToastIcon variant={toast.variant} />
      <ToastContent title={toast.title} description={toast.description} />
      <ToastClose onPress={() => onDismiss(toast.id)} ariaLabel={closeLabel} />
    </div>
  );
}

export const Toast = Object.assign(ToastRoot, {
  Root: ToastRoot,
  Icon: ToastIcon,
  Content: ToastContent,
  Close: ToastClose,
});

export type {
  ToastRootProps,
  ToastIconProps,
  ToastContentProps,
  ToastCloseProps,
};
