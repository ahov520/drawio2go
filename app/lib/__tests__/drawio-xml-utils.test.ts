import { describe, expect, it } from "vitest";
import { normalizeDiagramXml } from "../drawio-xml-utils";

const SAMPLE_XML = `<mxfile><diagram id="1">Hello</diagram></mxfile>`;
const BASE64_XML = Buffer.from(SAMPLE_XML, "utf-8").toString("base64");
const DATA_URI_XML = `data:image/svg+xml;base64,${BASE64_XML}`;

describe("normalizeDiagramXml", () => {
  it("直接返回纯 XML", () => {
    expect(normalizeDiagramXml(SAMPLE_XML)).toBe(SAMPLE_XML);
  });

  it("解码 data URI 前缀的 Base64", () => {
    expect(normalizeDiagramXml(DATA_URI_XML)).toBe(SAMPLE_XML);
  });

  it("解码裸 Base64", () => {
    expect(normalizeDiagramXml(BASE64_XML)).toBe(SAMPLE_XML);
  });

  it("空字符串抛出明确错误", () => {
    expect(() => normalizeDiagramXml("")).toThrow("XML payload 不能为空");
  });

  it("无法识别的输入抛出统一错误信息", () => {
    expect(() => normalizeDiagramXml("not-xml-or-base64")).toThrow(
      "无法识别的 XML 格式",
    );
  });
});
