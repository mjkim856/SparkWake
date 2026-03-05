'use client'

import { cn } from '@/lib/utils'

interface AudioVisualizerProps {
  isActive: boolean
  isSpeaking: boolean
  className?: string
}

export function AudioVisualizer({ isActive, isSpeaking, className }: AudioVisualizerProps) {
  if (!isActive) return null

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center',
          isSpeaking && 'animate-pulse'
        )}
      >
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
          <div
            className={cn(
              'w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500',
              isSpeaking && 'animate-ping'
            )}
          />
        </div>
      </div>
    </div>
  )
}
