'use client'

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react'
import type { Routine, RoutineResult, SessionState } from '@/types'
import { useAuth } from './AuthContext'
import { auth } from '@/lib/firebase'

// 음성 인식 키워드
const COMPLETE_KEYWORDS = ['응', '어', '다 했어', '끝났어', '완료', '네', 'yes', 'done']
const EXTEND_KEYWORDS = ['조금만', '아직', '잠깐', '더', 'wait', 'not yet']
const SKIP_KEYWORDS = ['스킵', '넘어가', '패스', 'skip', 'next']

interface LiveSessionContextValue {
  state: SessionState
  currentRoutine: Routine | null
  currentRoutineIndex: number
  transcript: string
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  sessionResults: RoutineResult[]
  snoozeCount: number

  startSession: (routines: Routine[]) => Promise<void>
  endSession: () => Promise<void>
  completeRoutine: (method: 'auto' | 'manual') => void
  skipRoutine: () => void
  extendRoutine: (minutes: number) => void
  toggleAudio: () => void
  toggleVideo: () => void
  handleWakeUp: () => void
  handleSnooze: () => void
}

const LiveSessionContext = createContext<LiveSessionContextValue | null>(null)

export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<SessionState>('idle')
  const [routines, setRoutines] = useState<Routine[]>([])
  const [currentRoutineIndex, setCurrentRoutineIndex] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [sessionResults, setSessionResults] = useState<RoutineResult[]>([])
  const [snoozeCount, setSnoozeCount] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const currentRoutine = routines[currentRoutineIndex] || null

  const startSession = useCallback(async (userRoutines: Routine[]) => {
    if (!user || !auth?.currentUser) return

    setState('connecting')
    setRoutines(userRoutines)
    setCurrentRoutineIndex(0)
    setSessionResults([])
    setSnoozeCount(0)

    try {
      // Firebase ID Token 가져오기
      const idToken = await auth.currentUser.getIdToken()
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      }

      // Backend에서 Ephemeral Token 발급
      const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/ephemeral-token`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId: user.uid }),
      })
      
      if (!tokenRes.ok) {
        throw new Error(`Token fetch failed: ${tokenRes.status}`)
      }
      
      const tokenData = await tokenRes.json()

      // 세션 시작 API 호출
      const sessionRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/start`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId: user.uid }),
      })
      
      if (!sessionRes.ok) {
        throw new Error(`Session start failed: ${sessionRes.status}`)
      }
      
      const { sessionId } = await sessionRes.json()
      sessionIdRef.current = sessionId

      // Gemini Live API WebSocket 연결
      // 실제 구현 시 @google/genai SDK 사용 (tokenData.token 활용)
      // 여기서는 상태만 업데이트
      setState('wake_up')
      setIsAudioEnabled(false) // 하이브리드 모드: 시작 시 마이크 OFF
    } catch (error) {
      console.error('Session start failed:', error)
      setState('error')
    }
  }, [user])

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !auth?.currentUser) return

    try {
      const idToken = await auth.currentUser.getIdToken()
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionIdRef.current}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ results: sessionResults }),
      })
      
      if (!res.ok) {
        console.error('Session complete failed:', res.status)
      }
    } catch (error) {
      console.error('Session end failed:', error)
    }

    wsRef.current?.close()
    setState('report')
  }, [sessionResults])

  const completeRoutine = useCallback((method: 'auto' | 'manual') => {
    if (!currentRoutine) return

    const result: RoutineResult = {
      routineId: currentRoutine.id,
      routineName: currentRoutine.name,
      status: 'completed',
      completionMethod: method,
      actualDuration: currentRoutine.duration,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }

    setSessionResults((prev) => [...prev, result])
    setIsAudioEnabled(false) // 루틴 완료 후 마이크 OFF

    if (currentRoutineIndex < routines.length - 1) {
      setCurrentRoutineIndex((prev) => prev + 1)
      setState('routine')
    } else {
      endSession()
    }
  }, [currentRoutine, currentRoutineIndex, routines.length, endSession])

  const skipRoutine = useCallback(() => {
    if (!currentRoutine) return

    const result: RoutineResult = {
      routineId: currentRoutine.id,
      routineName: currentRoutine.name,
      status: 'skipped',
      completionMethod: null,
      actualDuration: null,
      startedAt: null,
      completedAt: null,
    }

    setSessionResults((prev) => [...prev, result])

    if (currentRoutineIndex < routines.length - 1) {
      setCurrentRoutineIndex((prev) => prev + 1)
    } else {
      endSession()
    }
  }, [currentRoutine, currentRoutineIndex, routines.length, endSession])

  const extendRoutine = useCallback((minutes: number) => {
    // 타이머 연장 로직 (UI에서 처리)
    console.log(`Extending routine by ${minutes} minutes`)
  }, [])

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled((prev) => !prev)
  }, [])

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => !prev)
  }, [])

  const handleWakeUp = useCallback(() => {
    setState('routine')
    setIsAudioEnabled(false) // 루틴 시작 시 마이크 OFF
  }, [])

  const handleSnooze = useCallback(() => {
    setSnoozeCount((prev) => prev + 1)
    // 5분 후 재알림 로직
  }, [])

  return (
    <LiveSessionContext.Provider
      value={{
        state,
        currentRoutine,
        currentRoutineIndex,
        transcript,
        isAudioEnabled,
        isVideoEnabled,
        sessionResults,
        snoozeCount,
        startSession,
        endSession,
        completeRoutine,
        skipRoutine,
        extendRoutine,
        toggleAudio,
        toggleVideo,
        handleWakeUp,
        handleSnooze,
      }}
    >
      {children}
    </LiveSessionContext.Provider>
  )
}

export function useLiveSession() {
  const context = useContext(LiveSessionContext)
  if (!context) {
    throw new Error('useLiveSession must be used within LiveSessionProvider')
  }
  return context
}

export { COMPLETE_KEYWORDS, EXTEND_KEYWORDS, SKIP_KEYWORDS }
