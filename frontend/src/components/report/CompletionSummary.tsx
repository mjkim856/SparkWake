'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, Trophy } from 'lucide-react'
import type { DailyReport } from '@/types'

interface CompletionSummaryProps {
  report: DailyReport
}

export function CompletionSummary({ report }: CompletionSummaryProps) {
  const completionRate = Math.round(report.completionRate * 100)
  const isGreat = completionRate >= 80
  const isGood = completionRate >= 50

  return (
    <Card className="shadow-spark overflow-hidden">
      <CardContent className="pt-6">
        {/* Completion Rate Circle */}
        <div className="text-center mb-8">
          <div className="relative w-36 h-36 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="url(#completionGradient)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={402}
                strokeDashoffset={402 - (402 * completionRate) / 100}
              />
              <defs>
                <linearGradient id="completionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(45, 100%, 51%)" />
                  <stop offset="100%" stopColor="hsl(25, 95%, 53%)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-spark-gradient">{completionRate}%</span>
              {isGreat && <Trophy className="w-5 h-5 text-yellow-500 mt-1" />}
            </div>
          </div>
          <p className="text-muted-foreground font-medium">
            {isGreat ? '🎉 Amazing work!' : isGood ? '👍 Good progress!' : '💪 Keep going!'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{report.completedRoutines}</div>
            <p className="text-xs text-green-600/70">Completed</p>
          </div>
          
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500">{report.skippedRoutines}</div>
            <p className="text-xs text-red-500/70">Skipped</p>
          </div>
          
          <div className="bg-orange-50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-500">{report.snoozeCount}</div>
            <p className="text-xs text-orange-500/70">Snoozes</p>
          </div>
        </div>

        {/* Wake up time */}
        {report.wakeUpTime && (
          <div className="mt-6 text-center p-4 bg-spark-gradient-soft rounded-2xl">
            <p className="text-sm text-muted-foreground">
              Woke up at <span className="font-bold text-foreground">{report.wakeUpTime}</span>
              {report.targetWakeUpTime && (
                <span className="text-muted-foreground"> (Target: {report.targetWakeUpTime})</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
