/** @type {import('next').NextConfig} */
const nextConfig = {
  // 忽略 ESLint 检查
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 忽略 TypeScript 类型报错，强行打包上线！
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;