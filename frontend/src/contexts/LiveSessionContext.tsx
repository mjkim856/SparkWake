'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import type { Routine, RoutineResult, SessionState, ToolCall, FunctionResponse } from '@/types'
import { useAuth } from './AuthContext'
import { auth } from '@/lib/firebase'
import { createLiveSession, startMicrophoneStream, AudioPlayer, LiveSession } from '@/lib/gemini-live'

// 음성 인식 키워드
const COMPLETE_KEYWORDS = ['응', '어', '다 했어', '끝났어', '완료', '네', 'yes', 'done']
const EXTEND_KEYWORDS = ['조금만', '아직', '잠깐', '더', 'wait', 'not yet']
const SKIP_KEYWORDS = ['스킵', '넘어가', '패스', 'skip', 'next']

// 기본 YouTube 영상 ID (검색어별)
const DEFAULT_YOUTUBE_VIDEOS: Record<string, string> = {
  '요가': 'VaoV1PrYft4',
  'yoga': 'VaoV1PrYft4',
  '스트레칭': 'g_tea8ZNk5A',
  'stretch': 'g_tea8ZNk5A',
  '명상': 'inpok4MKVLM',
  'meditation': 'inpok4MKVLM',
  '운동': 'ml6cT4AZdqI',
  'exercise': 'ml6cT4AZdqI',
  'workout': 'ml6cT4AZdqI',
  'default': 'VaoV1PrYft4',  // 기본값: 아침 요가
}

/**
 * Extracts a YouTube video ID from common YouTube URL formats.
 *
 * @param url - A YouTube URL or text containing a YouTube video reference
 * @returns The extracted video ID, or `null` if no ID is found
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

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
  youtubeVideoId: string | null

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
  closeYouTube: () => void
}

const LiveSessionContext = createContext<LiveSessionContextValue | null>(null)

/**
 * Provides LiveSessionContext and manages the live-session lifecycle, state, and controls for routine flows,
 * including audio/video toggles, video verification, YouTube playback orchestration, tool-call handling, and session reporting.
 *
 * @returns A LiveSessionContext.Provider wrapping the given children and exposing session state, routine data, control actions, and lifecycle handlers.
 */
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
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)

  const liveSessionRef = useRef<LiveSession | null>(null)
  const micStreamRef = useRef<{ stop: () => void } | null>(null)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  
  // 콜백에서 최신 상태 참조를 위한 ref
  const currentRoutineRef = useRef<Routine | null>(null)
  const isVideoEnabledRef = useRef(false)
  const routinesRef = useRef<Routine[]>([])
  const currentRoutineIndexRef = useRef(0)

  const currentRoutine = routines[currentRoutineIndex] || null
  
  // ref 동기화 - 즉시 동기화 (useEffect 대신 직접 할당)
  currentRoutineRef.current = currentRoutine
  isVideoEnabledRef.current = isVideoEnabled
  routinesRef.current = routines
  currentRoutineIndexRef.current = currentRoutineIndex

  // Tool Call 핸들러 (Function Calling) - startSession보다 먼저 정의
  const handleToolCall = useCallback((toolCall: ToolCall) => {
    console.log('[TOOL] Handling tool call:', toolCall)
    const functionResponses: FunctionResponse[] = []
    
    for (const fc of toolCall.functionCalls) {
      let result = { result: 'ok' }
      
      switch (fc.name) {
        case 'play_youtube': {
          const videoId = fc.args.videoId as string | undefined
          const query = fc.args.query as string | undefined
          
          let targetVideoId = videoId
          
          // 1. 현재 루틴에 YouTube 링크가 있으면 그걸 먼저 사용
          const currentRoutine = currentRoutineRef.current
          if (!targetVideoId && currentRoutine?.link) {
            const routineLink = currentRoutine.link
            if (routineLink.includes('youtube.com') || routineLink.includes('youtu.be')) {
              // YouTube URL에서 videoId 추출
              const extractedId = extractYouTubeVideoId(routineLink)
              if (extractedId) {
                targetVideoId = extractedId
                console.log('[TOOL] Using routine link videoId:', targetVideoId)
              }
            }
          }
          
          // 2. videoId가 없으면 query로 기본 영상 찾기
          if (!targetVideoId && query) {
            const lowerQuery = query.toLowerCase()
            for (const [keyword, id] of Object.entries(DEFAULT_YOUTUBE_VIDEOS)) {
              if (lowerQuery.includes(keyword)) {
                targetVideoId = id
                break
              }
            }
          }
          
          // 3. 여전히 없으면 기본값
          if (!targetVideoId) {
            targetVideoId = DEFAULT_YOUTUBE_VIDEOS['default']
          }
          
          setYoutubeVideoId(targetVideoId)
          result = { result: `YouTube 영상 재생 시작: ${targetVideoId}` }
          console.log('[TOOL] play_youtube:', targetVideoId)
          break
        }
        
        case 'complete_routine': {
          if (currentRoutineRef.current) {
            const routine = currentRoutineRef.current
            const routineResult: RoutineResult = {
              routineId: routine.id,
              routineName: routine.name,
              status: 'completed',
              completionMethod: 'auto',
              actualDuration: routine.duration,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            }
            
            setSessionResults((prev) => [...prev, routineResult])
            setVideoRecognized(false)
            setYoutubeVideoId(null)
            
            const currentIdx = currentRoutineIndexRef.current
            const allRoutines = routinesRef.current
            
            if (currentIdx < allRoutines.length - 1) {
              setCurrentRoutineIndex(currentIdx + 1)
              const nextRoutine = allRoutines[currentIdx + 1]
              setIsVideoEnabled(nextRoutine?.videoVerification || false)
            } else {
              setIsVideoEnabled(false)
              setState('report')
            }
          }
          result = { result: '루틴 완료 처리됨' }
          console.log('[TOOL] complete_routine')
          break
        }
        
        case 'skip_routine': {
          if (currentRoutineRef.current) {
            const routine = currentRoutineRef.current
            const routineResult: RoutineResult = {
              routineId: routine.id,
              routineName: routine.name,
              status: 'skipped',
              completionMethod: null,
              actualDuration: null,
              startedAt: null,
              completedAt: null,
            }
            
            setSessionResults((prev) => [...prev, routineResult])
            setVideoRecognized(false)
            setYoutubeVideoId(null)
            
            const currentIdx = currentRoutineIndexRef.current
            const allRoutines = routinesRef.current
            
            if (currentIdx < allRoutines.length - 1) {
              setCurrentRoutineIndex(currentIdx + 1)
              const nextRoutine = allRoutines[currentIdx + 1]
              setIsVideoEnabled(nextRoutine?.videoVerification || false)
            } else {
              setIsVideoEnabled(false)
              setState('report')
            }
          }
          result = { result: '루틴 스킵됨' }
          console.log('[TOOL] skip_routine')
          break
        }
        
        default:
          result = { result: `알 수 없는 도구: ${fc.name}` }
      }
      
      functionResponses.push({
        id: fc.id,
        name: fc.name,
        response: result,
      })
    }
    
    // AI에게 결과 전달
    liveSessionRef.current?.sendToolResponse(functionResponses)
  }, [])


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

