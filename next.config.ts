import type { NextConfig } from 'next';

// STATIC_EXPORT=1 이면 GitHub Pages용 정적 내보내기 (미들웨어는 CI에서 제외)
const isStatic = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = isStatic
  ? {
      output: 'export',
      basePath: '/green-fee-club',
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
