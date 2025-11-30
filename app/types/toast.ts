export type ToastVariant = "success" | "info" | "warning" | "danger";

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant: ToastVariant;
  duration?: number; // 毫秒,默认 3200
}

export interface ToastContextValue {
  push(toast: Omit<Toast, "id">): string;
  dismiss(id: string): void;
  clear(): void;
}