## 오늘의 루틴 목록
${userRoutines.map((r, i) => {
  const hasYouTube = r.link && (r.link.includes('youtube.com') || r.link.includes('youtu.be'))
  if (r.videoVerification) {
    return `${i + 1}. [루틴 제목]: ${r.name} (${r.duration}분)
   [미션]: "${r.actionDescription || '행동 확인'}"
   → 이 루틴은 비디오 인증이 필요합니다. 사용자가 [미션]을 수행해야 합니다.`
  }
  if (hasYouTube) {
    return `${i + 1}. [루틴 제목]: ${r.name} (${r.duration}분)
   [YouTube 링크]: 있음
   → 이 루틴 시작 시 play_youtube를 즉시 호출하세요!`
  }
  return `${i + 1}. [루틴 제목]: ${r.name} (${r.duration}분)`
}).join('\n')}

## 중요: 루틴 제목과 미션은 다릅니다!
- [루틴 제목]: 루틴의 이름 (예: "Hand Yoga", "Morning Stretch")
- [미션]: 비디오로 확인할 실제 행동 (예: "show hand", "wave", "손 흔들기")
- 루틴 제목이 아닌 [미션]을 사용자에게 안내하세요!

## 기본 규칙
- 1-2문장으로 짧게, 격려하며 대화
- 루틴 시작 시 [미션]이 있으면 반드시 미션 내용을 안내하세요

## ⭐ YouTube 영상 자동 재생 규칙 (매우 중요!)
- 루틴에 [YouTube 링크]가 있으면, 루틴 시작할 때 **즉시** play_youtube를 호출하세요!
- 사용자가 요청하기 전에 먼저 재생하세요!
- 예: "요가 영상 재생할게요!" 라고 말하면서 play_youtube() 호출

## 비디오 인증 규칙 (매우 중요!!!)

### 1단계: 미션 안내 (루틴 시작 시)
- "[미션] 행동을 해주세요!" 라고 안내
- 이때 "완료"라는 단어를 절대 사용하지 마세요!
- 예: "손을 카메라에 보여주세요!"

