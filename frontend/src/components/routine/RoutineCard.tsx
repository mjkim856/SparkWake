'use client'

import { formatTime, formatDuration } from '@/lib/utils'
import type { Routine } from '@/types'

interface RoutineCardProps {
  routine: Routine
  isActive: boolean
  isCompleted: boolean
  onEdit: () => void
  onDelete: () => void
}

const ROUTINE_ICONS: Record<string, string> = {
  meditation: 'self_improvement',
  meditate: 'self_improvement',
  silence: 'self_improvement',
  read: 'menu_book',
  reading: 'menu_book',
  journal: 'edit_note',
  journaling: 'edit_note',
  scribing: 'edit_note',
  write: 'edit_note',
  exercise: 'fitness_center',
  workout: 'fitness_center',
  affirmation: 'record_voice_over',
  visualization: 'visibility',
  water: 'water_drop',
  default: 'task_alt',
}

function getRoutineIcon(name: string): string {
  const lowerName = name.toLowerCase()
  for (const [key, icon] of Object.entries(ROUTINE_ICONS)) {
    if (lowerName.includes(key)) return icon
  }
  return ROUTINE_ICONS.default
}

export function RoutineCard({ routine, isActive, isCompleted, onEdit, onDelete }: RoutineCardProps) {
  const icon = getRoutineIcon(routine.name)

  // Completed state
  if (isCompleted) {
    return (
      <div className="group bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 opacity-70">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 text-green-500">
          <span className="material-icons">check_circle</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-700 line-through">{routine.name}</h3>
          <p className="text-sm text-gray-400">{formatTime(routine.startTime)} • {formatDuration(routine.duration)}</p>
        </div>
      </div>
    )
  }

  // Active state
  if (isActive) {
    return (
      <div className="relative bg-white rounded-xl p-5 border-2 border-[#F5B301] shadow-md overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-full -z-10"></div>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              <span className="material-icons">{icon}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{routine.name}</h3>
              <p className="text-sm text-gray-500">{formatTime(routine.startTime)} • {formatDuration(routine.duration)}</p>
            </div>
          </div>
          <span className="flex h-3 w-3 relative mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F5B301]"></span>
          </span>
        </div>
        
        {routine.videoVerification && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span className="material-icons text-sm">videocam</span>
            <span>Video verification enabled</span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button 
            onClick={onEdit}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-icons text-sm">edit</span>
            Edit
          </button>
          <button 
            onClick={onDelete}
            className="w-10 h-10 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors"
          >
            <span className="material-icons text-sm">delete</span>
          </button>
        </div>
      </div>
    )
  }

  // Default state (upcoming)
  return (
    <div className="group bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
        <span className="material-icons">{icon}</span>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800 group-hover:text-yellow-600 transition-colors">{routine.name}</h3>
        <p className="text-sm text-gray-500">{formatTime(routine.startTime)} • {formatDuration(routine.duration)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onEdit}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-yellow-600 hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
        >
          <span className="material-icons text-sm">edit</span>
        </button>
        <button 
          onClick={onDelete}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
        >
          <span className="material-icons text-sm">delete</span>
        </button>
      </div>
    </div>
  )
}
