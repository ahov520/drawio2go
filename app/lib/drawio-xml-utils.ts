const DATA_URI_PREFIX = "data:image/svg+xml;base64,";

/**
 * 统一的 DrawIO XML 归一化工具
 *
 * 支持三种输入：
 * 1) 纯 XML 字符串
 * 2) 带 data URI 前缀的 Base64
 * 3) 裸 Base64
 *
 * @throws 当输入为空、解码失败或解码结果不是合法 XML 时抛出错误
 */
export function normalizeDiagramXml(payload: string): string {
  if (!payload) {
    throw new Error("XML payload 不能为空");
  }

  const trimmed = payload.trimStart();

  // 1. 已经是 XML，直接返回（保留原始内容，避免破坏缩进）
  if (trimmed.startsWith("<")) {
    return payload;
  }

  // 2. data URI 前缀的 Base64
  if (trimmed.startsWith(DATA_URI_PREFIX)) {
    const base64Content = trimmed.slice(DATA_URI_PREFIX.length);
    try {
      return decodeBase64(base64Content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`无法解码带前缀的 Base64 XML: ${message}`);
    }
  }

  // 3. 裸 Base64
  try {
    const decoded = decodeBase64(trimmed);
    if (decoded.trimStart().startsWith("<")) {
      return decoded;
    }
    throw new Error("解码结果不是有效的 XML");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      "无法识别的 XML 格式：既不是纯 XML，也不是有效的 Base64。" +
        "请提供 XML 字符串、data URI 格式的 Base64，或裸 Base64。" +
        `错误：${message}`,
    );
  }
}

/**
 * 跨平台 Base64 解码（Node / 浏览器）
 */
export function decodeBase64(base64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  if (typeof atob !== "undefined") {
    const binaryString = atob(base64);
    const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }

  throw new Error("当前运行环境不支持 Base64 解码");
}
