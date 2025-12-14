import { z } from "zod";

/**
 * DrawIO AI 工具参数的统一 Zod Schema 定义。
 * 作为 drawio_read / drawio_edit_batch / drawio_overwrite 的单一真源，避免分散校验逻辑。
 */

export const operationSchema = z
  .object({
    type: z
      .enum([
        "set_attribute",
        "remove_attribute",
        "insert_element",
        "remove_element",
        "replace_element",
        "set_text_content",
      ])
      .describe(
        "批量编辑的操作类型：设置/移除属性、插入/删除/替换元素或设置文本内容",
      ),
    xpath: z
      .string()
      .optional()
      .describe("XPath 定位表达式，与 id 二选一；若同时提供将优先使用 id"),
    id: z
      .string()
      .optional()
      .describe("mxCell id 定位，快捷匹配元素；提供后优先于 xpath"),
    key: z
      .string()
      .optional()
      .describe("属性名，仅 set_attribute / remove_attribute 需要"),
    value: z
      .string()
      .optional()
      .describe("属性值或文本内容，set_attribute / set_text_content 使用"),
    new_xml: z
      .string()
      .optional()
      .describe("插入或替换时的新 XML 片段，须为合法 mxCell 节点"),
    position: z
      .enum(["append_child", "prepend_child", "before", "after"])
      .optional()
      .describe(
        "insert_element 时的插入位置：作为子节点追加/前置，或作为兄弟节点前后插入",
      ),
    allow_no_match: z
      .boolean()
      .optional()
      .describe("是否允许定位无匹配时跳过操作而不报错，默认 false"),
  })
  .describe("drawio_edit_batch 的单条原子操作定义")
  .superRefine((operation, ctx) => {
    const ensureNonEmptyIfProvided = (
      value: string | undefined,
      path: (string | number)[],
      message: string,
    ) => {
      if (value === undefined) return;

      if (typeof value !== "string" || value.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message,
        });
      }
    };

    const hasXpath =
      typeof operation.xpath === "string" && operation.xpath.trim() !== "";
    const hasId =
      typeof operation.id === "string" && operation.id.trim() !== "";

    if (!hasXpath && !hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "xpath 或 id 至少需要提供一个定位方式",
      });
    }

    ensureNonEmptyIfProvided(operation.xpath, ["xpath"], "xpath 不能为空");
    ensureNonEmptyIfProvided(operation.id, ["id"], "id 不能为空");

    switch (operation.type) {
      case "set_attribute": {
        if (operation.key === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["key"],
            message: "key 不能为空",
          });
        }
        ensureNonEmptyIfProvided(operation.key, ["key"], "key 不能为空");
        if (typeof operation.value !== "string") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["value"],
            message: "value 必须是字符串",
          });
        }
        break;
      }
      case "remove_attribute": {
        if (operation.key === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["key"],
            message: "key 不能为空",
          });
        }
        ensureNonEmptyIfProvided(operation.key, ["key"], "key 不能为空");
        break;
      }
      case "insert_element":
      case "replace_element": {
        // insert_element 和 replace_element 都需要 new_xml
        if (operation.new_xml === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["new_xml"],
            message: "new_xml 不能为空",
          });
        }
        ensureNonEmptyIfProvided(
          operation.new_xml,
          ["new_xml"],
          "new_xml 不能为空",
        );
        break;
      }
      case "remove_element": {
        break;
      }
      case "set_text_content": {
        if (typeof operation.value !== "string") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["value"],
            message: "value 必须是字符串",
          });
        }
        break;
      }
      default:
        break;
    }
  });

export const drawioReadInputSchema = z
  .object({
    xpath: z
      .string()
      .optional()
      .describe("XPath 精确查询表达式，用于直接匹配目标节点"),
    id: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe("按 mxCell id 查询，支持单个字符串或字符串数组"),
    filter: z
      .enum(["all", "vertices", "edges"])
      .optional()
      .describe("ls 模式下的类型过滤：全部/顶点/连线，默认 all"),
    description: z
      .string()
      .optional()
      .describe(
        '可选的操作描述。简要说明此次读取操作的目的，例如："查询登录按钮样式"、"检查页面布局结构"。如不提供将使用默认描述。',
      ),
  })
  .describe("drawio_read 工具的输入参数定义")
  .superRefine((data, ctx) => {
    if (data.xpath && data.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "xpath 和 id 不能同时提供，请仅使用其中一个定位方式",
      });
    }

    if (data.filter && (data.xpath || data.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "filter 参数仅在 ls 模式（未提供 xpath 或 id）时生效",
      });
    }
  });

export const drawioEditBatchInputSchema = z
  .object({
    operations: z
      .array(operationSchema)
      .min(1, "operations 至少包含一项操作")
      .describe("按顺序执行的原子操作列表，全部成功或全部回滚"),
    description: z
      .string()
      .optional()
      .describe(
        '可选操作描述。简要说明此次批量编辑的目的和内容，例如："将登录按钮颜色改为红色"、"调整页面布局间距"。如不提供将使用默认描述。',
      ),
  })
  .describe("drawio_edit_batch 工具的输入：批量编辑请求体");

export const drawioOverwriteInputSchema = z
  .object({
    drawio_xml: z
      .string()
      .min(1, "drawio_xml 不能为空")
      .describe("完整的 DrawIO XML 字符串，提交前会进行格式校验"),
    description: z
      .string()
      .optional()
      .describe(
        '可选操作描述。简要说明此次覆写操作的目的，例如："应用新模板"、"重构整体架构"。如不提供将使用默认描述。',
      ),
  })
  .describe("drawio_overwrite 工具的输入：用于完整替换图表内容");

// --------- 类型导出（供外部使用的单一真源）---------
/**
 * 批量编辑的单条原子操作类型，替代原先 app/types/drawio-tools.ts 中的定义。
 */
export type DrawioEditOperation = z.infer<typeof operationSchema>;
/**
 * drawio_read 输入参数类型（zod 推导）。
 */
export type DrawioReadInput = z.infer<typeof drawioReadInputSchema>;
/**
 * 批量编辑输入类型（operations 数组包装）。
 */
export type DrawioEditBatchRequest = z.infer<typeof drawioEditBatchInputSchema>;
/**
 * 覆写 XML 的输入类型。
 */
export type DrawioOverwriteInput = z.infer<typeof drawioOverwriteInputSchema>;
