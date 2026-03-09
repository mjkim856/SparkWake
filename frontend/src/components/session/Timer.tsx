'use client'

import { useState, useEffect } from 'react'

interface TimerProps {
  duration: number // 초
  onComplete: () => void
  isPaused?: boolean
}

export function Timer({ duration, onComplete, isPaused = false }: TimerProps) {
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

  return (
    <div className="text-4xl font-light text-[#F5B301] tabular-nums tracking-tight drop-shadow-sm">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  )
}
