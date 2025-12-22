import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Tool } from "ai";
import { useChatToolExecution } from "../useChatToolExecution";
import { AI_TOOL_NAMES } from "@/lib/constants/tool-names";
import {
  createFrontendDrawioTools,
  type FrontendToolContext,
} from "@/app/lib/frontend-tools";

describe("useChatToolExecution（错误结构）", () => {
  it("Zod 输入校验失败：返回 output-error，且 output 携带字段级 issues", async () => {
    const addToolResult = vi.fn(async (_args: unknown) => {});

    const frontendTools: Record<string, Tool> = {
      [AI_TOOL_NAMES.DRAWIO_EDIT_BATCH]: {
        // 不应被调用
        execute: vi.fn(),
      } as unknown as Tool,
    };

    const { result } = renderHook(() =>
      useChatToolExecution({
        frontendTools,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 测试中捕获完整 payload
        addToolResult: addToolResult as any,
      }),
    );

    await act(async () => {
      await result.current.executeToolCall({
        toolCallId: "call-1",
        toolName: AI_TOOL_NAMES.DRAWIO_EDIT_BATCH,
        input: { operations: "not-an-array" },
      });
    });

    expect(addToolResult).toHaveBeenCalledTimes(1);
    const payload = addToolResult.mock.calls[0]![0] as Record<string, unknown>;

    expect(payload.state).toBe("output-error");
    expect(payload.tool).toBe(AI_TOOL_NAMES.DRAWIO_EDIT_BATCH);
    expect(payload.toolCallId).toBe("call-1");
    expect(String(payload.errorText)).toContain("工具输入校验失败");

    const output = payload.output as Record<string, unknown>;
    expect(output.success).toBe(false);
    expect(output.error).toBe("zod_validation");
    expect(String(output.message)).toContain("工具输入校验失败");

    const details = output.errorDetails as Record<string, unknown>;
    expect(details.kind).toBe("zod_validation");
    expect(Array.isArray(details.issues)).toBe(true);
  });

  it("工具 execute 返回 ToolErrorResult：保持 state=output-error 且保留 output", async () => {
    const addToolResult = vi.fn(async (_args: unknown) => {});

    const frontendTools: Record<string, Tool> = {
      [AI_TOOL_NAMES.DRAWIO_READ]: {
        execute: vi.fn(async () => ({
          success: false,
          error: "xpath_error",
          message: "Invalid XPath",
          errorDetails: {
            kind: "xpath_error",
            expression: "///",
            error: "boom",
          },
        })),
      } as unknown as Tool,
    };

    const { result } = renderHook(() =>
      useChatToolExecution({
        frontendTools,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 测试中捕获完整 payload
        addToolResult: addToolResult as any,
      }),
    );

    await act(async () => {
      await result.current.executeToolCall({
        toolCallId: "call-2",
        toolName: AI_TOOL_NAMES.DRAWIO_READ,
        input: { xpath: "///" },
      });
    });

    const payload = addToolResult.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.state).toBe("output-error");
    expect(String(payload.errorText)).toContain("Invalid XPath");

    const output = payload.output as Record<string, unknown>;
    expect(output.success).toBe(false);
    expect(output.error).toBe("xpath_error");
    expect(output.message).toBe("Invalid XPath");
  });

  it("XML 解析错误：output.errorDetails.kind=xml_parse 且包含 formatted/定位信息", async () => {
    const addToolResult = vi.fn(async (_args: unknown) => {});

    const ctx: FrontendToolContext = {
      getDrawioXML: vi.fn(async () => "<mxfile></mxfile>"),
      replaceDrawioXML: vi.fn(async () => ({ success: true })),
      onVersionSnapshot: vi.fn(async () => {}),
      getPageFilterContext: () => ({
        selectedPageIds: [],
        isMcpContext: false,
      }),
    };

    const tools = createFrontendDrawioTools(ctx);

    const { result } = renderHook(() =>
      useChatToolExecution({
        frontendTools: tools as unknown as Record<string, Tool>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 测试中捕获完整 payload
        addToolResult: addToolResult as any,
      }),
    );

    await act(async () => {
      await result.current.executeToolCall({
        toolCallId: "call-xml",
        toolName: AI_TOOL_NAMES.DRAWIO_OVERWRITE,
        input: { drawio_xml: "<mxfile><diagram></mxfile>", description: "bad" },
      });
    });

    const payload = addToolResult.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.state).toBe("output-error");

    const output = payload.output as Record<string, unknown>;
    expect(output.success).toBe(false);

    const details = output.errorDetails as Record<string, unknown>;
    expect(details.kind).toBe("xml_parse");
    expect(typeof details.formatted).toBe("string");
  });
});
