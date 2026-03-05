'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { RoutineList } from '@/components/routine/RoutineList'
import { RoutineForm } from '@/components/routine/RoutineForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Settings, BarChart3, LogOut, User } from 'lucide-react'
import type { Routine, RoutineInput } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading, isAnonymous, signInAnonymously, signInWithGoogle, linkWithGoogle, signOut } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)

  // 로그인 화면
  if (!user && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">☀️ Miracle Morning</h1>
          <p className="text-muted-foreground">AI Coach</p>
        </div>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full" size="lg" onClick={signInWithGoogle}>
            Continue with Google
          </Button>
          <Button className="w-full" variant="outline" size="lg" onClick={signInAnonymously}>
            Try as Guest
          </Button>
        </div>
      </div>
    )
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const handleSubmit = async (data: RoutineInput) => {
    if (!user || !db) return

    const firestore = db // 타입 가드
    const routineData = {
      ...data,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (editingRoutine) {
      await updateDoc(doc(firestore, 'users', user.uid, 'routines', editingRoutine.id), {
        ...data,
        updatedAt: new Date().toISOString(),
      })
    } else {
      await addDoc(collection(firestore, 'users', user.uid, 'routines'), routineData)
    }

    setShowForm(false)
    setEditingRoutine(null)
  }

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine)
    setShowForm(true)
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">☀️ Miracle Morning</h1>
          <p className="text-sm text-muted-foreground">
            {user?.displayName || 'Guest'}
            {isAnonymous && (
              <button onClick={linkWithGoogle} className="ml-2 text-primary underline">
                Link Google
              </button>
            )}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Form or List */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingRoutine ? 'Edit Routine' : 'New Routine'}</CardTitle>
          </CardHeader>
          <CardContent>
            <RoutineForm
              initialData={editingRoutine || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false)
                setEditingRoutine(null)
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <RoutineList
          onAddClick={() => setShowForm(true)}
          onEditClick={handleEdit}
        />
      )}

      {/* Bottom Navigation */}
      {!showForm && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="max-w-lg mx-auto flex justify-around">
            <Button variant="ghost" className="flex-col h-auto py-2" onClick={() => router.push('/report')}>
              <BarChart3 className="w-5 h-5 mb-1" />
              <span className="text-xs">Report</span>
            </Button>
            <Button className="flex-col h-auto py-3 px-8 rounded-full" onClick={() => router.push('/session')}>
              <Play className="w-6 h-6" />
            </Button>
            <Button variant="ghost" className="flex-col h-auto py-2">
              <Settings className="w-5 h-5 mb-1" />
              <span className="text-xs">Settings</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
