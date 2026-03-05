'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { RoutineCard } from './RoutineCard'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import type { Routine } from '@/types'

interface RoutineListProps {
  onAddClick: () => void
  onEditClick: (routine: Routine) => void
}

export function RoutineList({ onAddClick, onEditClick }: RoutineListProps) {
  const { user } = useAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false)
      return
    }

    const firestore = db // 타입 가드
    const q = query(
      collection(firestore, 'users', user.uid, 'routines'),
      orderBy('startTime')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Routine[]
      setRoutines(data)
      setIsLoading(false)
    })

    return unsubscribe
  }, [user])

  const handleDelete = async (routineId: string) => {
    if (!user || !db || !confirm('Delete this routine?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'routines', routineId))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {routines.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No routines yet</p>
          <Button onClick={onAddClick}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Routine
          </Button>
        </div>
      ) : (
        <>
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={() => onEditClick(routine)}
              onDelete={() => handleDelete(routine.id)}
            />
          ))}
          <Button onClick={onAddClick} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Routine
          </Button>
        </>
      )}
    </div>
  )
}
