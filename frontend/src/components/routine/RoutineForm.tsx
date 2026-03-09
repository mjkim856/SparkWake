'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Routine, RoutineInput } from '@/types'

const routineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm'),
  duration: z.number().min(1, 'Min 1 minute').max(180, 'Max 180 minutes'),
  link: z.string().url('Invalid URL').optional().or(z.literal('')),
  videoVerification: z.boolean(),
  actionDescription: z.string().optional(),
}).refine((data) => {
  if (data.videoVerification && !data.actionDescription) {
    return false
  }
  return true
}, {
  message: 'Action description required for video verification',
  path: ['actionDescription'],
})

interface RoutineFormProps {
  initialData?: Routine
  onSubmit: (data: RoutineInput) => void
  onCancel: () => void
}

const ICON_OPTIONS = [
  { icon: 'self_improvement', label: 'Meditation' },
  { icon: 'menu_book', label: 'Reading' },
  { icon: 'edit_note', label: 'Journaling' },
  { icon: 'fitness_center', label: 'Exercise' },
  { icon: 'water_drop', label: 'Hydration' },
]

export function RoutineForm({ initialData, onSubmit, onCancel }: RoutineFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoutineInput>({
    resolver: zodResolver(routineSchema),
    defaultValues: initialData || {
      name: '',
      startTime: '06:00',
      duration: 10,
      link: '',
      videoVerification: false,
      actionDescription: '',
    },
  })

  const videoVerification = watch('videoVerification')

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between -mx-6 -mt-6 p-4 border-b border-gray-200 sticky top-0 bg-[#F9FAFB] z-10">
        <button 
          onClick={onCancel}
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold">{initialData ? 'Edit Routine' : 'New Routine'}</h1>
        <div className="w-10"></div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Routine Details Card */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Routine Details</h2>
          
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="name">Routine Name</label>
              <input
                id="name"
                {...register('name')}
                placeholder="e.g., Morning Meditation"
                className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#F5B301] focus:border-[#F5B301] transition-colors"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Time & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="startTime">Start Time</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <span className="material-icons text-sm">schedule</span>
                  </span>
                  <input
                    id="startTime"
                    type="time"
                    {...register('startTime')}
                    className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#F5B301] focus:border-[#F5B301] transition-colors"
                  />
                </div>
                {errors.startTime && <p className="text-sm text-red-500 mt-1">{errors.startTime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="duration">Duration (min)</label>
                <input
                  id="duration"
                  type="number"
                  {...register('duration', { valueAsNumber: true })}
                  min={1}
                  max={180}
                  placeholder="30"
                  className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#F5B301] focus:border-[#F5B301] transition-colors"
                />
                {errors.duration && <p className="text-sm text-red-500 mt-1">{errors.duration.message}</p>}
              </div>
            </div>

            {/* Link */}
            <div>
              <label className="block text-sm font-medium mb-1 flex justify-between" htmlFor="link">
                <span>Resource Link</span>
                <span className="text-xs text-gray-400 font-normal">Optional</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <span className="material-icons text-sm">link</span>
                </span>
                <input
                  id="link"
                  {...register('link')}
                  placeholder="https://..."
                  className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#F5B301] focus:border-[#F5B301] transition-colors"
                />
              </div>
              {errors.link && <p className="text-sm text-red-500 mt-1">{errors.link.message}</p>}
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Choose Icon</label>
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {ICON_OPTIONS.map((option, index) => (
                  <button
                    key={option.icon}
                    type="button"
                    className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-colors ${
                      index === 0 
                        ? 'border-[#F5B301] bg-yellow-100 text-[#F5B301]' 
                        : 'border-gray-200 bg-[#F9FAFB] text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <span className="material-icons">{option.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Video Verification Card */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold">Video Verification</h2>
              <p className="text-xs text-gray-500">AI will verify you completed the action.</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={videoVerification}
                  onChange={(e) => setValue('videoVerification', e.target.checked)}
                  className="sr-only"
                />
                <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ${videoVerification ? 'bg-[#F5B301]' : 'bg-gray-200'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform duration-300 shadow-sm ${videoVerification ? 'translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>

          {videoVerification && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium mb-1" htmlFor="actionDescription">
                Action Description<span className="text-[#F5B301] ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Describe what the AI should look for in your video.</p>
              <textarea
                id="actionDescription"
                {...register('actionDescription')}
                placeholder="I am sitting on my yoga mat with eyes closed..."
                rows={3}
                className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#F5B301] focus:border-[#F5B301] transition-colors resize-none"
              />
              {errors.actionDescription && (
                <p className="text-sm text-red-500 mt-1">{errors.actionDescription.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#F9FAFB] border-t border-gray-200 z-20">
          <div className="max-w-md mx-auto">
            <button
              type="submit"
              className="w-full bg-[#F5B301] hover:bg-[#E5A501] text-black font-bold py-4 px-6 rounded-xl transition-colors shadow-lg flex justify-center items-center gap-2"
            >
              <span>{initialData ? 'Update Routine' : 'Save Routine'}</span>
              <span className="material-icons text-sm">check</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
