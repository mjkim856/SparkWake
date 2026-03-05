'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
      startTime: '07:00',
      duration: 10,
      link: '',
      videoVerification: false,
      actionDescription: '',
    },
  })

  const videoVerification = watch('videoVerification')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Routine Name</Label>
        <Input id="name" {...register('name')} placeholder="e.g., Stretching" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input id="startTime" type="time" {...register('startTime')} />
          {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (min)</Label>
          <Input id="duration" type="number" {...register('duration', { valueAsNumber: true })} min={1} max={180} />
          {errors.duration && <p className="text-sm text-destructive">{errors.duration.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="link">Link (optional)</Label>
        <Input id="link" {...register('link')} placeholder="https://youtube.com/..." />
        {errors.link && <p className="text-sm text-destructive">{errors.link.message}</p>}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="videoVerification">Video Verification</Label>
        <Switch
          id="videoVerification"
          checked={videoVerification}
          onCheckedChange={(checked) => setValue('videoVerification', checked)}
        />
      </div>

      {videoVerification && (
        <div className="space-y-2">
          <Label htmlFor="actionDescription">Action to Verify</Label>
          <Input
            id="actionDescription"
            {...register('actionDescription')}
            placeholder="e.g., Wave at the door"
          />
          {errors.actionDescription && (
            <p className="text-sm text-destructive">{errors.actionDescription.message}</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  )
}
