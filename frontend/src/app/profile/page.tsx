'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { GoogleAuthProvider, linkWithPopup, signOut } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Please sign in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-white overflow-x-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 bg-white/90 backdrop-blur-md">
          <button 
            onClick={() => router.back()}
            className="text-slate-700 flex size-12 shrink-0 items-center justify-center hover:bg-black/5 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Profile</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-24 px-4">
          {/* Profile Header */}
          <div className="flex flex-col items-center py-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#F5B301] to-[#E5A501] rounded-full flex items-center justify-center shadow-lg mb-4">
              <span className="material-symbols-outlined text-white text-5xl">person</span>
            </div>
            {isEditing ? (
              <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter nickname"
                  maxLength={20}
                  className="w-full text-center text-xl font-bold text-slate-900 border-b-2 border-[#F5B301] bg-transparent outline-none py-1"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={handleSaveNickname} 
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-[#F5B301] text-slate-900 font-semibold rounded-lg text-sm"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 bg-slate-100 text-slate-600 font-semibold rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 group"
              >
                <h3 className="text-xl font-bold text-slate-900">{nickname || 'Set Nickname'}</h3>
                <span className="material-symbols-outlined text-slate-400 text-lg group-hover:text-[#F5B301] transition-colors">edit</span>
              </button>
            )}
            <p className="text-slate-500 text-sm mt-1">{user.email || 'Anonymous user'}</p>
          </div>

          {/* Account Info */}
          <div className="space-y-3">
            {/* Account Type */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.isAnonymous ? 'bg-amber-100' : 'bg-green-100'
                  }`}>
                    <span className={`material-symbols-outlined ${
                      user.isAnonymous ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {user.isAnonymous ? 'person_outline' : 'verified_user'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Account Type</p>
                    <p className={`text-sm ${user.isAnonymous ? 'text-amber-600' : 'text-green-600'}`}>
                      {user.isAnonymous ? 'Guest Account' : 'Google Account'}
                    </p>
                  </div>
                </div>
                {user.isAnonymous && (
                  <span className="material-symbols-outlined text-amber-500">warning</span>
                )}
              </div>
            </div>

            {/* Link Google Account (for anonymous users) */}
            {user.isAnonymous && (
              <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FFFBEB] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#F5B301]">link</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 mb-1">Save Your Progress</p>
                    <p className="text-sm text-slate-600 mb-3">
                      Link your Google account to keep your data safe and sync across devices.
                    </p>
                    <button 
                      onClick={handleLinkGoogle} 
                      disabled={isLinking}
                      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border border-slate-200 transition-all active:scale-95"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {isLinking ? 'Linking...' : 'Link Google Account'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Section */}
            <div className="pt-4">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Settings</h4>
              
              <div className="bg-slate-50 rounded-xl overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-600">notifications</span>
                    <span className="font-medium text-slate-900">Notifications</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>
                
                <div className="h-px bg-slate-200 mx-4" />
                
                <button className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-600">schedule</span>
                    <span className="font-medium text-slate-900">Routine Settings</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>
                
                <div className="h-px bg-slate-200 mx-4" />
                
                <button className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-600">help</span>
                    <span className="font-medium text-slate-900">Help & Support</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95 mt-6"
            >
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>

            {/* App Version */}
            <p className="text-center text-xs text-slate-400 mt-4">SparkWake v1.0.0</p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex gap-2 border-t border-slate-100 bg-white px-4 pb-6 pt-2 absolute bottom-0 w-full z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
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
