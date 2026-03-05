'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Link as LinkIcon, Video } from 'lucide-react'
import { formatTime, formatDuration } from '@/lib/utils'
import type { Routine } from '@/types'

interface RoutineCardProps {
  routine: Routine
  onEdit: () => void
  onDelete: () => void
}

export function RoutineCard({ routine, onEdit, onDelete }: RoutineCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-primary">
              {formatTime(routine.startTime)}
            </span>
            <span className="text-lg font-medium">{routine.name}</span>
          </div>
          <div className="flex items-center gap-1">
            {routine.link && (
              <LinkIcon className="w-4 h-4 text-muted-foreground" />
            )}
            {routine.videoVerification && (
              <Video className="w-4 h-4 text-blue-500" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{formatDuration(routine.duration)}</Badge>
            {routine.videoVerification && routine.actionDescription && (
              <Badge variant="outline" className="text-xs">
                🎥 {routine.actionDescription}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
