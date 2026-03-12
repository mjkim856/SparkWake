import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // PWA 설정은 next-pwa 패키지로 처리
  // 프로덕션 빌드 시 활성화
  reactStrictMode: true,
  
  // Firebase Hosting을 위한 static export
  output: 'export',
  
  // 이미지 최적화 (static export에서는 unoptimized 필요)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

export default nextConfig
