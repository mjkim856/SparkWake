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
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-spark-gradient opacity-20 blur-xl',
            isSpeaking && 'animate-spark-pulse'
          )}
          style={{ transform: 'scale(1.5)' }}
        />
        
        {/* Main circle */}
        <div
          className={cn(
            'relative w-28 h-28 rounded-full bg-spark-gradient flex items-center justify-center shadow-lg',
            isSpeaking && 'animate-spark-pulse'
          )}
        >
          {/* Inner white circle */}
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-inner">
            {/* Audio bars */}
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 bg-spark-gradient rounded-full transition-all duration-150',
                    isSpeaking ? 'animate-spark-wave' : 'h-2'
                  )}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    height: isSpeaking ? undefined : '8px'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
