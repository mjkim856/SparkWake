'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import type { DailyReport } from '@/types'

interface CompletionSummaryProps {
  report: DailyReport
}

export function CompletionSummary({ report }: CompletionSummaryProps) {
  const completionRate = Math.round(report.completionRate * 100)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-primary mb-2">{completionRate}%</div>
          <p className="text-muted-foreground">Completion Rate</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-semibold">{report.completedRoutines}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-semibold">{report.skippedRoutines}</div>
            <p className="text-xs text-muted-foreground">Skipped</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-semibold">{report.snoozeCount}</div>
            <p className="text-xs text-muted-foreground">Snoozes</p>
          </div>
        </div>

        {report.wakeUpTime && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Woke up at <span className="font-semibold">{report.wakeUpTime}</span>
              {report.targetWakeUpTime && (
                <span> (Target: {report.targetWakeUpTime})</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
