'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import type { Routine, RoutineResult, SessionState } from '@/types'
import { useAuth } from './AuthContext'
import { auth } from '@/lib/firebase'
import { createLiveSession, startMicrophoneStream, AudioPlayer, LiveSession } from '@/lib/gemini-live'

// 음성 인식 키워드
const COMPLETE_KEYWORDS = ['응', '어', '다 했어', '끝났어', '완료', '네', 'yes', 'done']
const EXTEND_KEYWORDS = ['조금만', '아직', '잠깐', '더', 'wait', 'not yet']
const SKIP_KEYWORDS = ['스킵', '넘어가', '패스', 'skip', 'next']

interface LiveSessionContextValue {
  state: SessionState
  currentRoutine: Routine | null
  currentRoutineIndex: number
  transcript: string
  aiMessage: string
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
  const [aiMessage, setAiMessage] = useState('')
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [sessionResults, setSessionResults] = useState<RoutineResult[]>([])
  const [snoozeCount, setSnoozeCount] = useState(0)

  const liveSessionRef = useRef<LiveSession | null>(null)
  const micStreamRef = useRef<{ stop: () => void } | null>(null)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const currentRoutine = routines[currentRoutineIndex] || null

  const startSession = useCallback(async (userRoutines: Routine[]) => {
    if (!user || !auth?.currentUser) return

    setState('connecting')
    setRoutines(userRoutines)
    setCurrentRoutineIndex(0)
    setSessionResults([])
    setSnoozeCount(0)
    setAiMessage('')

    try {
      // Firebase ID Token 획득
      const currentUser = auth?.currentUser
      if (!currentUser) {
        throw new Error('User not authenticated')
      }
      const idToken = await currentUser.getIdToken()

      // Backend에서 Ephemeral Token 발급
      const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/gemini/ephemeral-token`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })
      if (!tokenRes.ok) {
        throw new Error(`Token fetch failed: ${tokenRes.status}`)
      }
      const tokenData = await tokenRes.json()

      // 오디오 플레이어 초기화
      audioPlayerRef.current = new AudioPlayer()

      // 시스템 프롬프트
      const systemPrompt = `당신은 미라클 모닝 AI 코치입니다. 한국어로 짧고 친절하게 대화하세요.
사용자 루틴: ${userRoutines.map((r, i) => `${i + 1}. ${r.name} (${r.duration}분)`).join(', ')}
규칙: 1-2문장으로 짧게, 격려하며, 루틴 완료/스킵 시 다음 안내`

      // Gemini Live 세션 연결
      const session = await createLiveSession(tokenData.token, systemPrompt, {
        onOpen: () => setState('wake_up'),
        onMessage: (text) => setAiMessage(text),
        onAudio: (data) => audioPlayerRef.current?.enqueue(data),
        onError: (e) => console.error('Gemini Live error:', e),
        onClose: () => console.log('Gemini Live closed'),
        onInterrupted: () => audioPlayerRef.current?.clear(),
      })

      liveSessionRef.current = session
      sessionIdRef.current = new Date().toISOString().split('T')[0]
    } catch (error) {
      console.error('Session start failed:', error)
      setState('error')
    }
  }, [user])

  const endSession = useCallback(async () => {
    micStreamRef.current?.stop()
    micStreamRef.current = null
    liveSessionRef.current?.close()
    liveSessionRef.current = null
    audioPlayerRef.current?.close()
    audioPlayerRef.current = null
    setState('report')
  }, [])

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

  const toggleAudio = useCallback(async () => {
    if (isAudioEnabled) {
      micStreamRef.current?.stop()
      micStreamRef.current = null
      setIsAudioEnabled(false)
    } else {
      try {
        const stream = await startMicrophoneStream((data) => {
          liveSessionRef.current?.sendAudio(data)
        })
        micStreamRef.current = stream
        setIsAudioEnabled(true)
      } catch (e) {
        console.error('Microphone access failed:', e)
      }
    }
  }, [isAudioEnabled])

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => !prev)
  }, [])

  const handleWakeUp = useCallback(() => {
    setState('routine')
    if (liveSessionRef.current?.isConnected() && currentRoutine) {
      liveSessionRef.current.send(`좋은 아침! 첫 번째 루틴 "${currentRoutine.name}"을 시작해볼까요?`)
    }
  }, [currentRoutine])

  const handleSnooze = useCallback(() => {
    setSnoozeCount((prev) => prev + 1)
    // 5분 후 재알림 로직
  }, [])

  // 컴포넌트 언마운트 시 리소스 정리
  useEffect(() => {
    return () => {
      // 마이크 스트림 정리
      if (micStreamRef.current) {
        micStreamRef.current.stop()
        micStreamRef.current = null
      }
      // Gemini Live 세션 정리
      if (liveSessionRef.current) {
        liveSessionRef.current.close()
        liveSessionRef.current = null
      }
      // 오디오 플레이어 정리
      if (audioPlayerRef.current) {
        audioPlayerRef.current.close()
        audioPlayerRef.current = null
      }
    }
  }, [])

  return (
    <LiveSessionContext.Provider
      value={{
        state,
        currentRoutine,
        currentRoutineIndex,
        transcript,
        aiMessage,
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
