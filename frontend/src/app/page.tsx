'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { RoutineList } from '@/components/routine/RoutineList'
import { RoutineForm } from '@/components/routine/RoutineForm'
import type { Routine, RoutineInput } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading, isAnonymous, signInAnonymously, signInWithGoogle, linkWithGoogle, signOut } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)

  // 로그인 화면
  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#F5B301] rounded-2xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              wb_sunny
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SparkWake</h1>
          <p className="text-gray-500">Your AI Morning Coach</p>
        </div>
        
        <div className="w-full max-w-sm space-y-4">
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-[#F5B301] hover:bg-[#E5A501] text-black font-bold py-4 px-6 rounded-xl transition-colors shadow-lg flex justify-center items-center gap-2"
          >
            Continue with Google
          </button>
          <button 
            onClick={signInAnonymously}
            className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-colors hover:bg-gray-50"
          >
            Try as Guest
          </button>
        </div>
      </div>
    )
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-[#F5B301] rounded-2xl flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-white text-3xl">wb_sunny</span>
        </div>
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    )
  }

  const handleSubmit = async (data: RoutineInput) => {
    if (!user || !db) return

    const firestore = db
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
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-center sticky top-0 z-10 bg-[#F8F9FA]/90 backdrop-blur-md border-b border-gray-200">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Good morning,</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {user?.displayName || 'Guest'}
            {isAnonymous && (
              <button onClick={linkWithGoogle} className="ml-2 text-sm text-[#F5B301] font-medium">
                Link Google
              </button>
            )}
          </h1>
        </div>
        <button 
          onClick={signOut}
          className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300 hover:bg-gray-300 transition-colors"
        >
          <span className="material-symbols-outlined text-gray-600 text-xl">logout</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 overflow-y-auto space-y-8 pb-32">
        {showForm ? (
          <RoutineForm
            initialData={editingRoutine || undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingRoutine(null)
            }}
          />
        ) : (
          <RoutineList
            onAddClick={() => setShowForm(true)}
            onEditClick={handleEdit}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      {!showForm && (
        <div className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-gray-200 bg-white px-4 pb-6 pt-3 z-50">
          <button 
            className="flex flex-1 flex-col items-center justify-end gap-1 text-[#F5B301]"
          >
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
            <p className="text-[10px] font-bold tracking-wide">Home</p>
          </button>
          <button 
            onClick={() => router.push('/session')}
            className="flex flex-1 flex-col items-center justify-end gap-1 text-gray-400 hover:text-[#F5B301] transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">videocam</span>
            <p className="text-[10px] font-medium tracking-wide">Live</p>
          </button>
          <button 
            onClick={() => router.push('/report')}
            className="flex flex-1 flex-col items-center justify-end gap-1 text-gray-400 hover:text-[#F5B301] transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">bar_chart</span>
            <p className="text-[10px] font-medium tracking-wide">Report</p>
          </button>
          <button 
            className="flex flex-1 flex-col items-center justify-end gap-1 text-gray-400 hover:text-[#F5B301] transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">person</span>
            <p className="text-[10px] font-medium tracking-wide">Profile</p>
          </button>
        </div>
      )}
    </div>
  )
}
