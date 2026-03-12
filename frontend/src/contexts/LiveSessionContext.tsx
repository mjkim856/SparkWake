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
  videoRecognized: boolean
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
  sendVideoFrame: (frame: ImageData) => void
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
  const [videoRecognized, setVideoRecognized] = useState(false)
  const [sessionResults, setSessionResults] = useState<RoutineResult[]>([])
  const [snoozeCount, setSnoozeCount] = useState(0)

  const liveSessionRef = useRef<LiveSession | null>(null)
  const micStreamRef = useRef<{ stop: () => void } | null>(null)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  
  // 콜백에서 최신 상태 참조를 위한 ref
  const currentRoutineRef = useRef<Routine | null>(null)
  const isVideoEnabledRef = useRef(false)

  const currentRoutine = routines[currentRoutineIndex] || null
  
  // ref 동기화
  useEffect(() => {
    currentRoutineRef.current = currentRoutine
  }, [currentRoutine])
  
  useEffect(() => {
    isVideoEnabledRef.current = isVideoEnabled
  }, [isVideoEnabled])


  const startSession = useCallback(async (userRoutines: Routine[]) => {
    if (!user || !auth?.currentUser) return

    setState('connecting')
    setRoutines(userRoutines)
    setCurrentRoutineIndex(0)
    setSessionResults([])
    setSnoozeCount(0)
    setAiMessage('')
    setVideoRecognized(false)

    try {
      const currentUser = auth?.currentUser
      if (!currentUser) {
        throw new Error('User not authenticated')
      }
      const idToken = await currentUser.getIdToken()

      const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/gemini/ephemeral-token`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })
      if (!tokenRes.ok) {
        throw new Error(`Token fetch failed: ${tokenRes.status}`)
      }
      const tokenData = await tokenRes.json()

      audioPlayerRef.current = new AudioPlayer()

      // 시스템 프롬프트 (강화된 버전)
      const systemPrompt = `당신은 미라클 모닝 AI 코치입니다. 한국어로 짧고 친절하게 대화하세요.

사용자 루틴: ${userRoutines.map((r, i) => `${i + 1}. ${r.name} (${r.duration}분)${r.videoVerification ? ` [비디오 인증: ${r.actionDescription || '행동 확인'}]` : ''}`).join(', ')}

규칙:
- 1-2문장으로 짧게, 격려하며 대화
- 루틴 완료/스킵 시 다음 루틴 안내

비디오 인증 규칙 (매우 중요):
- 비디오가 활성화된 루틴에서는 카메라로 사용자의 행동을 관찰합니다
- 사용자가 요청된 행동을 수행하면 반드시 "확인 완료" 또는 "인증 완료"라고 말하세요
- 예: 손 흔들기 요청 → 손이 보이면 "손이 보여요! 확인 완료!"
- 행동이 확인되면 무조건 "완료" 단어를 포함해서 말하세요`

      const session = await createLiveSession(tokenData.token, systemPrompt, {
        onOpen: () => setState('wake_up'),
        onMessage: (text) => {
          setAiMessage(text)
          
          // 비디오 인식 결과 처리 (엄격한 키워드 매칭)
          if (currentRoutineRef.current && isVideoEnabledRef.current) {
            const lowerText = text.toLowerCase()
            
            // 부정어 체크 (한국어 + 영어) - 부정문이면 매칭하지 않음
            const negativePatterns = /아직|안\s|않|아니|못\s|없|not yet|haven't|hasn't|didn't|don't|can't|couldn't|unable/i
            if (negativePatterns.test(lowerText)) {
              return
            }
            
            // 엄격한 패턴 매칭 (한국어 + 영어)
            const strictPatterns = [
              // 한국어
              /확인\s*(완료|됐|됨|했)/,
              /인증\s*(완료|됐|됨|성공)/,
              /완료(됐|됨|했|입니다|예요|야|!)/,
              /성공(했|됐|이에요|입니다|!)/,
              /잘\s*(했어|했습니다|했네|하셨)/,
              // 영어
              /(verified|confirmed|completed|done|finished|great job|well done|nice|perfect|got it)/i,
              /you('ve| have)?\s*(done|did|completed|finished)/i,
              /i (can )?(see|confirm|verify)/i,
            ]
            
            const isVerified = strictPatterns.some(pattern => pattern.test(lowerText))
            
            if (isVerified) {
              setVideoRecognized(true)
            }
          }
        },
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
    // 마이크 스트림 정리
    if (micStreamRef.current) {
      micStreamRef.current.stop()
      micStreamRef.current = null
    }
    setIsAudioEnabled(false)
    setVideoRecognized(false)

    if (currentRoutineIndex < routines.length - 1) {
      setCurrentRoutineIndex((prev) => prev + 1)
      setState('routine')
      
      const nextRoutine = routines[currentRoutineIndex + 1]
      setIsVideoEnabled(nextRoutine?.videoVerification || false)
      
      // AI에게 다음 루틴 정보 알려주기
      if (liveSessionRef.current?.isConnected()) {
        const videoInfo = nextRoutine?.videoVerification 
          ? `비디오 인증이 필요합니다. 행동: ${nextRoutine.actionDescription || '행동 확인'}` 
          : '비디오 인증 없음'
        liveSessionRef.current.send(`다음 루틴: "${nextRoutine?.name}" (${nextRoutine?.duration}분). ${videoInfo}`)
      }
    } else {
      setIsVideoEnabled(false)
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
    setVideoRecognized(false)

    if (currentRoutineIndex < routines.length - 1) {
      const nextIndex = currentRoutineIndex + 1
      setCurrentRoutineIndex(nextIndex)
      
      const nextRoutine = routines[nextIndex]
      setIsVideoEnabled(nextRoutine?.videoVerification || false)
      
      // AI에게 다음 루틴 정보 알려주기
      if (liveSessionRef.current?.isConnected()) {
        const videoInfo = nextRoutine?.videoVerification 
          ? `비디오 인증이 필요합니다. 행동: ${nextRoutine.actionDescription || '행동 확인'}` 
          : '비디오 인증 없음'
        liveSessionRef.current.send(`다음 루틴: "${nextRoutine?.name}" (${nextRoutine?.duration}분). ${videoInfo}`)
      }
    } else {
      setIsVideoEnabled(false)
      endSession()
    }
  }, [currentRoutine, currentRoutineIndex, routines, endSession])

  const extendRoutine = useCallback((minutes: number) => {
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
    const firstRoutine = routines[0]
    if (firstRoutine?.videoVerification) {
      setIsVideoEnabled(true)
    }
    if (liveSessionRef.current?.isConnected() && firstRoutine) {
      liveSessionRef.current.send(`좋은 아침! 첫 번째 루틴 "${firstRoutine.name}"을 시작해볼까요?`)
    }
  }, [routines])

  const handleSnooze = useCallback(() => {
    setSnoozeCount((prev) => prev + 1)
  }, [])

  const sendVideoFrame = useCallback((frame: ImageData) => {
    if (liveSessionRef.current?.isConnected() && isVideoEnabled) {
      liveSessionRef.current.sendVideo(frame)
    }
  }, [isVideoEnabled])


  // 컴포넌트 언마운트 시 리소스 정리
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.stop()
        micStreamRef.current = null
      }
      if (liveSessionRef.current) {
        liveSessionRef.current.close()
        liveSessionRef.current = null
      }
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
        videoRecognized,
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
