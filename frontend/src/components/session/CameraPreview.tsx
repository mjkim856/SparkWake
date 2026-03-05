'use client'

import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Camera, CameraOff } from 'lucide-react'

interface CameraPreviewProps {
  isActive: boolean
  onFrame?: (frame: ImageData) => void
  className?: string
}

export function CameraPreview({ isActive, onFrame, className }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isActive) {
      // 카메라 정지
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      return
    }

    // 카메라 시작
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setHasPermission(true)
      })
      .catch(() => {
        setHasPermission(false)
      })

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isActive])

  // 프레임 캡처 (1fps)
  useEffect(() => {
    if (!isActive || !onFrame || !hasPermission) return

    const interval = setInterval(() => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0, 640, 480)
      const frame = ctx.getImageData(0, 0, 640, 480)
      onFrame(frame)
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, onFrame, hasPermission])

  if (!isActive) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 rounded-lg', className)}>
        <CameraOff className="w-12 h-12 text-gray-400" />
      </div>
    )
  }

  if (hasPermission === false) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 rounded-lg', className)}>
        <div className="text-center text-gray-500">
          <Camera className="w-12 h-12 mx-auto mb-2" />
          <p>Camera permission denied</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" width={640} height={480} />
    </div>
  )
}
