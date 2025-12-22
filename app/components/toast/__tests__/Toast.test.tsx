import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
import { Toast } from "../Toast";
import type { Toast as ToastItem } from "@/app/types/toast";

// i18n hook mock：返回兜底翻译，避免依赖真实环境
vi.mock("@/app/i18n/hooks", () => ({
  useAppTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

const createToast = (override: Partial<ToastItem> = {}): ToastItem => ({
  id: override.id ?? "toast-id",
  description: override.description ?? "测试描述",
  variant: override.variant ?? "info",
  title: override.title,
  duration: override.duration,
});

const createOnDismiss = (
  impl?: (id: string) => void,
): Mock<(id: string) => void> => vi.fn<(id: string) => void>(impl);

const createTimerHarness = (
  duration: number,
  toastId: string,
  onDismiss: (id: string) => void,
) => {
  let remaining = duration;
  let startedAt = Date.now();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const start = () => {
    startedAt = Date.now();
    timeoutId = setTimeout(() => onDismiss(toastId), remaining);
  };

  const pause = vi.fn((_id: string) => {
    const elapsed = Date.now() - startedAt;
    remaining = Math.max(remaining - elapsed, 0);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });

  const resume = vi.fn((id: string) => {
    startedAt = Date.now();
    timeoutId = setTimeout(() => onDismiss(id), remaining || 1);
  });

  return {
    start,
    pause,
    resume,
    getRemaining: () => remaining,
    getStartedAt: () => startedAt,
  };
};

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("variant 渲染", () => {
    const cases: Array<{
      variant: ToastItem["variant"];
      iconClass: string;
      role: "alert" | "status";
    }> = [
      { variant: "success", iconClass: "lucide-circle-check", role: "status" },
      { variant: "info", iconClass: "lucide-info", role: "status" },
      { variant: "warning", iconClass: "lucide-triangle-alert", role: "alert" },
      { variant: "danger", iconClass: "lucide-circle-x", role: "alert" },
    ];

    it.each(cases)(
      "$variant 显示正确的图标、role 和 data-variant",
      ({ variant, iconClass, role }) => {
        render(
          <Toast
            toast={createToast({
              variant,
              description: `${variant}-desc`,
              title: `${variant}-title`,
            })}
            onDismiss={vi.fn()}
            onPause={vi.fn()}
            onResume={vi.fn()}
          />,
        );

        const toastEl = screen.getByRole(role);
        expect(toastEl).toHaveAttribute("data-variant", variant);

        const iconEl = toastEl.querySelector(".toast__content")
          ?.previousElementSibling as SVGElement | undefined;
        expect(iconEl?.tagName.toLowerCase()).toBe("svg");
        expect(iconEl?.getAttribute("class") ?? "").toContain(iconClass);

        expect(toastEl).toHaveAttribute("role", role);
      },
    );
  });

  describe("内容渲染", () => {
    it("显示 description，title 可选且关闭按钮存在", () => {
      render(
        <Toast
          toast={createToast({ title: "可选标题", description: "主体内容" })}
          onDismiss={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
        />,
      );

      expect(screen.getByText("主体内容")).toBeInTheDocument();
      expect(screen.getByText("可选标题")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Close notification" }),
      ).toBeInTheDocument();
    });

    it("title 为空时不渲染标题元素", () => {
      render(
        <Toast
          toast={createToast({ title: undefined, description: "仅描述" })}
          onDismiss={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
        />,
      );

      expect(screen.queryByText("仅描述")).toBeInTheDocument();
      expect(document.querySelector(".toast__title")).toBeNull();
    });
  });

  describe("交互暂停/恢复", () => {
    it("Hover 暂停并精确恢复剩余时间", async () => {
      const duration = 2000;
      const dismissedAt: number[] = [];
      const onDismiss = createOnDismiss(() => dismissedAt.push(Date.now()));
      const toast = createToast({
        description: "hover 计时",
        variant: "info",
        duration,
      });
      const timer = createTimerHarness(duration, toast.id, onDismiss);
      const user = userEvent.setup({
        advanceTimers: vi.advanceTimersByTimeAsync,
      });

      render(
        <Toast
          toast={toast}
          onDismiss={onDismiss}
          onPause={timer.pause}
          onResume={timer.resume}
        />,
      );

      const toastEl = screen.getByRole("status");

      timer.start();
      vi.advanceTimersByTime(1000);
      await user.hover(toastEl);
      await vi.advanceTimersByTimeAsync(10);

      expect(timer.pause).toHaveBeenCalledWith(toast.id);
      const expectedRemaining = duration - 1000;
      expect(timer.getRemaining()).toBeGreaterThanOrEqual(
        expectedRemaining - 100,
      );
      expect(timer.getRemaining()).toBeLessThanOrEqual(expectedRemaining + 100);

      onDismiss.mockClear();

      vi.advanceTimersByTime(1500);
      expect(onDismiss).not.toHaveBeenCalled();

      await user.unhover(toastEl);
      await vi.advanceTimersByTimeAsync(10);
      expect(timer.resume).toHaveBeenCalledWith(toast.id);

      const remaining = timer.getRemaining();
      const almostAll = Math.max(remaining - 50, 0);

      vi.advanceTimersByTime(almostAll);
      expect(dismissedAt.length).toBe(0);

      vi.advanceTimersByTime(50);
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(dismissedAt[0]).toBeGreaterThanOrEqual(timer.getStartedAt());
    });

    it("Focus 暂停，失焦恢复并按剩余时间关闭", async () => {
      const duration = 1500;
      const dismissedAt: number[] = [];
      const onDismiss = createOnDismiss(() => dismissedAt.push(Date.now()));
      const toast = createToast({
        description: "focus 计时",
        variant: "info",
        duration,
      });
      const timer = createTimerHarness(duration, toast.id, onDismiss);
      const user = userEvent.setup({
        advanceTimers: vi.advanceTimersByTimeAsync,
      });

      render(
        <div>
          <Toast
            toast={toast}
            onDismiss={onDismiss}
            onPause={timer.pause}
            onResume={timer.resume}
          />
          <button type="button">outside</button>
        </div>,
      );

      const toastEl = screen.getByRole("status");
      const outside = screen.getByRole("button", { name: "outside" });

      timer.start();
      vi.advanceTimersByTime(500);

      await user.tab();
      await vi.advanceTimersByTimeAsync(10);
      expect(toastEl).toHaveFocus();
      expect(timer.pause).toHaveBeenCalledWith(toast.id);
      onDismiss.mockClear();
      vi.runOnlyPendingTimers();

      vi.advanceTimersByTime(400);
      expect(onDismiss).not.toHaveBeenCalled();

      fireEvent.blur(toastEl, { relatedTarget: outside });
      outside.focus();
      expect(timer.resume).toHaveBeenCalledWith(toast.id);

      const remaining = timer.getRemaining();

      vi.clearAllTimers();
      onDismiss.mockClear();
      dismissedAt.length = 0;
      const resumeStartedAt = Date.now();
      const manualTimer = setTimeout(() => onDismiss(toast.id), remaining);

      vi.advanceTimersByTime(Math.max(remaining - 50, 0));
      expect(dismissedAt.length).toBe(0);

      vi.advanceTimersByTime(50);
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(dismissedAt[0]).toBeGreaterThanOrEqual(resumeStartedAt);

      clearTimeout(manualTimer);
    });

    it("Esc 键与关闭按钮触发 dismiss", async () => {
      const onDismiss = createOnDismiss();
      const toast = createToast({ description: "可关闭", variant: "success" });
      const user = userEvent.setup({
        advanceTimers: vi.advanceTimersByTimeAsync,
      });

      render(
        <Toast
          toast={toast}
          onDismiss={onDismiss}
          onPause={vi.fn()}
          onResume={vi.fn()}
        />,
      );

      const toastEl = screen.getByRole("status");
      toastEl.focus();

      await user.keyboard("{Escape}");
      await vi.advanceTimersByTimeAsync(10);
      expect(onDismiss).toHaveBeenCalledTimes(1);

      const closeButton = screen.getByRole("button", {
        name: "Close notification",
      });
      await user.click(closeButton);
      await vi.advanceTimersByTimeAsync(10);
      expect(onDismiss).toHaveBeenCalledTimes(2);
    });
  });

  describe("动画状态", () => {
    it("初始挂载添加 toast--open 类名", async () => {
      render(
        <Toast
          toast={createToast({ description: "open" })}
          onDismiss={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
        />,
      );

      const toastEl = screen.getByRole("status");
      expect(toastEl.className).toContain("toast--open");
    });

    it("isLeaving=true 时添加 toast--leaving", () => {
      render(
        <Toast
          toast={createToast({ description: "leaving" })}
          onDismiss={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          isLeaving
        />,
      );

      const toastEl = screen.getByRole("status");
      expect(toastEl.className).toContain("toast--leaving");
    });
  });

  describe("可访问性", () => {
    it("可聚焦且角色正确", () => {
      render(
        <Toast
          toast={createToast({ variant: "warning", description: "可访问" })}
          onDismiss={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
        />,
      );

      const toastEl = screen.getByRole("alert");
      expect(toastEl).toHaveAttribute("tabIndex", "0");
      expect(toastEl.getAttribute("role")).toBe("alert");
    });
  });
});
