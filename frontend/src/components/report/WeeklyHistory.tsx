'use client'

import type { DailyReport } from '@/types'

interface WeeklyHistoryProps {
  reports: DailyReport[]
  currentDate: string
}

// 완료율에 따른 색상 반환
function getCompletionColor(rate: number | null): { bg: string; ring: string } {
  if (rate === null) {
    return { bg: 'bg-slate-100', ring: 'ring-slate-200' }
  }
  if (rate >= 0.8) {
    return { bg: 'bg-green-500', ring: 'ring-green-300' }
  }
  if (rate >= 0.5) {
    return { bg: 'bg-yellow-400', ring: 'ring-yellow-200' }
  }
  return { bg: 'bg-red-400', ring: 'ring-red-200' }
}

// 요일 이름
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function WeeklyHistory({ reports, currentDate }: WeeklyHistoryProps) {
  // 최근 7일 날짜 생성
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  // 날짜별 리포트 매핑
  const reportMap = new Map(reports.map(r => [r.date, r]))

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-900 text-base font-bold">Weekly Progress</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-slate-500">80%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="text-slate-500">50%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-slate-500">&lt;50%</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-end">
        {days.map((date) => {
          const report = reportMap.get(date)
          const rate = report?.completionRate ?? null
          const colors = getCompletionColor(rate)
          const dayOfWeek = new Date(date).getDay()
          const isToday = date === currentDate
          const dayNum = new Date(date).getDate()
          
          return (
            <div
              key={date}
              className="flex flex-col items-center gap-1.5 flex-1"
              data-testid={`weekly-day-${date}`}
            >
              {/* Today indicator arrow */}
              {isToday && (
                <div className="flex flex-col items-center -mb-1">
                  <span className="text-[10px] font-bold text-[#F5B301]">Today</span>
                  <span className="material-symbols-outlined text-[#F5B301] text-sm -mt-1">arrow_drop_down</span>
                </div>
              )}
              {!isToday && <div className="h-[26px]" />}
              
              {/* Day circle */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  rate !== null ? colors.bg : 'bg-slate-100'
                } ${isToday ? 'ring-2 ring-[#F5B301] ring-offset-2' : ''}`}
              >
                {rate !== null ? (
                  <span className="text-white text-xs font-bold">
                    {Math.round(rate * 100)}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs font-medium">{dayNum}</span>
                )}
              </div>
              
              {/* Day name */}
              <span className={`text-[10px] font-medium ${
                isToday ? 'text-[#F5B301] font-bold' : 'text-slate-400'
              }`}>
                {DAY_NAMES[dayOfWeek]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
