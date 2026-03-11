'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { RoutineCard } from './RoutineCard'
import type { Routine } from '@/types'

interface RoutineListProps {
  onAddClick: () => void
  onEditClick: (routine: Routine) => void
}

export function RoutineList({ onAddClick, onEditClick }: RoutineListProps) {
  const { user } = useAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Calculate progress
  const completedCount = 0 // This would come from today's session data
  const totalCount = routines.length

  useEffect(() => {
    if (!user || !db) {
      return
    }

    const firestore = db
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
        <div className="w-12 h-12 bg-[#F5B301] rounded-xl flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-white">hourglass_empty</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Today's Progress Card */}
      <section className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Today&apos;s Progress</h2>
          <span className="text-[#F5B301] font-bold">{completedCount}/{totalCount} Completed</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div 
            className="bg-[#F5B301] h-2 rounded-full transition-all duration-500" 
            style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      </section>

      {/* Routine List */}
      <section>
        <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
          Your Routine
          {routines.length > 0 && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold tracking-wide">
              {routines.length} items
            </span>
          )}
        </h2>

        {routines.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400 text-3xl">event_busy</span>
            </div>
            <p className="text-gray-500 mb-4">No routines yet</p>
            <button 
              onClick={onAddClick}
              className="bg-[#F5B301] hover:bg-[#E5A501] text-black font-bold py-3 px-6 rounded-xl transition-colors inline-flex items-center gap-2"
            >
              <span className="material-icons">add</span>
              Add Your First Routine
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                isActive={routines.indexOf(routine) === 0} // First incomplete routine is active
                isCompleted={false}
                onEdit={() => onEditClick(routine)}
                onDelete={() => handleDelete(routine.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Add Button */}
      {routines.length > 0 && (
        <button 
          onClick={onAddClick}
          className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-md"
        >
          <span className="material-icons">add</span>
          Add Custom Routine
        </button>
      )}
    </div>
  )
}
