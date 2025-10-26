/** @type {import('next').NextConfig} */
const nextConfig = {
  // 优化 HeroUI 导入
  transpilePackages: ["@heroui/react", "@heroui/styles"],

  // 实验性功能：优化包导入
  experimental: {
    optimizePackageImports: ["@heroui/react"],
  },

  // 生产环境输出配置
  output: process.env.NODE_ENV === "production" ? "export" : undefined,

  // 图片优化配置
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
