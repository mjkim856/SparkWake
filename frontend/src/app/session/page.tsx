'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { LiveSessionProvider, useLiveSession } from '@/contexts/LiveSessionContext'
import { WakeUpView } from '@/components/session/WakeUpView'
import { RoutineProgressView } from '@/components/session/RoutineProgressView'
import { CompletionSummary } from '@/components/report/CompletionSummary'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { Routine, DailyReport } from '@/types'

function SessionContent() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    state,
    currentRoutine,
    currentRoutineIndex,
    isAudioEnabled,
    sessionResults,
    snoozeCount,
    startSession,
    completeRoutine,
    skipRoutine,
    toggleAudio,
    handleWakeUp,
    handleSnooze,
  } = useLiveSession()

  const [routines, setRoutines] = useState<Routine[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false)
      return
    }

    const firestore = db // 타입 가드
    const loadRoutines = async () => {
      const q = query(
        collection(firestore, 'users', user.uid, 'routines'),
        orderBy('startTime')
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Routine[]
      setRoutines(data)
      setIsLoading(false)

      if (data.length > 0) {
        startSession(data)
      }
    }

    loadRoutines()
  }, [user, startSession])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (routines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-muted-foreground mb-4">No routines set up yet</p>
        <Button onClick={() => router.push('/')}>Add Routines</Button>
      </div>
    )
  }

  // 리포트 화면
  if (state === 'report') {
    const report: DailyReport = {
      id: '',
      userId: user?.uid || '',
      date: new Date().toISOString().split('T')[0],
      wakeUpTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      targetWakeUpTime: routines[0]?.startTime || '',
      snoozeCount,
      totalRoutines: routines.length,
      completedRoutines: sessionResults.filter((r) => r.status === 'completed').length,
      skippedRoutines: sessionResults.filter((r) => r.status === 'skipped').length,
      completionRate: sessionResults.filter((r) => r.status === 'completed').length / routines.length,
      routineResults: sessionResults,
      createdAt: new Date().toISOString(),
    }

    return (
      <div className="max-w-lg mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Session Complete! 🎉</h1>
        <CompletionSummary report={report} />
        <Button className="w-full mt-6" onClick={() => router.push('/')}>
          Back to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold ml-2">Morning Session</h1>
      </div>

      {/* Wake up view */}
      {state === 'wake_up' && (
        <WakeUpView
          onWakeUp={handleWakeUp}
          onSnooze={handleSnooze}
          snoozeCount={snoozeCount}
        />
      )}

      {/* Routine progress */}
      {(state === 'routine' || state === 'verification') && currentRoutine && (
        <RoutineProgressView
          routine={currentRoutine}
          routineIndex={currentRoutineIndex}
          totalRoutines={routines.length}
          isAudioEnabled={isAudioEnabled}
          onComplete={completeRoutine}
          onSkip={skipRoutine}
          onToggleAudio={toggleAudio}
        />
      )}

      {/* Connecting state */}
      {state === 'connecting' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Connecting to AI...</p>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-destructive mb-4">Connection failed</p>
          <Button onClick={() => startSession(routines)}>Retry</Button>
        </div>
      )}
    </div>
  )
}

export default function SessionPage() {
  return (
    <LiveSessionProvider>
      <SessionContent />
    </LiveSessionProvider>
  )
}
