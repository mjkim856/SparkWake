'use client'

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react'
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
  isAiSpeaking: boolean
  isInterrupted: boolean
  sessionResults: RoutineResult[]
  snoozeCount: number

  startSession: (routines: Routine[]) => Promise<void>
  endSession: () => Promise<void>
  completeRoutine: (method: 'auto' | 'manual' | 'voice') => void
  skipRoutine: () => void
  extendRoutine: (minutes: number) => void
  toggleAudio: () => void
  toggleVideo: () => void
  handleWakeUp: () => void
  handleSnooze: () => void
  sendVideoFrame: (imageData: ImageData) => void
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
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isInterrupted, setIsInterrupted] = useState(false)
  const [sessionResults, setSessionResults] = useState<RoutineResult[]>([])
  const [snoozeCount, setSnoozeCount] = useState(0)

  const liveSessionRef = useRef<LiveSession | null>(null)
  const micStreamRef = useRef<{ stop: () => void } | null>(null)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const stateRef = useRef<SessionState>('idle')
  const routinesRef = useRef<Routine[]>([])
  const currentRoutineIndexRef = useRef(0)

  // refs 동기화
  stateRef.current = state
  routinesRef.current = routines
  currentRoutineIndexRef.current = currentRoutineIndex

  const currentRoutine = routines[currentRoutineIndex] || null

  // 음성 키워드 처리 함수
  const handleVoiceCommand = useCallback((text: string) => {
    const lowerText = text.toLowerCase()
    
    // 완료 키워드 체크
    if (COMPLETE_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()))) {
      if (stateRef.current === 'wake_up') {
        setState('routine')
        const routine = routinesRef.current[0]
        if (routine && liveSessionRef.current?.isConnected()) {
          liveSessionRef.current.send(`좋아요! 첫 번째 루틴 "${routine.name}"을 시작해볼까요?`)
        }
      } else if (stateRef.current === 'routine' || stateRef.current === 'verification') {
        // completeRoutine을 직접 호출하지 않고 이벤트로 처리
        const event = new CustomEvent('voiceCommand', { detail: { type: 'complete' } })
        window.dispatchEvent(event)
      }
      return
    }
    
    // 스킵 키워드 체크
    if (SKIP_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()))) {
      const event = new CustomEvent('voiceCommand', { detail: { type: 'skip' } })
      window.dispatchEvent(event)
      return
    }
    
    // 연장 키워드 체크
    if (EXTEND_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()))) {
      const event = new CustomEvent('voiceCommand', { detail: { type: 'extend' } })
      window.dispatchEvent(event)
      return
    }
  }, [])

  const startSession = useCallback(async (userRoutines: Routine[]) => {
    if (!user || !auth?.currentUser) return

    setState('connecting')
    setRoutines(userRoutines)
    setCurrentRoutineIndex(0)
    setSessionResults([])
    setSnoozeCount(0)
    setAiMessage('')

    try {
      // Firebase ID Token 가져오기
      const idToken = await auth?.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error('Not authenticated')
      }

      // Backend에서 Ephemeral Token 발급
      const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/gemini/ephemeral-token`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
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
        onOpen: () => {
          setState('wake_up')
          // 세션 시작 시 AI가 먼저 인사
          setTimeout(() => {
            session.send('좋은 아침이에요! 일어나셨나요?')
          }, 500)
        },
        onMessage: (text) => {
          setAiMessage(text)
          // 사용자 발화 transcript 처리 (AI 응답이 아닌 경우)
          if (text && !text.startsWith('[AI]')) {
            setTranscript(text)
            handleVoiceCommand(text)
          }
        },
        onAudio: (data) => {
          setIsAiSpeaking(true)
          audioPlayerRef.current?.enqueue(data)
        },
        onAudioEnd: () => {
          setIsAiSpeaking(false)
        },
        onError: (e) => {
          console.error('Gemini Live error:', e)
          setState('error')
        },
        onClose: () => {
          console.log('Gemini Live closed')
          setIsAiSpeaking(false)
        },
        onInterrupted: () => {
          // Barge-in: 사용자가 끼어들면 AI 응답 즉시 중단
          setIsInterrupted(true)
          setIsAiSpeaking(false)
          audioPlayerRef.current?.clear()
          setTimeout(() => setIsInterrupted(false), 1000)
        },
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

  const completeRoutine = useCallback((method: 'auto' | 'manual' | 'voice') => {
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

    // AI에게 완료 알림
    if (liveSessionRef.current?.isConnected()) {
      const nextIndex = currentRoutineIndex + 1
      if (nextIndex < routines.length) {
        const nextRoutine = routines[nextIndex]
        liveSessionRef.current.send(`"${currentRoutine.name}" 완료! 다음은 "${nextRoutine.name}"이에요.`)
      } else {
        liveSessionRef.current.send(`모든 루틴 완료! 오늘도 수고했어요!`)
      }
    }

    if (currentRoutineIndex < routines.length - 1) {
      setCurrentRoutineIndex((prev) => prev + 1)
      setState('routine')
    } else {
      endSession()
    }
  }, [currentRoutine, currentRoutineIndex, routines, endSession])

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
    // AI에게 스누즈 알림
    if (liveSessionRef.current?.isConnected()) {
      const newCount = snoozeCount + 1
      if (newCount >= 3) {
        liveSessionRef.current.send('벌써 3번째 스누즈예요! 이번엔 정말 일어나야 해요!')
      } else {
        liveSessionRef.current.send(`알겠어요, 5분 후에 다시 깨울게요. (${newCount}/3)`)
      }
    }
  }, [snoozeCount])

  // 비디오 프레임 전송 (Live API로)
  const sendVideoFrame = useCallback((imageData: ImageData) => {
    if (!liveSessionRef.current?.isConnected() || !isVideoEnabled) return
    
    // ImageData를 base64로 변환하여 전송
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.putImageData(imageData, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
    
    // Live API로 이미지 전송
    liveSessionRef.current.send(`[VIDEO_FRAME]${base64}`)
  }, [isVideoEnabled])

  // 음성 명령 이벤트 리스너
  useCallback(() => {
    const handleVoiceEvent = (e: CustomEvent<{ type: string }>) => {
      if (e.detail.type === 'complete') {
        completeRoutine('voice')
      } else if (e.detail.type === 'skip') {
        skipRoutine()
      } else if (e.detail.type === 'extend') {
        extendRoutine(2)
      }
    }
    
    window.addEventListener('voiceCommand', handleVoiceEvent as EventListener)
    return () => window.removeEventListener('voiceCommand', handleVoiceEvent as EventListener)
  }, [completeRoutine, skipRoutine, extendRoutine])

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
        isAiSpeaking,
        isInterrupted,
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
        sendVideoFrame,
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
