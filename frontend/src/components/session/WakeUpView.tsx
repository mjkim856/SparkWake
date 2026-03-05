'use client'

import { Button } from '@/components/ui/button'
import { AudioVisualizer } from './AudioVisualizer'
import { Sun, Clock } from 'lucide-react'

interface WakeUpViewProps {
  onWakeUp: () => void
  onSnooze: () => void
  snoozeCount: number
}

export function WakeUpView({ onWakeUp, onSnooze, snoozeCount }: WakeUpViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <AudioVisualizer isActive={true} isSpeaking={true} />

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Good Morning! ☀️</h1>
        <p className="text-muted-foreground">Time to start your miracle morning</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button size="lg" className="w-full text-lg py-6" onClick={onWakeUp}>
          <Sun className="w-5 h-5 mr-2" />
          I&apos;m Up!
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={onSnooze}
          disabled={snoozeCount >= 3}
        >
          <Clock className="w-5 h-5 mr-2" />
          5 More Minutes {snoozeCount > 0 && `(${snoozeCount}/3)`}
        </Button>
      </div>
    </div>
  )
}
