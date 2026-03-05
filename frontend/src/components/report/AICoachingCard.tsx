'use client'

import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Check, X } from 'lucide-react'
import type { AICoaching, CoachingSuggestion } from '@/types'

interface AICoachingCardProps {
  coaching: AICoaching
  onApplied?: () => void
}

export function AICoachingCard({ coaching, onApplied }: AICoachingCardProps) {
  const { user } = useAuth()
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [isApplying, setIsApplying] = useState(false)

  const applySuggestion = async (suggestion: CoachingSuggestion) => {
    if (!user || !db || !suggestion.action || appliedIds.has(suggestion.id)) return

    const firestore = db // 타입 가드
    setIsApplying(true)
    try {
      const { routineId, field, newValue } = suggestion.action
      await updateDoc(doc(firestore, 'users', user.uid, 'routines', routineId), {
        [field]: newValue,
        updatedAt: new Date().toISOString(),
      })
      setAppliedIds((prev) => new Set([...prev, suggestion.id]))
      onApplied?.()
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Coaching
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {coaching.suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-3 bg-white rounded-lg shadow-sm space-y-2"
          >
            <p className="text-sm">{suggestion.message}</p>
            {suggestion.action && !appliedIds.has(suggestion.id) && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => applySuggestion(suggestion)}
                  disabled={isApplying}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Apply
                </Button>
                <Button size="sm" variant="ghost">
                  <X className="w-3 h-3 mr-1" />
                  Skip
                </Button>
              </div>
            )}
            {appliedIds.has(suggestion.id) && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Applied!
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
