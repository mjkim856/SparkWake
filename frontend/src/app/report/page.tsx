'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { CompletionSummary } from '@/components/report/CompletionSummary'
import { AICoachingCard } from '@/components/report/AICoachingCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, CheckCircle, XCircle, Calendar } from 'lucide-react'
import type { DailyReport, AICoaching } from '@/types'

export default function ReportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [report, setReport] = useState<DailyReport | null>(null)
  const [coaching, setCoaching] = useState<AICoaching | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewType, setViewType] = useState<'daily' | 'weekly'>('daily')

  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false)
      return
    }

    const firestore = db // 타입 가드
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

  // 주간 리포트일 때 AI 코칭 로드
  useEffect(() => {
    if (!user || viewType !== 'weekly') return

    const loadCoaching = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/coaching?userId=${user.uid}`)
        if (res.ok) {
          const data = await res.json()
          setCoaching(data)
        }
      } catch (error) {
        console.error('Failed to load coaching:', error)
      }
    }

    loadCoaching()
  }, [user, viewType])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold ml-2">Report</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewType === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('daily')}
          >
            Daily
          </Button>
          <Button
            variant={viewType === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('weekly')}
          >
            Weekly
          </Button>
        </div>
      </div>

      {!report ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No report for today yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Complete a morning session to see your report
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <CompletionSummary report={report} />

          {/* AI Coaching (weekly only) */}
          {viewType === 'weekly' && coaching && (
            <AICoachingCard coaching={coaching} />
          )}

          {/* Routine Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Routine Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.routineResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {result.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span>{result.routineName}</span>
                  </div>
                  <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
