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
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // onComplete ref 업데이트 (의존성 배열에서 제거하기 위함)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // duration이 바뀌면 타이머 리셋
  useEffect(() => {
    setRemaining(duration)
    hasCompletedRef.current = false
    // duration 변경 시 pending timeout 정리
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current)
      completionTimeoutRef.current = null
    }
  }, [duration])

  // 타이머 로직 - remaining을 의존성에서 제거
  useEffect(() => {
    if (isPaused) return

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // 타이머 완료 시 interval 즉시 정리
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          // 중복 호출 방지
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true
            // setTimeout으로 상태 업데이트 후 콜백 호출
            completionTimeoutRef.current = setTimeout(() => {
              onCompleteRef.current()
              completionTimeoutRef.current = null
            }, 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      // cleanup: interval과 timeout 모두 정리
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current)
        completionTimeoutRef.current = null
      }
    }
  }, [isPaused, duration]) // remaining 제거, duration 추가

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <div className="text-4xl font-light text-[#F5B301] tabular-nums tracking-tight drop-shadow-sm">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  )
}
