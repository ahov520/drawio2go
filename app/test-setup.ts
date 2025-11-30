import "@testing-library/jest-dom";

import { Blob as NodeBlob } from "buffer";

if (
  typeof Blob !== "undefined" &&
  !(Blob.prototype as { stream?: () => void }).stream
) {
  // 使用 Node 的 Blob 以获得 .stream() 支持，兼容依赖 CompressionStream 的测试
  const nodeBlob = NodeBlob as unknown as typeof Blob;
  (globalThis as unknown as { Blob: typeof Blob }).Blob = nodeBlob;
}
