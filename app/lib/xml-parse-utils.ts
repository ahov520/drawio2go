import { DOMParser as XmldomParser } from "@xmldom/xmldom";

export interface XmlParseLocation {
  line: number;
  column: number;
  lineText: string;
  pointer: string;
}

export interface XmlParseFailureInfo {
  /** 清理后的错误消息（不包含行列后缀） */
  error: string;
  /** 原始解析器错误消息（保留以便调试） */
  rawError: string;
  location?: XmlParseLocation;
  /** 适合直接展示给用户的多行信息（含片段与指针） */
  formatted: string;
}

function extractLineAndColumn(
  rawMessage: string,
): { line: number; col: number } | null {
  const match =
    rawMessage.match(/@#\[\s*line:(\d+)\s*,\s*col:(\d+)\s*\]/i) ??
    rawMessage.match(/\bline:(\d+)\s*,\s*col:(\d+)\b/i);

  if (!match) return null;

  const line = Number.parseInt(match[1] ?? "", 10);
  const col = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(line) || !Number.isFinite(col)) return null;
  if (line <= 0 || col <= 0) return null;

  return { line, col };
}

function stripLocatorSuffix(message: string): string {
  const trimmedRight = message.trimEnd();
  const marker = "@#[line:";
  const markerIndex = trimmedRight.lastIndexOf(marker);
  if (markerIndex < 0) return trimmedRight;

  const suffix = trimmedRight.slice(markerIndex);
  if (!suffix.endsWith("]")) return trimmedRight;

  let i = marker.length;
  const isDigit = (ch: string | undefined) =>
    Boolean(ch && ch >= "0" && ch <= "9");

  if (!isDigit(suffix[i])) return trimmedRight;
  while (isDigit(suffix[i])) i += 1;

  if (!suffix.startsWith(",col:", i)) return trimmedRight;
  i += ",col:".length;

  if (!isDigit(suffix[i])) return trimmedRight;
  while (isDigit(suffix[i])) i += 1;

  if (suffix[i] !== "]" || i !== suffix.length - 1) return trimmedRight;

  return trimmedRight.slice(0, markerIndex).trimEnd();
}

function cleanXmldomMessage(rawMessage: string): string {
  const withoutPrefix = rawMessage
    .trim()
    .replace(/^\[xmldom\s+(?:warning|error)\]\s*/i, "")
    .replace(/^\[xmldom\]\s*/i, "");

  return stripLocatorSuffix(withoutPrefix).trim();
}

function buildLocation(
  xml: string,
  line: number,
  column: number,
): XmlParseLocation {
  const normalizedLine = Math.max(1, Math.trunc(line));
  const normalizedColumn = Math.max(1, Math.trunc(column));

  const lines = xml.split(/\r\n|\r|\n/);
  const lineText = lines[normalizedLine - 1] ?? "";

  const pointer = `${"-".repeat(Math.max(0, normalizedColumn - 1))}^`;
  return { line: normalizedLine, column: normalizedColumn, lineText, pointer };
}

export function formatXmlParseError(
  info: Pick<XmlParseFailureInfo, "error" | "location">,
): string {
  if (!info.location) {
    return `XML parsing error: ${info.error}`;
  }

  const { line, column, lineText, pointer } = info.location;
  return [
    `XML parsing error at line ${line}, column ${column}:`,
    `  ${lineText}`,
    `  ${pointer}`,
    `Error: ${info.error}`,
  ].join("\n");
}

export function tryParseXmlWithLocator(
  xml: string,
  mimeType: "text/xml" | "image/svg+xml" = "text/xml",
):
  | { success: true; document: Document }
  | ({ success: false } & XmlParseFailureInfo) {
  let rawError: string | null = null;

  const parser = new XmldomParser({
    locator: {},
    errorHandler: {
      warning: (msg) => {
        if (!rawError) rawError = String(msg);
      },
      error: (msg) => {
        if (!rawError) rawError = String(msg);
      },
      fatalError: (msg) => {
        if (!rawError) rawError = String(msg);
      },
    },
  });

  const document = parser.parseFromString(xml, mimeType);

  if (!rawError) {
    return { success: true, document };
  }

  const error = cleanXmldomMessage(rawError) || "XML 解析失败";
  const position = extractLineAndColumn(rawError);
  const location = position
    ? buildLocation(xml, position.line, position.col)
    : undefined;
  const formatted = formatXmlParseError({ error, location });

  return {
    success: false,
    error,
    rawError,
    location,
    formatted,
  };
}
