// Firebase 초기화
// 공식 문서: https://firebase.google.com/docs/web/setup

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore'
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let analytics: Analytics | undefined

// 클라이언트 사이드에서만 초기화
if (typeof window !== 'undefined') {
  const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
  
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  auth = getAuth(app)
  db = getFirestore(app)

  // Analytics 초기화 (에뮬레이터 모드에서는 스킵)
  if (!useEmulator) {
    isSupported().then((supported) => {
      if (supported && app) {
        analytics = getAnalytics(app)
      }
    })
  }

  // 개발 환경에서 에뮬레이터 연결
  if (process.env.NODE_ENV === 'development' && useEmulator) {
    connectAuthEmulator(auth, 'http://localhost:9099')
    connectFirestoreEmulator(db, 'localhost', 8080)
  }
}

export { app, auth, db, analytics }
