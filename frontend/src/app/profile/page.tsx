'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { GoogleAuthProvider, linkWithPopup, signOut } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [nickname, setNickname] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLinking, setIsLinking] = useState(false)

  useEffect(() => {
    if (!user || !db) return
    
    const firestore = db
    const loadProfile = async () => {
      const docRef = doc(firestore, 'users', user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setNickname(docSnap.data().nickname || '')
      }
    }
    loadProfile()
  }, [user])

  const handleSaveNickname = async () => {
    if (!user || !db) return
    const firestore = db
    setIsSaving(true)
    try {
      await setDoc(doc(firestore, 'users', user.uid), {
        nickname,
        email: user.email,
        updatedAt: new Date().toISOString(),
      }, { merge: true })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save nickname:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLinkGoogle = async () => {
    if (!auth?.currentUser) return
    setIsLinking(true)
    try {
      const provider = new GoogleAuthProvider()
      await linkWithPopup(auth.currentUser, provider)
      alert('Google account linked successfully!')
    } catch (error: unknown) {
      const firebaseError = error as { code?: string }
      if (firebaseError.code === 'auth/credential-already-in-use') {
        alert('This Google account is already linked to another user.')
      } else {
        console.error('Failed to link Google account:', error)
      }
    } finally {
      setIsLinking(false)
    }
  }

  const handleLogout = async () => {
    if (!auth) return
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-600">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto">
        {/* Profile Card */}
        <Card className="shadow-spark">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-spark-gradient rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">person</span>
              </div>
              <div>
                <p className="text-lg font-bold">{nickname || 'No nickname'}</p>
                <p className="text-sm text-muted-foreground">{user.email || 'Anonymous user'}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nickname Edit */}
            <div>
              <label className="block text-sm font-medium mb-2">Nickname</label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter nickname"
                    maxLength={20}
                  />
                  <Button onClick={handleSaveNickname} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{nickname || 'Not set'}</span>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <p className="text-gray-700">{user.email || 'No email (Anonymous)'}</p>
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Account Type</label>
              <p className="text-gray-700">
                {user.isAnonymous ? (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Guest Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Google Account
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Link Google Account (for anonymous users) */}
        {user.isAnonymous && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Link your Google account to save your data permanently
                </p>
                <Button 
                  onClick={handleLinkGoogle} 
                  disabled={isLinking}
                  className="w-full"
                  variant="outline"
                >
                  <span className="material-symbols-outlined mr-2">link</span>
                  {isLinking ? 'Linking...' : 'Link Google Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logout */}
        <Button 
          onClick={handleLogout} 
          variant="destructive" 
          className="w-full"
        >
          <span className="material-symbols-outlined mr-2">logout</span>
          Logout
        </Button>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <button 
            onClick={() => router.push('/')}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#F5B301] transition-colors py-2"
          >
            <span className="material-symbols-outlined text-2xl">home</span>
            <p className="text-[10px] font-medium leading-normal tracking-wide">Home</p>
          </button>
          <button 
            onClick={() => router.push('/session')}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#F5B301] transition-colors py-2"
          >
            <span className="material-symbols-outlined text-2xl">videocam</span>
            <p className="text-[10px] font-medium leading-normal tracking-wide">Live</p>
          </button>
          <button 
            onClick={() => router.push('/report')}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#F5B301] transition-colors py-2"
          >
            <span className="material-symbols-outlined text-2xl">bar_chart</span>
            <p className="text-[10px] font-medium leading-normal tracking-wide">Report</p>
          </button>
          <button className="flex flex-1 flex-col items-center justify-center gap-1 text-[#F5B301] py-2">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <p className="text-[10px] font-bold leading-normal tracking-wide">Profile</p>
          </button>
        </div>
      </div>
    </div>
  )
}
