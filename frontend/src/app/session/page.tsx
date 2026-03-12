'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { LiveSessionProvider, useLiveSession } from '@/contexts/LiveSessionContext'
import { WakeUpView } from '@/components/session/WakeUpView'
import { RoutineProgressView } from '@/components/session/RoutineProgressView'
import type { Routine } from '@/types'

function SessionContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const {
    state,
    currentRoutine,
    currentRoutineIndex,
    isAudioEnabled,
    videoRecognized,
    sessionResults,
    snoozeCount,
    aiMessage,
    startSession,
    completeRoutine,
    skipRoutine,
    toggleAudio,
    handleWakeUp,
    handleSnooze,
    sendVideoFrame,
  } = useLiveSession()

  const [routines, setRoutines] = useState<Routine[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) return
    
    if (!user || !db) {
      setIsLoading(false)
      return
    }

    const firestore = db
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
  }, [user, authLoading, startSession])

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-[#F5B301] rounded-2xl flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-white text-3xl">self_improvement</span>
        </div>
        <p className="mt-4 text-gray-500">Preparing your session...</p>
      </div>
    )
  }

  if (routines.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-gray-400 text-4xl">event_busy</span>
        </div>
        <h2 className="text-xl font-bold mb-2">No Routines Yet</h2>
        <p className="text-gray-500 mb-6 text-center">Add your morning routines to get started</p>
        <button 
          onClick={() => router.push('/')}
          className="bg-[#F5B301] hover:bg-[#E5A501] text-black font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Add Routines
        </button>
      </div>
    )
  }

  // 리포트 화면
  if (state === 'report') {
    const completedCount = sessionResults.filter((r) => r.status === 'completed').length
    const completionRate = Math.round((completedCount / routines.length) * 100)

    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <header className="flex items-center p-4 justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-gray-200">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
            <span className="material-icons">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold">Session Complete!</h2>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 p-4 max-w-md mx-auto w-full">
          {/* Stats Cards */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 flex flex-col gap-2 rounded-xl border-2 border-[#F5B301] bg-white p-4 items-center text-center shadow-md">
              <p className="text-3xl font-bold">{completionRate}%</p>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Success</p>
            </div>
            <div className="flex-1 flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 items-center text-center shadow-md">
              <p className="text-3xl font-bold">{completedCount}/{routines.length}</p>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Done</p>
            </div>
            <div className="flex-1 flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 items-center text-center shadow-md">
              <p className="text-3xl font-bold">{snoozeCount}</p>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Snoozes</p>
            </div>
          </div>

          {/* Routine Results */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold">Routine Results</h3>
            {sessionResults.map((result, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-md">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                  result.status === 'completed' ? 'bg-green-50 text-green-500' : 'bg-yellow-50 text-[#F5B301]'
                }`}>
                  <span className="material-symbols-outlined">
                    {result.status === 'completed' ? 'check_circle' : 'warning'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{result.routineName}</h4>
                  <p className="text-sm text-gray-500 capitalize">{result.status}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Listen Button */}
          {/* Listen Button - Coming Soon */}
          <button 
            disabled
            className="w-full flex items-center justify-center gap-3 bg-gray-200 text-gray-400 font-bold py-4 px-6 rounded-xl cursor-not-allowed mt-6"
            aria-label="Listen to AI Summary - Coming soon"
          >
            <span className="material-symbols-outlined text-2xl">graphic_eq</span>
            Listen to AI Summary
            <span className="text-xs bg-gray-300 px-2 py-0.5 rounded-full">Soon</span>
          </button>
        </main>

        <div className="p-4 pb-8">
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-gray-200">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-900 transition-colors">
          <span className="material-icons">close</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-semibold">Morning Routine</h1>
          <span className="text-xs text-gray-500">Day 1</span>
        </div>
        <button className="text-gray-500 hover:text-[#F5B301] transition-colors">
          <span className="material-icons">more_horiz</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col p-6 space-y-8">
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
            videoRecognized={videoRecognized}
            onComplete={completeRoutine}
            onSkip={skipRoutine}
            onToggleAudio={toggleAudio}
            onVideoFrame={sendVideoFrame}
          />
        )}

        {/* Connecting state */}
        {state === 'connecting' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-[#F5B301] rounded-2xl flex items-center justify-center animate-pulse mb-4">
              <span className="material-symbols-outlined text-white text-3xl animate-spin">sync</span>
            </div>
            <p className="text-gray-500">Connecting to AI...</p>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
            </div>
            <p className="text-red-500 font-medium mb-4">Connection failed</p>
            <button 
              onClick={() => startSession(routines)}
              className="bg-[#F5B301] hover:bg-[#E5A501] text-black font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </main>

      {/* Footer Controls */}
      {(state === 'routine' || state === 'verification') && (
        <footer className="p-6 pb-10 flex justify-center space-x-6 items-center">
          <button 
            onClick={toggleAudio}
            className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
          >
            <span className="material-icons text-2xl">{isAudioEnabled ? 'mic' : 'mic_off'}</span>
          </button>
          {/* 비디오 루틴: videoRecognized가 true여야 활성화 / 일반 루틴: 항상 활성화 */}
          {currentRoutine?.videoVerification && !videoRecognized ? (
            <button 
              disabled
              className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 cursor-not-allowed"
            >
              <span className="material-icons text-4xl">check</span>
            </button>
          ) : (
            <button 
              onClick={() => completeRoutine('manual')}
              className="w-20 h-20 rounded-full bg-[#F5B301] flex items-center justify-center text-black shadow-lg shadow-[#F5B301]/40 transform hover:scale-105 transition-transform"
            >
              <span className="material-icons text-4xl">check</span>
            </button>
          )}
          <button 
            onClick={skipRoutine}
            className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
          >
            <span className="material-icons text-2xl">skip_next</span>
          </button>
        </footer>
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