### 2단계: 미션 확인 대기
- 카메라로 사용자 행동을 관찰합니다
- 아직 행동이 안 보이면 격려하세요
- 이때도 "완료"라는 단어를 사용하지 마세요!

### 3단계: 미션 완료 선언 (행동이 확인된 후에만!)
- 카메라에서 [미션] 행동이 실제로 확인되면 그때만!
- 반드시 다음 중 하나를 말하세요:
  - "미션 완료!"
  - "확인 완료!"
  - "인증 완료!"

### 절대 금지
- 미션 안내하면서 동시에 "완료"라고 말하기
- 행동 확인 전에 "완료"라고 말하기
- 예시 (잘못됨): "손을 보여주세요! 미션 완료!" ← 이렇게 하면 안 됨!
- 예시 (올바름): "손을 보여주세요!" → (손 확인 후) → "잘했어요! 미션 완료!"

## 사용 가능한 도구 (Function Calling)
당신은 다음 도구들을 사용할 수 있습니다:

1. **play_youtube**: YouTube 영상 재생
   - 사용자가 "영상 틀어줘", "비디오 재생", "요가 영상 보여줘" 등 요청하면 호출
   - videoId 또는 query 파라미터 사용

2. **complete_routine**: 현재 루틴 완료 처리
   - 사용자가 "다 했어", "완료", "끝났어" 등 말하면 호출
   - 비디오 인증 완료 후에도 호출 가능

3. **skip_routine**: 현재 루틴 스킵
   - 사용자가 "스킵", "넘어가", "패스" 등 말하면 호출

## 도구 사용 예시
- "요가 영상 틀어줘" → play_youtube(query: "요가")
- "다 했어" → complete_routine()
- "이거 스킵할래" → skip_routine()`

      const session = await createLiveSession(tokenData.token, systemPrompt, {
        onOpen: () => setState('wake_up'),
        onMessage: (text) => {
          setAiMessage(text)
          
          // 비디오 인식 결과 처리 - ref를 통해 최신 상태 확인
          const currentIdx = currentRoutineIndexRef.current
          const allRoutines = routinesRef.current
          const routineForCheck = allRoutines[currentIdx]
          const hasVideoVerification = routineForCheck?.videoVerification || false
          
          // 비디오 인증이 필요한 루틴인 경우에만 체크
          if (hasVideoVerification || isVideoEnabledRef.current) {
            const lowerText = text.toLowerCase()
            
            // 부정어 체크 (한국어 + 영어) - 부정문이면 매칭하지 않음
            const negativePatterns = /아직|안\s|않|아니|못\s|없|not yet|haven't|hasn't|didn't|don't|can't|couldn't|unable/i
            if (negativePatterns.test(lowerText)) {
              return
            }
            
            // 엄격한 패턴 매칭 (한국어 + 영어)
            const strictPatterns = [
              // 한국어 - 완료 키워드 (가장 넓은 매칭)
              /완료/,
              /확인.*됐/,
              /확인.*됨/,
              /확인.*했/,
              /인증.*성공/,
              /성공/,
              /잘\s*했/,
              /잘\s*하셨/,
              /미션.*클리어/,
              /보여요/,
              /보입니다/,
              /보이네요/,
              // 영어
              /verified/i,
              /confirmed/i,
              /completed/i,
              /done/i,
              /finished/i,
              /great job/i,
              /well done/i,
              /nice/i,
              /perfect/i,
              /got it/i,
              /i see/i,
              /i can see/i,
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
        onToolCall: handleToolCall,
      })

      liveSessionRef.current = session
      sessionIdRef.current = new Date().toISOString().split('T')[0]
    } catch (error) {
      console.error('Session start failed:', error)
      setState('error')
    }
  }, [user, handleToolCall])

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
        const hasYouTube = nextRoutine?.link && 
          (nextRoutine.link.includes('youtube.com') || nextRoutine.link.includes('youtu.be'))
        
        if (hasYouTube && nextRoutine?.videoVerification && nextRoutine?.actionDescription) {
          liveSessionRef.current.send(
            `[시스템] 다음 루틴을 시작합니다.
루틴 제목: "${nextRoutine.name}" (${nextRoutine.duration}분)
YouTube 링크: "${nextRoutine.link}"
미션: "${nextRoutine.actionDescription}"
⚠️ 지금 바로 play_youtube를 호출하여 영상을 재생하세요! 그리고 사용자에게 미션을 안내하세요.`
          )
        } else if (hasYouTube) {
          liveSessionRef.current.send(
            `[시스템] 다음 루틴을 시작합니다.
