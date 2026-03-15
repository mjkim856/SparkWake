'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import type { Routine, RoutineResult, SessionState, ToolCall, FunctionResponse, DailyReport } from '@/types'
import { useAuth } from './AuthContext'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
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

// YouTube URL에서 videoId 추출
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
  youtubeError: string | null

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
  const [youtubeError, setYoutubeError] = useState<string | null>(null)

  const liveSessionRef = useRef<LiveSession | null>(null)
  const micStreamRef = useRef<{ stop: () => void } | null>(null)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  
  // 콜백에서 최신 상태 참조를 위한 ref
  const currentRoutineRef = useRef<Routine | null>(null)
  const isVideoEnabledRef = useRef(false)
  const routinesRef = useRef<Routine[]>([])
  const currentRoutineIndexRef = useRef(0)
  
  // Tool Call에서 사용할 함수 ref (순환 의존성 해결)
  const completeRoutineRef = useRef<((method: 'auto' | 'manual') => void) | null>(null)
  const skipRoutineRef = useRef<(() => void) | null>(null)

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
              if (keyword !== 'default' && lowerQuery.includes(keyword)) {
                targetVideoId = id
                break
              }
            }
          }
          
          // 3. 유효한 videoId가 있으면 재생, 없으면 에러 표시
          if (targetVideoId) {
            setYoutubeVideoId(targetVideoId)
            setYoutubeError(null)
            result = { result: `YouTube 영상 재생 시작: ${targetVideoId}` }
            console.log('[TOOL] play_youtube:', targetVideoId)
          } else {
            setYoutubeVideoId(null)
            setYoutubeError('Video not found')
            result = { result: '영상을 찾을 수 없습니다. 루틴에 YouTube 링크를 설정하거나 다른 검색어를 시도해주세요.' }
            console.log('[TOOL] play_youtube: video not found')
          }
          break
        }
        
        case 'complete_routine': {
          // 기존 completeRoutine 함수 재사용 (중복 로직 제거)
          if (completeRoutineRef.current) {
            completeRoutineRef.current('auto')
          }
          result = { result: '루틴 완료 처리됨' }
          console.log('[TOOL] complete_routine')
          break
        }
        
        case 'skip_routine': {
          // 기존 skipRoutine 함수 재사용 (중복 로직 제거)
          if (skipRoutineRef.current) {
            skipRoutineRef.current()
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

      // System prompt (English version for hackathon)
      const systemPrompt = `You are a Miracle Morning AI Coach. Speak in short, friendly sentences in English.

## Today's Routine List
${userRoutines.map((r, i) => {
  const hasYouTube = r.link && (r.link.includes('youtube.com') || r.link.includes('youtu.be'))
  if (r.videoVerification) {
    return `${i + 1}. [Routine]: ${r.name} (${r.duration} min)
   [Mission]: "${r.actionDescription || 'Action verification'}"
   → This routine requires video verification. User must perform the [Mission].`
  }
  if (hasYouTube) {
    return `${i + 1}. [Routine]: ${r.name} (${r.duration} min)
   [YouTube Link]: Available
   → Call play_youtube immediately when this routine starts!`
  }
  return `${i + 1}. [Routine]: ${r.name} (${r.duration} min)`
}).join('\n')}

## Important: Routine title and Mission are different!
- [Routine]: The name of the routine (e.g., "Hand Yoga", "Morning Stretch")
- [Mission]: The actual action to verify via video (e.g., "show hand", "wave")
- Guide the user with the [Mission], not the routine title!

## Basic Rules
- Keep responses to 1-2 sentences, be encouraging
- When starting a routine with a [Mission], always explain the mission

## ⭐ YouTube Auto-Play Rules (Very Important!)
- If a routine has a [YouTube Link], call play_youtube IMMEDIATELY when the routine starts!
- Play it before the user asks!
- Example: Say "Let me play the video for you!" while calling play_youtube()

## Video Verification Rules (Very Important!!!)

### Step 1: Mission Guidance (When routine starts)
- Say "Please [Mission action]!"
- DO NOT use the word "complete" or "done" at this point!
- Example: "Please show your hands to the camera!"

### Step 2: Wait for Mission
- Observe user's action through camera
- Encourage if action is not visible yet
- Still DO NOT use "complete" or "done"!

### Step 3: Declare Mission Complete (Only after action is confirmed!)
- Only when the [Mission] action is actually confirmed on camera!
- You MUST say one of these:
  - "Mission complete!"
  - "Verified!"
  - "Great job, done!"

### Absolutely Forbidden
- Saying "complete" while giving mission guidance
- Saying "done" before confirming the action
- Wrong: "Show your hands! Mission complete!" ← Don't do this!
- Correct: "Show your hands!" → (after seeing hands) → "Great job! Mission complete!"

## Available Tools (Function Calling)
You can use these tools:

1. **play_youtube**: Play YouTube video
   - Call when user says "play video", "show me yoga video", etc.
   - Use videoId or query parameter

2. **complete_routine**: Mark current routine as complete
   - Call when user says "done", "finished", "completed", etc.
   - Can also call after video verification is complete

3. **skip_routine**: Skip current routine
   - Call when user says "skip", "next", "pass", etc.

## Tool Usage Examples
- "Play yoga video" → play_youtube(query: "yoga")
- "I'm done" → complete_routine()
- "Skip this one" → skip_routine()`

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

  // 리포트 저장용 ref (최신 sessionResults 참조)
  const sessionResultsRef = useRef<RoutineResult[]>([])
  sessionResultsRef.current = sessionResults

  const endSession = useCallback(async () => {
    micStreamRef.current?.stop()
    micStreamRef.current = null
    liveSessionRef.current?.close()
    liveSessionRef.current = null
    audioPlayerRef.current?.close()
    audioPlayerRef.current = null

    // 약간의 지연 후 저장 (상태 업데이트 완료 대기)
    setTimeout(async () => {
      const finalResults = sessionResultsRef.current
      
      // Firestore에 DailyReport 저장
      if (user && db && finalResults.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        const completedCount = finalResults.filter(r => r.status === 'completed').length
        const skippedCount = finalResults.filter(r => r.status === 'skipped').length
        const totalRoutines = routinesRef.current.length
        
        const report: DailyReport = {
          id: today,
          userId: user.uid,
          date: today,
          wakeUpTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          targetWakeUpTime: routinesRef.current[0]?.startTime || '6:00 AM',
          snoozeCount: snoozeCount,
          totalRoutines: totalRoutines,
          completedRoutines: completedCount,
          skippedRoutines: skippedCount,
          completionRate: totalRoutines > 0 ? completedCount / totalRoutines : 0,
          routineResults: finalResults,
          createdAt: new Date().toISOString(),
        }

        try {
          await setDoc(doc(db, 'users', user.uid, 'reports', today), report)
          console.log('[Report] Saved to Firestore:', today, 'completionRate:', report.completionRate)
        } catch (error) {
          console.error('[Report] Failed to save:', error)
        }
      }
    }, 100)

    setState('report')
  }, [user, snoozeCount])


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
    setYoutubeVideoId(null)  // YouTube 상태 리셋

    if (currentRoutineIndex < routines.length - 1) {
      setCurrentRoutineIndex((prev) => prev + 1)
      setState('routine')
      
      const nextRoutine = routines[currentRoutineIndex + 1]
      setIsVideoEnabled(nextRoutine?.videoVerification || false)
      
      // Notify AI about next routine
      if (liveSessionRef.current?.isConnected()) {
        const hasYouTube = nextRoutine?.link && 
          (nextRoutine.link.includes('youtube.com') || nextRoutine.link.includes('youtu.be'))
        
        if (hasYouTube && nextRoutine?.videoVerification && nextRoutine?.actionDescription) {
          liveSessionRef.current.send(
            `[System] Starting next routine.
Routine: "${nextRoutine.name}" (${nextRoutine.duration} min)
YouTube Link: "${nextRoutine.link}"
Mission: "${nextRoutine.actionDescription}"
⚠️ Call play_youtube NOW to play the video! Then guide the user on the mission.`
          )
        } else if (hasYouTube) {
          liveSessionRef.current.send(
            `[System] Starting next routine.
Routine: "${nextRoutine?.name}" (${nextRoutine?.duration} min)
YouTube Link: "${nextRoutine?.link}"
⚠️ Call play_youtube NOW to play the video!`
          )
        } else if (nextRoutine?.videoVerification && nextRoutine?.actionDescription) {
          liveSessionRef.current.send(
            `[System] Starting next routine.
Routine: "${nextRoutine.name}" (${nextRoutine.duration} min)
Mission: "${nextRoutine.actionDescription}"
Guide the user on the mission action, and say "Mission complete!" when confirmed on camera.`
          )
        } else {
          liveSessionRef.current.send(`Next routine: "${nextRoutine?.name}" (${nextRoutine?.duration} min)`)
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
    setYoutubeVideoId(null)  // Reset YouTube state

    if (currentRoutineIndex < routines.length - 1) {
      const nextIndex = currentRoutineIndex + 1
      setCurrentRoutineIndex(nextIndex)
      
      const nextRoutine = routines[nextIndex]
      setIsVideoEnabled(nextRoutine?.videoVerification || false)
      
      // Notify AI about next routine
      if (liveSessionRef.current?.isConnected()) {
        const hasYouTube = nextRoutine?.link && 
          (nextRoutine.link.includes('youtube.com') || nextRoutine.link.includes('youtu.be'))
        
        if (hasYouTube && nextRoutine?.videoVerification && nextRoutine?.actionDescription) {
          liveSessionRef.current.send(
            `[System] Starting next routine.
Routine: "${nextRoutine.name}" (${nextRoutine.duration} min)
YouTube Link: "${nextRoutine.link}"
Mission: "${nextRoutine.actionDescription}"
⚠️ Call play_youtube NOW to play the video! Then guide the user on the mission.`
          )
        } else if (hasYouTube) {
          liveSessionRef.current.send(
            `[System] Starting next routine.
Routine: "${nextRoutine?.name}" (${nextRoutine?.duration} min)
YouTube Link: "${nextRoutine?.link}"
⚠️ Call play_youtube NOW to play the video!`
          )
        } else if (nextRoutine?.videoVerification && nextRoutine?.actionDescription) {
          liveSessionRef.current.send(
            `[System] Starting next routine.
Routine: "${nextRoutine.name}" (${nextRoutine.duration} min)
Mission: "${nextRoutine.actionDescription}"
Guide the user on the mission action, and say "Mission complete!" when confirmed on camera.`
          )
        } else {
          liveSessionRef.current.send(`Next routine: "${nextRoutine?.name}" (${nextRoutine?.duration} min)`)
        }
      }
    } else {
      setIsVideoEnabled(false)
      endSession()
    }
  }, [currentRoutine, currentRoutineIndex, routines, endSession])

  // Tool Call에서 사용할 함수 ref 업데이트
  completeRoutineRef.current = completeRoutine
  skipRoutineRef.current = skipRoutine

  const extendRoutine = useCallback((minutes: number) => {
    console.log(`Extending routine by ${minutes} minutes`)
  }, [])

  // YouTube 닫기
  const closeYouTube = useCallback(() => {
    setYoutubeVideoId(null)
    setYoutubeError(null)
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
          `[System] Starting first routine.
Routine: "${firstRoutine.name}"
YouTube Link: "${firstRoutine.link}"
Mission: "${firstRoutine.actionDescription}"
⚠️ Call play_youtube NOW to play the video! Then guide the user on the mission.`
        )
      } else if (hasYouTube) {
        // YouTube only
        liveSessionRef.current.send(
          `[System] Starting first routine.
Routine: "${firstRoutine.name}"
YouTube Link: "${firstRoutine.link}"
⚠️ Call play_youtube NOW to play the video!`
        )
      } else if (firstRoutine.videoVerification && firstRoutine.actionDescription) {
        // Video verification only
        liveSessionRef.current.send(
          `[System] Starting first routine.
Routine: "${firstRoutine.name}"
Mission: "${firstRoutine.actionDescription}"
Guide the user on the mission action, and say "Mission complete!" when confirmed on camera.`
        )
      } else {
        liveSessionRef.current.send(`Good morning! Let's start with "${firstRoutine.name}"!`)
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
        youtubeError,
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
