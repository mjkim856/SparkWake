'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface TimerProps {
  duration: number // 초
  onComplete: () => void
  isPaused?: boolean
  className?: string
}

export function Timer({ duration, onComplete, isPaused = false, className }: TimerProps) {
  const [remaining, setRemaining] = useState(duration)

  useEffect(() => {
    setRemaining(duration)
  }, [duration])

  useEffect(() => {
    if (isPaused || remaining <= 0) return

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused, remaining, onComplete])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = ((duration - remaining) / duration) * 100

  return (
    <div className={cn('text-center', className)}>
      <div className="text-4xl font-mono font-bold mb-4">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
