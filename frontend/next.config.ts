import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export for Firebase Hosting
  output: 'export',
  
  // PWA 설정은 next-pwa 패키지로 처리
  // 프로덕션 빌드 시 활성화
  reactStrictMode: true,
  
  // 이미지 최적화
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    unoptimized: true, // static export에서 필요
  },
}

export default nextConfig
