'use client'

import { useState, useEffect, useRef } from 'react'

interface TimerProps {
  duration: number // 초
  onComplete: () => void
  isPaused?: boolean
}

export function Timer({ duration, onComplete, isPaused = false }: TimerProps) {
  const [remaining, setRemaining] = useState(duration)
  const onCompleteRef = useRef(onComplete)
  const hasCompletedRef = useRef(false)
  
  // onComplete ref 업데이트 (의존성 배열에서 제거하기 위함)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // duration이 바뀌면 타이머 리셋
  useEffect(() => {
    setRemaining(duration)
    hasCompletedRef.current = false
  }, [duration])

  // 타이머 로직 - remaining을 의존성에서 제거
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // 중복 호출 방지
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true
            // setTimeout으로 상태 업데이트 후 콜백 호출
            setTimeout(() => onCompleteRef.current(), 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused, duration]) // remaining 제거, duration 추가

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <div className="text-4xl font-light text-[#F5B301] tabular-nums tracking-tight drop-shadow-sm">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  )
}
