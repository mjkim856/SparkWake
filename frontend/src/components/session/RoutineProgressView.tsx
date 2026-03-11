'use client'

import { useState, useCallback } from 'react'
import { Timer } from './Timer'
import { CameraPreview } from './CameraPreview'
import type { Routine } from '@/types'

interface RoutineProgressViewProps {
  routine: Routine
  routineIndex: number
  totalRoutines: number
  isAudioEnabled: boolean
  onComplete: (method: 'auto' | 'manual' | 'voice') => void
  onSkip: () => void
  onToggleAudio: () => void
  onVideoFrame?: (frame: ImageData) => void
}

export function RoutineProgressView({
  routine,
  routineIndex,
  totalRoutines,
  onVideoFrame,
}: RoutineProgressViewProps) {
  const [showCamera] = useState(routine.videoVerification)
  const [isTimerComplete, setIsTimerComplete] = useState(false)

  const handleTimerComplete = useCallback(() => {
    setIsTimerComplete(true)
  }, [])

  const handleOpenLink = () => {
    if (routine.link) {
      window.open(routine.link, '_blank')
    }
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Camera Preview / Visual Area */}
      <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden shadow-md border border-gray-200">
        {routine.videoVerification && showCamera ? (
          <CameraPreview 
            isActive={true} 
            className="w-full h-full object-cover"
            onFrame={onVideoFrame}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
            <span className="material-symbols-outlined text-gray-300 text-8xl">
              {routine.name.toLowerCase().includes('meditat') ? 'self_improvement' :
               routine.name.toLowerCase().includes('read') ? 'menu_book' :
               routine.name.toLowerCase().includes('exerc') ? 'fitness_center' :
               routine.name.toLowerCase().includes('journal') ? 'edit_note' :
               'task_alt'}
            </span>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none"></div>
        
        {/* Status badge */}
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <div className="bg-white/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 flex items-center space-x-2 shadow-sm">
            {isTimerComplete ? (
              <>
                <span className="material-icons text-green-500 text-sm">check_circle</span>
                <span className="text-sm font-medium text-gray-800">Time&apos;s up!</span>
              </>
            ) : (
              <>
                <span className="material-icons text-[#F5B301] text-sm animate-spin">sync</span>
                <span className="text-sm font-medium text-gray-800">In progress...</span>
              </>
            )}
          </div>
        </div>

        {/* Audio bars at bottom */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center items-end space-x-1 h-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-1 bg-[#F5B301] rounded-full audio-bar"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>

      {/* Activity Info */}
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">
              {routineIndex + 1} of {totalRoutines}
            </h2>
            <div className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <span>{routine.name}</span>
            </div>
          </div>
          <Timer
            duration={routine.duration * 60}
            onComplete={handleTimerComplete}
          />
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-[#F5B301] rounded-full transition-all duration-1000"
            style={{ width: `${((routineIndex) / totalRoutines) * 100}%` }}
          />
        </div>

        {/* Progress dots */}
        <div className="flex justify-between text-xs text-gray-500 font-medium">
          <span>Start</span>
          <div className="flex gap-1">
            {Array.from({ length: totalRoutines }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < routineIndex ? 'bg-green-500' : i === routineIndex ? 'bg-[#F5B301]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span>End</span>
        </div>
      </div>

      {/* Link button if available */}
      {routine.link && (
        <button 
          onClick={handleOpenLink}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center space-x-4 hover:bg-gray-100 transition-colors"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
            <span className="material-icons text-gray-500">link</span>
          </div>
          <div className="flex-grow text-left">
            <p className="text-xs text-gray-500 mb-1 font-medium">Resource</p>
            <p className="font-semibold text-gray-800 truncate">{routine.link}</p>
          </div>
          <span className="material-icons text-gray-400">open_in_new</span>
        </button>
      )}

      {/* Video verification description */}
      {routine.videoVerification && routine.actionDescription && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[#F5B301]">videocam</span>
            <div>
              <p className="font-medium text-gray-900">Video Verification</p>
              <p className="text-sm text-gray-600">{routine.actionDescription}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
