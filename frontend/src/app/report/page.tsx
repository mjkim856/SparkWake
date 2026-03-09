'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { DailyReport, AICoaching } from '@/types'

export default function ReportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [report, setReport] = useState<DailyReport | null>(null)
  const [coaching, setCoaching] = useState<AICoaching | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false)
      return
    }

    const firestore = db
    const loadReport = async () => {
      const today = new Date().toISOString().split('T')[0]
      const reportDoc = await getDoc(doc(firestore, 'users', user.uid, 'reports', today))

      if (reportDoc.exists()) {
        setReport(reportDoc.data() as DailyReport)
      }
      setIsLoading(false)
    }

    loadReport()
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 bg-[#F5B301] rounded-2xl flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-white text-3xl">bar_chart</span>
        </div>
      </div>
    )
  }

  // Mock data for demo
  const mockReport: DailyReport = report || {
    id: 'demo',
    userId: user?.uid || '',
    date: new Date().toISOString().split('T')[0],
    wakeUpTime: '5:30 AM',
    targetWakeUpTime: '5:30 AM',
    snoozeCount: 0,
    totalRoutines: 3,
    completedRoutines: 3,
    skippedRoutines: 0,
    completionRate: 1,
    routineResults: [
      { routineId: '1', routineName: 'Meditation', status: 'completed', completionMethod: 'manual', actualDuration: 10, startedAt: null, completedAt: '' },
      { routineId: '2', routineName: 'Journaling', status: 'completed', completionMethod: 'manual', actualDuration: 15, startedAt: null, completedAt: '' },
      { routineId: '3', routineName: 'Exercise', status: 'completed', completionMethod: 'auto', actualDuration: 20, startedAt: null, completedAt: '' },
    ],
    createdAt: new Date().toISOString(),
  }

  const completionRate = Math.round(mockReport.completionRate * 100)

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
          {/* Stats Cards */}
          <div className="flex flex-wrap gap-3 px-4 py-3">
            <div className="flex min-w-[100px] flex-1 flex-col gap-2 rounded-xl border-2 border-[#F5B301] bg-white p-4 items-center text-center shadow-md">
              <p className="text-slate-900 tracking-tight text-3xl font-bold leading-tight">{completionRate}%</p>
              <p className="text-slate-600 text-xs font-medium uppercase tracking-wider">Success</p>
            </div>
            <div className="flex min-w-[100px] flex-1 flex-col gap-2 rounded-xl border border-slate-100 bg-white p-4 items-center text-center shadow-md">
              <p className="text-slate-900 tracking-tight text-3xl font-bold leading-tight">{mockReport.wakeUpTime?.replace(' AM', '').replace(' PM', '') || '—'}</p>
              <p className="text-slate-600 text-xs font-medium uppercase tracking-wider">Start Time</p>
            </div>
            <div className="flex min-w-[100px] flex-1 flex-col gap-2 rounded-xl border border-slate-100 bg-white p-4 items-center text-center shadow-md">
              <p className="text-slate-900 tracking-tight text-3xl font-bold leading-tight">15m</p>
              <p className="text-slate-600 text-xs font-medium uppercase tracking-wider">Duration</p>
            </div>
          </div>

          {/* Time Efficiency Card */}
          <div className="px-4 py-4">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-md">
              <div>
                <p className="text-slate-900 text-base font-semibold">Time Efficiency</p>
                <p className="text-slate-500 text-sm mt-1">Scheduled vs Actual Completion</p>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-[#F5B301] tracking-tight text-3xl font-bold leading-tight">+5 mins</p>
                <p className="text-green-600 text-sm font-medium bg-green-50 px-2 py-0.5 rounded-md">Faster than yesterday</p>
              </div>
              <div className="grid min-h-[160px] grid-flow-col gap-8 grid-rows-[1fr_auto] items-end justify-items-center pt-4">
                <div className="flex flex-col items-center w-full gap-2" style={{ height: '100%' }}>
                  <div className="w-16 bg-slate-100 rounded-t-lg relative flex items-end justify-center pb-2 shadow-sm" style={{ height: '80%' }}>
                    <span className="text-slate-500 text-xs font-semibold absolute -top-6">60m</span>
                  </div>
                  <p className="text-slate-600 text-xs font-medium">Scheduled</p>
                </div>
                <div className="flex flex-col items-center w-full gap-2" style={{ height: '100%' }}>
                  <div className="w-16 bg-[#F5B301] rounded-t-lg relative flex items-end justify-center pb-2 shadow-md" style={{ height: '65%' }}>
                    <span className="text-slate-900 text-xs font-bold absolute -top-6">55m</span>
                  </div>
                  <p className="text-slate-900 text-xs font-bold">Actual</p>
                </div>
              </div>
            </div>
          </div>

          {/* Routine Verification */}
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">Routine Verification</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">AI verified activities</p>
            
            <div className="flex flex-col gap-3">
              {mockReport.routineResults.map((result, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white shadow-md">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                    result.status === 'completed' ? 'bg-green-50 text-green-500' : 'bg-yellow-50 text-[#F5B301]'
                  }`}>
                    <span className="material-symbols-outlined">
                      {result.status === 'completed' ? 'check_circle' : 'warning'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-slate-900 font-semibold text-base truncate">{result.routineName}</h4>
                      <span className="text-slate-500 text-xs">10m</span>
                    </div>
                    <p className="text-slate-600 text-sm line-clamp-2">
                      {result.status === 'completed' 
                        ? 'Activity completed successfully. Good focus detected.'
                        : 'Activity was skipped or incomplete.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Summary Button */}
          <div className="px-4 py-6 mt-4">
            <button className="w-full flex items-center justify-center gap-3 bg-[#F5B301] hover:bg-[#E5A501] text-slate-900 font-bold py-4 px-6 rounded-xl transition-transform active:scale-95 shadow-[0_4px_20px_rgba(244,192,37,0.3)]">
              <span className="material-symbols-outlined text-2xl">graphic_eq</span>
              Listen to AI Summary
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
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
      </div>
    </div>
  )
}
