/**
 * Electron 图标生成脚本
 *
 * 输入: public/icon/logo.svg
 * 输出: electron/assets/icon.png / icon.ico / icon.icns
 *
 * 说明:
 * - PNG: 512x512（Linux + 窗口图标）
 * - ICO: 16/32/48/256 多尺寸（Windows）
 * - ICNS: 多尺寸（macOS）
 */

const fs = require("fs");
const path = require("path");

const sharp = require("sharp");
const { Icns, IcnsImage } = require("@fiahfy/icns");
const { Ico, IcoImage } = require("@fiahfy/ico");

const projectRoot = path.join(__dirname, "..");
const inputSvgPath = path.join(projectRoot, "public", "icon", "logo.svg");
const outputDir = path.join(projectRoot, "electron", "assets");

const outputPngPath = path.join(outputDir, "icon.png");
const outputIcoPath = path.join(outputDir, "icon.ico");
const outputIcnsPath = path.join(outputDir, "icon.icns");

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: 输入文件不存在: ${filePath}`);
    process.exit(1);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function createSvgRasterizer(svgBuffer) {
  // density 越高，SVG -> PNG 的边缘越平滑，但更耗内存/CPU
  return (size) =>
    sharp(svgBuffer, { density: 1024 })
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
}

async function main() {
  ensureFileExists(inputSvgPath);
  ensureDir(outputDir);

  const svgBuffer = fs.readFileSync(inputSvgPath);
  const rasterize = createSvgRasterizer(svgBuffer);

  // 缓存不同尺寸的 PNG buffer，避免重复渲染 SVG
  const pngBySize = new Map();
  const getPng = async (size) => {
    if (!pngBySize.has(size)) {
      pngBySize.set(size, await rasterize(size));
    }
    return pngBySize.get(size);
  };

  // 1) PNG 512x512
  const png512 = await getPng(512);
  fs.writeFileSync(outputPngPath, png512);

  // 2) ICO（16/32/48/256）
  const ico = new Ico();
  for (const size of [16, 32, 48, 256]) {
    const png = await getPng(size);
    ico.append(IcoImage.fromPNG(png));
  }
  fs.writeFileSync(outputIcoPath, ico.data);

  // 3) ICNS（多尺寸）
  const icns = new Icns();

  // PNG-based icon types（含 @2x）
  const icnsTypes = [
    ["icp4", 16],
    ["icp5", 32],
    ["icp6", 64],
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024],
    // Retina (@2x) types
    ["ic11", 32],
    ["ic12", 64],
    ["ic13", 256],
    ["ic14", 512],
  ];

  for (const [osType, size] of icnsTypes) {
    const png = await getPng(size);
    icns.append(IcnsImage.fromPNG(png, osType));
  }

  fs.writeFileSync(outputIcnsPath, icns.data);

  // 基本校验（尺寸/条目）
  const pngMeta = await sharp(outputPngPath).metadata();
  if (pngMeta.width !== 512 || pngMeta.height !== 512) {
    throw new Error(
      `PNG 尺寸异常: 期望 512x512，实际 ${pngMeta.width}x${pngMeta.height}`,
    );
  }

  const parsedIco = Ico.from(fs.readFileSync(outputIcoPath));
  if (parsedIco.images.length < 4) {
    throw new Error(`ICO 条目异常: 期望 >=4，实际 ${parsedIco.images.length}`);
  }

  const parsedIcns = Icns.from(fs.readFileSync(outputIcnsPath));
  if (parsedIcns.images.length < 7) {
    throw new Error(
      `ICNS 条目异常: 期望 >=7，实际 ${parsedIcns.images.length}`,
    );
  }

  console.log("✓ 已生成 Electron 图标:");
  console.log(`  - ${path.relative(projectRoot, outputPngPath)}`);
  console.log(`  - ${path.relative(projectRoot, outputIcoPath)}`);
  console.log(`  - ${path.relative(projectRoot, outputIcnsPath)}`);
}

main().catch((err) => {
  console.error("图标生成失败:", err);
  process.exit(1);
});
