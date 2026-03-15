'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import WeeklyHistory from '@/components/report/WeeklyHistory'
import CircularProgress from '@/components/report/CircularProgress'
import type { DailyReport } from '@/types'
import domtoimage from 'dom-to-image-more'

// 로컬 YYYY-MM-DD 포맷 헬퍼
function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ReportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [report, setReport] = useState<DailyReport | null>(null)
  const [weeklyReports, setWeeklyReports] = useState<DailyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // 로컬 시간 기준 오늘 날짜 (UTC 변환 방지)
  const today = useMemo(() => toLocalDateString(new Date()), [])
  
  // TTS 상태
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShareLoading, setIsShareLoading] = useState(false)
  const reportCardRef = useRef<HTMLDivElement>(null)
  
  // TTS 재생/정지
  const handleListen = useCallback(() => {
    if (isPlaying) {
      speechSynthesis.cancel()
      setIsPlaying(false)
      return
    }
    
    if (!report) return
    
    const completedCount = report.routineResults.filter(r => r.status === 'completed').length
    const completionRate = Math.round(report.completionRate * 100)
    
    const text = report.aiSummary || 
      `오늘 ${report.totalRoutines}개 루틴 중 ${completedCount}개를 완료했어요. 달성률은 ${completionRate}%입니다. ${
        completionRate >= 80 
          ? "정말 잘하고 있어요! 이 기세를 유지해봐요!" 
          : completionRate >= 50 
            ? "좋은 진전이에요! 내일은 조금 더 해볼까요?"
            : "모든 한 걸음이 중요해요. 내일은 새로운 기회예요!"
      }`
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    utterance.rate = 0.95
    utterance.pitch = 1.1
    
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)
    
    setIsPlaying(true)
    speechSynthesis.speak(utterance)
  }, [isPlaying, report])
  
  // 이미지 캡처 후 공유
  const handleShare = useCallback(async () => {
    if (!report) return
    
    const completedCount = report.routineResults.filter(r => r.status === 'completed').length
    const completionRate = Math.round(report.completionRate * 100)
    
    // AI Summary 포함한 공유 텍스트
    const summaryText = report.aiSummary || `Great job completing ${completedCount} out of ${report.totalRoutines} routines today!`
    const shareText = `🌅 오늘 ${completedCount}/${report.totalRoutines} 루틴 완료! (${completionRate}%)\n\n💬 ${summaryText}\n\n#SparkWake`
    
    setIsShareLoading(true)
    try {
      // 이미지 캡처 시도 (dom-to-image-more)
      let blob: Blob | null = null
      if (reportCardRef.current) {
        try {
          blob = await domtoimage.toBlob(reportCardRef.current, {
            bgcolor: '#ffffff',
            scale: 2,
            // 외부 스타일시트 에러 무시
            filter: (node: Node) => {
              if (node instanceof HTMLLinkElement) {
                return !node.href?.includes('fonts.googleapis.com')
              }
              return true
            },
          })
        } catch (e) {
          console.warn('Image capture failed, falling back to text share', e)
        }
      }
      
      // 이미지 공유 시도
      if (blob) {
        const shareData = {
          title: 'SparkWake Morning Report',
          text: shareText,
          files: [new File([blob], 'sparkwake-report.png', { type: 'image/png' })]
        }
        
        if (navigator.canShare?.(shareData)) {
          await navigator.share(shareData)
          return
        }
        
        // 공유 불가 시 다운로드
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'sparkwake-report.png'
        a.click()
        URL.revokeObjectURL(url)
        return
      }
      
      // 텍스트만 공유
      const textShareData = {
        title: 'SparkWake Morning Report',
        text: shareText,
        url: window.location.href,
      }
      if (navigator.share) {
        await navigator.share(textShareData)
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
        alert('클립보드에 복사되었어요!')
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err)
      }
    } finally {
      setIsShareLoading(false)
    }
  }, [report])

  useEffect(() => {
    if (!user || !db) {
      setReport(null) // stale report 방지
      setIsLoading(false)
      return
    }

    const firestore = db
    const loadReports = async () => {
      try {
        // 오늘 리포트 조회
        const todayDoc = await getDoc(doc(firestore, 'users', user.uid, 'reports', today))
        if (todayDoc.exists()) {
          setReport(todayDoc.data() as DailyReport)
        } else {
          setReport(null) // 오늘 문서 없으면 명시적으로 null 설정
        }

        // 최근 7일 리포트 조회 (로컬 시간 기준)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setHours(0, 0, 0, 0)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        const startDate = toLocalDateString(sevenDaysAgo)

        const reportsQuery = query(
          collection(firestore, 'users', user.uid, 'reports'),
          where('date', '>=', startDate),
          orderBy('date', 'desc'),
          limit(7)
        )
        
        const snapshot = await getDocs(reportsQuery)
        const reports = snapshot.docs.map(doc => doc.data() as DailyReport)
        setWeeklyReports(reports)
      } catch (error) {
        console.error('Failed to load reports:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadReports()
  }, [user, today])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 bg-[#F5B301] rounded-2xl flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-white text-3xl">bar_chart</span>
        </div>
      </div>
    )
  }

  // Empty State - 리포트가 없을 때
  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center">
        <div className="relative flex min-h-screen w-full max-w-md flex-col bg-white overflow-x-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 bg-white/90 backdrop-blur-md">
            <button 
              onClick={() => router.push('/')}
              className="text-slate-700 flex size-12 shrink-0 items-center justify-center hover:bg-black/5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Daily Report</h2>
          </div>

          {/* Empty State Content */}
          <div className="flex-1 flex flex-col px-6 pb-24">
            {/* Weekly History */}
            <WeeklyHistory reports={weeklyReports} currentDate={today} />
            
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-slate-400 text-5xl">bar_chart</span>
              </div>
              <h3 className="text-slate-900 text-xl font-bold mb-2 text-center">No Report Yet</h3>
              <p className="text-slate-500 text-center mb-8 max-w-xs">
                Complete your morning routine to see today&apos;s report. Start a session to begin!
              </p>
              <button
                onClick={() => router.push('/session')}
                className="flex items-center gap-2 bg-[#F5B301] hover:bg-[#E5A501] text-slate-900 font-bold py-3 px-6 rounded-xl transition-transform active:scale-95 shadow-[0_4px_20px_rgba(244,192,37,0.3)]"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                Start Session
              </button>
            </div>
          </div>

          <BottomNav router={router} />
        </div>
      </div>
    )
  }

  const completionRate = Math.round(report.completionRate * 100)
  const completedCount = report.routineResults.filter(r => r.status === 'completed').length
  const skippedCount = report.routineResults.filter(r => r.status === 'skipped').length
  
  const totalActualDuration = report.routineResults.reduce(
    (sum, r) => sum + (r.actualDuration || 0), 0
  )
  const formatDuration = (mins: number) => mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-white overflow-x-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 bg-white/90 backdrop-blur-md">
          <button 
            onClick={() => router.push('/')}
            className="text-slate-700 flex size-12 shrink-0 items-center justify-center hover:bg-black/5 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Daily Report</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Hero Section - Circular Progress */}
          <div className="flex flex-col items-center py-6 bg-gradient-to-b from-[#FFFBEB] to-white">
            <CircularProgress percentage={completionRate} size={160} strokeWidth={12} />
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-slate-600">{completedCount} Done</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-sm text-slate-600">{skippedCount} Skipped</span>
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <WeeklyHistory reports={weeklyReports} currentDate={today} />

          {/* Quick Stats */}
          <div className="flex gap-3 px-4 py-2">
            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{report.wakeUpTime || '—'}</p>
              <p className="text-xs text-slate-500">Start Time</p>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{formatDuration(totalActualDuration)}</p>
              <p className="text-xs text-slate-500">Total Time</p>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{report.totalRoutines}</p>
              <p className="text-xs text-slate-500">Routines</p>
            </div>
          </div>

          {/* Today's Routine Section */}
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-slate-900 text-base font-bold mb-3">Today&apos;s Routine</h3>
            <div className="flex flex-col gap-2">
              {report.routineResults.map((result, index) => {
                const isSkipped = result.status === 'skipped'
                return (
                  <div 
                    key={index} 
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isSkipped 
                        ? 'border-2 border-dashed border-slate-200 bg-slate-50/50' 
                        : 'border border-slate-100 bg-white shadow-sm'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                      isSkipped ? 'bg-slate-100' : 'bg-green-100'
                    }`}>
                      <span className={`material-symbols-outlined text-lg ${
                        isSkipped ? 'text-slate-400' : 'text-green-500'
                      }`}>
                        {isSkipped ? 'remove' : 'check'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${
                        isSkipped ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}>
                        {result.routineName}
                      </p>
                    </div>
                    <span className={`text-xs ${isSkipped ? 'text-slate-300' : 'text-slate-500'}`}>
                      {result.actualDuration ? `${result.actualDuration}m` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Daily Summary Section */}
          <div className="px-4 py-4">
            <div ref={reportCardRef} className="bg-gradient-to-br from-[#FEF3C7] to-[#FFFBEB] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#F5B301]">auto_awesome</span>
                <h3 className="text-slate-900 font-bold">AI Daily Summary</h3>
              </div>
              <p className="text-slate-600 text-sm mb-4">
                {report.aiSummary || `Great job completing ${completedCount} out of ${report.totalRoutines} routines today! ${
                  completionRate >= 80 
                    ? "You're building excellent habits. Keep up the momentum!" 
                    : completionRate >= 50 
                      ? "Good progress! Try to complete a few more routines tomorrow."
                      : "Every step counts. Tomorrow is a new opportunity!"
                }`}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={handleListen}
                  aria-label={isPlaying ? "Stop listening" : "Listen to summary"}
                  className={`flex-1 flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-xl transition-all active:scale-95 ${
                    isPlaying 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-[#F5B301] hover:bg-[#E5A501] text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {isPlaying ? 'stop' : 'graphic_eq'}
                  </span>
                  {isPlaying ? 'Stop' : 'Listen'}
                </button>
                <button 
                  onClick={handleShare}
                  disabled={isShareLoading}
                  aria-label="Share report"
                  className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isShareLoading ? (
                    <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-xl">share</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <BottomNav router={router} />
      </div>
    </div>
  )
}

// Bottom Navigation Component
function BottomNav({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="flex gap-2 border-t border-slate-100 bg-white px-4 pb-6 pt-2 absolute bottom-0 w-full z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <button 
        onClick={() => router.push('/')}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#F5B301] transition-colors py-2"
      >
        <span className="material-symbols-outlined text-2xl">home</span>
        <p className="text-[10px] font-medium leading-normal tracking-wide">Home</p>
      </button>
      <button 
        onClick={() => router.push('/session')}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#F5B301] transition-colors py-2"
      >
        <span className="material-symbols-outlined text-2xl">videocam</span>
        <p className="text-[10px] font-medium leading-normal tracking-wide">Live</p>
      </button>
      <button className="flex flex-1 flex-col items-center justify-center gap-1 text-[#F5B301] py-2">
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
        <p className="text-[10px] font-bold leading-normal tracking-wide">Report</p>
      </button>
      <button 
        onClick={() => router.push('/profile')}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#F5B301] transition-colors py-2"
      >
        <span className="material-symbols-outlined text-2xl">person</span>
        <p className="text-[10px] font-medium leading-normal tracking-wide">Profile</p>
      </button>
    </div>
  )
}
