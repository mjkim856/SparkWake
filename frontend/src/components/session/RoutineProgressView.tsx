'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Timer } from './Timer'
import { CameraPreview } from './CameraPreview'
import { AudioVisualizer } from './AudioVisualizer'
import { ExternalLink, Check, SkipForward, Video, Mic, MicOff } from 'lucide-react'
import type { Routine } from '@/types'

interface RoutineProgressViewProps {
  routine: Routine
  routineIndex: number
  totalRoutines: number
  isAudioEnabled: boolean
  onComplete: (method: 'auto' | 'manual') => void
  onSkip: () => void
  onToggleAudio: () => void
}

export function RoutineProgressView({
  routine,
  routineIndex,
  totalRoutines,
  isAudioEnabled,
  onComplete,
  onSkip,
  onToggleAudio,
}: RoutineProgressViewProps) {
  const [showCamera, setShowCamera] = useState(routine.videoVerification)
  const [isTimerComplete, setIsTimerComplete] = useState(false)

  const handleTimerComplete = useCallback(() => {
    setIsTimerComplete(true)
    // 하이브리드 모드: 타이머 완료 시 마이크 ON (AI가 질문)
  }, [])

  const handleOpenLink = () => {
    if (routine.link) {
      window.open(routine.link, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Routine {routineIndex + 1} of {totalRoutines}</span>
        <div className="flex gap-1">
          {Array.from({ length: totalRoutines }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < routineIndex ? 'bg-green-500' : i === routineIndex ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current routine card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{routine.name}</CardTitle>
            <div className="flex gap-2">
              {routine.videoVerification && (
                <Badge variant="secondary">
                  <Video className="w-3 h-3 mr-1" />
                  Video
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer */}
          <Timer
            duration={routine.duration * 60}
            onComplete={handleTimerComplete}
            className="py-4"
          />

          {/* Camera preview for video verification */}
          {routine.videoVerification && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                🎥 Action: {routine.actionDescription}
              </p>
              <CameraPreview
                isActive={showCamera}
                className="aspect-video max-h-48"
              />
            </div>
          )}

          {/* Audio indicator */}
          {isTimerComplete && (
            <div className="flex flex-col items-center space-y-2">
              <AudioVisualizer isActive={true} isSpeaking={true} />
              <p className="text-sm text-muted-foreground">AI is asking if you&apos;re done...</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {routine.link && (
              <Button variant="outline" onClick={handleOpenLink} className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Link
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleAudio}
                className={isAudioEnabled ? 'bg-red-50' : ''}
              >
                {isAudioEnabled ? <Mic className="w-4 h-4 text-red-500" /> : <MicOff className="w-4 h-4" />}
              </Button>

              <Button variant="outline" onClick={onSkip} className="flex-1">
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>

              <Button onClick={() => onComplete('manual')} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
