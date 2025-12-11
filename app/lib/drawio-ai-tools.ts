import { tool } from "ai";

import {
  executeDrawioEditBatch,
  executeDrawioRead,
} from "./drawio-xml-service";
import { executeToolOnClient } from "./tool-executor";
import {
  drawioEditBatchInputSchema,
  drawioOverwriteInputSchema,
  drawioReadInputSchema,
} from "./schemas/drawio-tool-schemas";
import type { DrawioEditOperation } from "./schemas/drawio-tool-schemas";
import type { ReplaceXMLResult } from "@/app/types/drawio-tools";
import type { ToolExecutionContext } from "@/app/types/socket";
import { validateXMLFormat } from "./drawio-xml-utils";
import { AI_TOOL_NAMES, CLIENT_TOOL_NAMES } from "@/lib/constants/tool-names";

const { DRAWIO_READ, DRAWIO_EDIT_BATCH, DRAWIO_OVERWRITE } = AI_TOOL_NAMES;
const { REPLACE_DRAWIO_XML } = CLIENT_TOOL_NAMES;

function requireContext(
  context: ToolExecutionContext | undefined,
): ToolExecutionContext {
  const projectUuid = context?.projectUuid?.trim();
  const conversationId = context?.conversationId?.trim();

  if (!projectUuid || !conversationId) {
    throw new Error("无法获取项目上下文");
  }

  return { projectUuid, conversationId };
}

function createDrawioReadTool(getContext: () => ToolExecutionContext) {
  return tool({
    description:
      "读取 DrawIO 图表内容。支持三种方式：\n1. ls 模式（默认）：列出所有 mxCell，可用 filter 筛选 vertices（形状）或 edges（连线）\n2. xpath：XPath 精确查询，返回匹配的节点详细信息\n3. id：按 mxCell id 查询（支持单个或数组），快捷定位特定元素",
    inputSchema: drawioReadInputSchema.optional(),
    execute: async (input) => {
      const context = getContext();
      const xpath = input?.xpath?.trim();
      const id = input?.id;
      const filter = input?.filter ?? "all";
      return await executeDrawioRead({ xpath, id, filter }, context);
    },
  });
}

function createDrawioEditBatchTool(getContext: () => ToolExecutionContext) {
  return tool({
    description:
      "批量编辑 DrawIO 图表（原子操作：全部成功或全部回滚）。\n\n定位方式（二选一，同时提供时优先使用 id）：\n- id: 直接指定 mxCell id（转换为 //mxCell[@id='xxx']）\n- xpath: XPath 表达式\n\n操作类型：\n- set_attribute: 设置属性\n- remove_attribute: 移除属性\n- insert_element: 插入元素（使用 xpath/id 定位目标父节点）\n- remove_element: 删除元素\n- replace_element: 替换元素\n- set_text_content: 设置文本内容",
    inputSchema: drawioEditBatchInputSchema,
    execute: async ({ operations }) => {
      const context = getContext();
      return await executeDrawioEditBatch({ operations }, context);
    },
  });
}

function createDrawioOverwriteTool(getContext: () => ToolExecutionContext) {
  return tool({
    description:
      "完整覆写 DrawIO XML 内容。此操作会替换整个图表，用于模板替换等场景。XML 格式会被强制验证。",
    inputSchema: drawioOverwriteInputSchema,
    execute: async ({ drawio_xml }) => {
      const context = getContext();
      const validation = validateXMLFormat(drawio_xml);
      if (!validation.valid) {
        throw new Error(validation.error || "XML 验证失败");
      }

      // 调用前端工具覆写 XML
      return (await executeToolOnClient(
        REPLACE_DRAWIO_XML,
        { drawio_xml },
        context.projectUuid,
        context.conversationId,
        "覆写整个 DrawIO XML",
      )) as ReplaceXMLResult;
    },
  });
}

export function createDrawioTools(context: ToolExecutionContext) {
  const getContext = () => requireContext(context);

  return {
    [DRAWIO_READ]: createDrawioReadTool(getContext),
    [DRAWIO_EDIT_BATCH]: createDrawioEditBatchTool(getContext),
    [DRAWIO_OVERWRITE]: createDrawioOverwriteTool(getContext),
  };
}

export type DrawioTools = ReturnType<typeof createDrawioTools>;