루틴 제목: "${nextRoutine?.name}" (${nextRoutine?.duration}분)
YouTube 링크: "${nextRoutine?.link}"
⚠️ 지금 바로 play_youtube를 호출하여 영상을 재생하세요!`
          )
        } else if (nextRoutine?.videoVerification && nextRoutine?.actionDescription) {
          liveSessionRef.current.send(
            `[시스템] 다음 루틴을 시작합니다.
루틴 제목: "${nextRoutine.name}" (${nextRoutine.duration}분)
미션: "${nextRoutine.actionDescription}"
사용자에게 미션 행동을 안내하고, 카메라에서 확인되면 "미션 완료!"라고 말하세요.`
          )
        } else {
          liveSessionRef.current.send(`다음 루틴: "${nextRoutine?.name}" (${nextRoutine?.duration}분)`)
        }
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
        const hasYouTube = nextRoutine?.link && 
          (nextRoutine.link.includes('youtube.com') || nextRoutine.link.includes('youtu.be'))
        
        if (hasYouTube && nextRoutine?.videoVerification && nextRoutine?.actionDescription) {
          liveSessionRef.current.send(
            `[시스템] 다음 루틴을 시작합니다.
루틴 제목: "${nextRoutine.name}" (${nextRoutine.duration}분)
YouTube 링크: "${nextRoutine.link}"
미션: "${nextRoutine.actionDescription}"
⚠️ 지금 바로 play_youtube를 호출하여 영상을 재생하세요! 그리고 사용자에게 미션을 안내하세요.`
          )
        } else if (hasYouTube) {
          liveSessionRef.current.send(
            `[시스템] 다음 루틴을 시작합니다.
루틴 제목: "${nextRoutine?.name}" (${nextRoutine?.duration}분)
YouTube 링크: "${nextRoutine?.link}"
⚠️ 지금 바로 play_youtube를 호출하여 영상을 재생하세요!`
          )
        } else if (nextRoutine?.videoVerification && nextRoutine?.actionDescription) {
          liveSessionRef.current.send(
            `[시스템] 다음 루틴을 시작합니다.
루틴 제목: "${nextRoutine.name}" (${nextRoutine.duration}분)
미션: "${nextRoutine.actionDescription}"
사용자에게 미션 행동을 안내하고, 카메라에서 확인되면 "미션 완료!"라고 말하세요.`
          )
        } else {
          liveSessionRef.current.send(`다음 루틴: "${nextRoutine?.name}" (${nextRoutine?.duration}분)`)
        }
      }
    } else {
      setIsVideoEnabled(false)
      endSession()
    }
  }, [currentRoutine, currentRoutineIndex, routines, endSession])

  const extendRoutine = useCallback((minutes: number) => {
    console.log(`Extending routine by ${minutes} minutes`)
  }, [])

  // YouTube 닫기
  const closeYouTube = useCallback(() => {
    setYoutubeVideoId(null)
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
      // Check if routine has YouTube link
      const hasYouTube = firstRoutine.link && 
        (firstRoutine.link.includes('youtube.com') || firstRoutine.link.includes('youtu.be'))
      
      if (hasYouTube && firstRoutine.videoVerification && firstRoutine.actionDescription) {
        // YouTube + Video verification
        liveSessionRef.current.send(
          `[시스템] 첫 번째 루틴을 시작합니다.
루틴 제목: "${firstRoutine.name}"
YouTube 링크: "${firstRoutine.link}"
미션: "${firstRoutine.actionDescription}"
⚠️ 지금 바로 play_youtube를 호출하여 영상을 재생하세요! 그리고 사용자에게 미션을 안내하세요.`
        )
      } else if (hasYouTube) {
        // YouTube only
        liveSessionRef.current.send(
          `[시스템] 첫 번째 루틴을 시작합니다.
루틴 제목: "${firstRoutine.name}"
YouTube 링크: "${firstRoutine.link}"
⚠️ 지금 바로 play_youtube를 호출하여 영상을 재생하세요!`
        )
      } else if (firstRoutine.videoVerification && firstRoutine.actionDescription) {
        // Video verification only
        liveSessionRef.current.send(
          `[시스템] 첫 번째 루틴을 시작합니다.
루틴 제목: "${firstRoutine.name}"
미션: "${firstRoutine.actionDescription}"
사용자에게 미션 행동을 안내하고, 카메라에서 확인되면 "미션 완료!"라고 말하세요.`
        )
      } else {
        liveSessionRef.current.send(`좋은 아침! 첫 번째 루틴 "${firstRoutine.name}"을 시작해볼까요?`)
      }
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
        youtubeVideoId,
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
        closeYouTube,
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
