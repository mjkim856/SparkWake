'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, setDoc, collection, query, getDocs, orderBy } from 'firebase/firestore'
import { GoogleAuthProvider, linkWithPopup, signOut } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { DailyReport } from '@/types'

// Achievement type
interface Achievement {
  id: string
  icon: string
  title: string
  unlocked: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [nickname, setNickname] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    if (!user || !db) return
    
    const firestore = db
    const loadProfileAndStats = async () => {
      // Load profile
      const docRef = doc(firestore, 'users', user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setNickname(docSnap.data().nickname || '')
      }

      // Load reports for achievements
      const reportsQuery = query(
        collection(firestore, 'users', user.uid, 'reports'),
        orderBy('date', 'desc')
      )
      const snapshot = await getDocs(reportsQuery)
      const reports = snapshot.docs.map(doc => doc.data() as DailyReport)

      const totalSessions = reports.length
      const totalRoutines = reports.reduce((sum, r) => sum + r.completedRoutines, 0)
      
      // Calculate streak
      let bestStreak = 0
      let tempStreak = 0
      const today = new Date()
      
      for (let i = 0; i < reports.length; i++) {
        const reportDate = new Date(reports[i].date)
        const expectedDate = new Date(today)
        expectedDate.setDate(today.getDate() - i)
        
        if (reportDate.toDateString() === expectedDate.toDateString() && reports[i].completionRate >= 0.5) {
          tempStreak++
        } else {
          bestStreak = Math.max(bestStreak, tempStreak)
          tempStreak = reports[i].completionRate >= 0.5 ? 1 : 0
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak)

      // Check early bird
      const hasEarlyBird = reports.some(r => {
        const time = r.wakeUpTime
        if (!time) return false
        const hour = parseInt(time.split(':')[0])
        return hour < 7
      })

      // Generate achievements (4 items for grid) - Early Bird always unlocked for demo
      const achievementsList: Achievement[] = [
        { id: 'early_bird', icon: 'wb_sunny', title: 'Early Bird', unlocked: true },
        { id: 'power_up', icon: 'bolt', title: 'Power Up', unlocked: totalRoutines >= 10 },
        { id: 'miracle', icon: 'auto_awesome', title: 'Miracle', unlocked: bestStreak >= 7 },
        { id: 'zen', icon: 'self_improvement', title: 'Zen', unlocked: totalSessions >= 30 },
      ]
      setAchievements(achievementsList)
    }
    loadProfileAndStats()
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

  // Generate avatar URL using DiceBear (thumbs style - cute emoji faces)
  const avatarUrl = user ? `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}&backgroundColor=fef3c7` : ''

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f8f5] flex items-center justify-center">
        <p className="text-slate-500">Please sign in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f8f5] flex justify-center">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-[#f8f8f5] overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center p-4 pb-2 justify-between">
          <button 
            onClick={() => router.back()}
            className="text-slate-900 flex size-12 shrink-0 items-center justify-center"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center">Profile</h2>
          <div className="w-12" />
        </div>

        {/* Profile Section */}
        <div className="flex p-4">
          <div className="flex w-full flex-col gap-4 items-center">
            <div className="flex gap-4 flex-col items-center">
              {/* Avatar with DiceBear */}
              <div className="w-32 h-32 rounded-full border-4 border-[#F5B301]/20 overflow-hidden bg-[#F5B301]/10">
                <img 
                  src={avatarUrl} 
                  alt="Profile avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col items-center justify-center">
                {isEditing ? (
                  <div className="flex flex-col items-center gap-2">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter nickname"
                      maxLength={20}
                      className="text-center text-[22px] font-bold text-slate-900 border-b-2 border-[#F5B301] bg-transparent outline-none py-1"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveNickname} 
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-[#F5B301] text-slate-900 font-semibold rounded-lg text-sm"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-1.5 bg-slate-200 text-slate-600 font-semibold rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-900 text-[22px] font-bold leading-tight tracking-tight text-center">
                      {nickname || 'Set Nickname'}
                    </p>
                    <p className="text-slate-500 text-base font-normal text-center">
                      {user.isAnonymous ? 'Anonymous user' : user.email}
                    </p>
                  </>
                )}
              </div>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex min-w-[120px] items-center justify-center rounded-full h-10 px-6 bg-[#F5B301]/10 text-slate-900 text-sm font-bold hover:bg-[#F5B301]/20 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Account Details Section */}
        <div className="px-4 py-4">
          <h3 className="text-slate-900 text-lg font-bold leading-tight tracking-tight pb-4">Account Details</h3>
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <p className="text-slate-500 text-sm font-medium">Title</p>
              <p className="text-slate-900 text-sm font-semibold">
                {user.isAnonymous ? 'Anonymous user' : 'Member'}
              </p>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <p className="text-slate-500 text-sm font-medium">Email</p>
              <p className="text-slate-900 text-sm font-semibold">
                {user.email || 'No email (Anonymous)'}
              </p>
            </div>
            <div className="flex justify-between items-center pb-1">
              <p className="text-slate-500 text-sm font-medium">Account Type</p>
              <p className="text-slate-900 text-sm font-semibold flex items-center gap-1">
                {user.isAnonymous ? (
                  <>
                    <span className="material-symbols-outlined text-amber-500 text-sm">warning</span>
                    Guest Account
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-green-500 text-sm">verified</span>
                    Google Account
                  </>
                )}
              </p>
            </div>
            
            {/* Link Google Account (for anonymous users) */}
            {user.isAnonymous && (
              <div className="pt-4 space-y-3">
                <div className="bg-[#F5B301]/5 rounded-lg p-3 text-center">
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Link your Google account to save your data permanently and sync across devices.
                  </p>
                </div>
                <button 
                  onClick={handleLinkGoogle}
                  disabled={isLinking}
                  className="w-full flex items-center justify-center gap-2 bg-[#F5B301] text-slate-900 font-bold py-3 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined">link</span>
                  {isLinking ? 'Linking...' : 'Link Google Account'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Achievements Section */}
        <div className="px-4 py-6">
          <h3 className="text-slate-900 text-lg font-bold leading-tight tracking-tight pb-4">Achievements</h3>
          <div className="grid grid-cols-4 gap-4">
            {achievements.map((achievement) => (
              <div key={achievement.id} className={`flex flex-col items-center gap-2 ${!achievement.unlocked ? 'opacity-40' : ''}`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  achievement.unlocked 
                    ? 'bg-[#F5B301]/20 text-[#F5B301] border-2 border-[#F5B301]' 
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  <span className="material-symbols-outlined text-3xl">
                    {achievement.unlocked ? achievement.icon : 'lock'}
                  </span>
                </div>
                <p className={`text-[10px] font-bold text-center uppercase tracking-wider ${
                  achievement.unlocked ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {achievement.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Section */}
        <div className="px-4 py-6">
          <h3 className="text-slate-900 text-lg font-bold leading-tight tracking-tight pb-4">Settings</h3>
          <div className="space-y-1">
            <button className="w-full flex items-center justify-between py-3 hover:bg-slate-100 rounded-lg px-2 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-500">notifications</span>
                <span className="text-slate-900 font-medium">Notifications</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
            <button className="w-full flex items-center justify-between py-3 hover:bg-slate-100 rounded-lg px-2 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-500">schedule</span>
                <span className="text-slate-900 font-medium">Routine Settings</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
            <button className="w-full flex items-center justify-between py-3 hover:bg-slate-100 rounded-lg px-2 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-500">help</span>
                <span className="text-slate-900 font-medium">Help & Support</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 py-4 pb-24">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-4 text-rose-500 font-bold hover:bg-rose-50 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 flex border-t border-slate-200 bg-[#f8f8f5] px-4 pb-6 pt-2 z-50 max-w-md mx-auto">
          <button 
            onClick={() => router.push('/')}
            className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-400"
          >
            <span className="material-symbols-outlined">home</span>
            <p className="text-[10px] font-medium leading-normal tracking-wide">Home</p>
          </button>
          <button 
            onClick={() => router.push('/session')}
            className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-400"
          >
            <span className="material-symbols-outlined">videocam</span>
            <p className="text-[10px] font-medium leading-normal tracking-wide">Live</p>
          </button>
          <button 
            onClick={() => router.push('/report')}
            className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-400"
          >
            <span className="material-symbols-outlined">bar_chart</span>
            <p className="text-[10px] font-medium leading-normal tracking-wide">Report</p>
          </button>
          <button className="flex flex-1 flex-col items-center justify-end gap-1 text-[#F5B301]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <p className="text-[10px] font-medium leading-normal tracking-wide">Profile</p>
          </button>
        </div>
      </div>
    </div>
  )
}
