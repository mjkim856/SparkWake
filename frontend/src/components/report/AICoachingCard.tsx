'use client'

import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Check, X, Lightbulb } from 'lucide-react'
import type { AICoaching, CoachingSuggestion } from '@/types'

interface AICoachingCardProps {
  coaching: AICoaching
  onApplied?: () => void
}

export function AICoachingCard({ coaching, onApplied }: AICoachingCardProps) {
  const { user } = useAuth()
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
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

  const skipSuggestion = (suggestionId: string) => {
    setSkippedIds((prev) => new Set([...prev, suggestionId]))
  }

  const filteredSuggestions = coaching.suggestions.filter(
    (suggestion) => !skippedIds.has(suggestion.id)
  )

  // 모든 suggestion이 스킵되면 카드 숨김
  if (filteredSuggestions.length === 0) {
    return null
  }

  return (
    <Card className="shadow-spark overflow-hidden">
      <CardHeader className="bg-spark-gradient-soft pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-spark-gradient rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          AI Coaching
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {filteredSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-4 bg-white rounded-xl border border-border-50 shadow-sm space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-foreground" />
              </div>
              <p className="text-sm leading-relaxed">{suggestion.message}</p>
            </div>
            
            {suggestion.action && !appliedIds.has(suggestion.id) && (
              <div className="flex gap-2 pl-9">
                <Button
                  size="sm"
                  variant="spark"
                  onClick={() => applySuggestion(suggestion)}
                  disabled={isApplying}
                  className="rounded-lg"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Apply
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="rounded-lg"
                  onClick={() => skipSuggestion(suggestion.id)}
                  aria-label="Skip coaching suggestion"
                >
                  <X className="w-3 h-3 mr-1" />
                  Skip
                </Button>
              </div>
            )}
            
            {appliedIds.has(suggestion.id) && (
              <div className="pl-9">
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                  <Check className="w-3 h-3" />
                  Applied!
                </span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
