import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
  },
}

export default nextConfig
