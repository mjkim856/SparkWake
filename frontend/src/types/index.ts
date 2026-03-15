// 도메인 타입 정의

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  isAnonymous: boolean
}

export interface Routine {
  id: string
  name: string
  startTime: string // HH:mm
  duration: number // 분
  link?: string
  videoVerification: boolean
  actionDescription?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface RoutineInput {
  name: string
  startTime: string
  duration: number
  link?: string
  videoVerification: boolean
  actionDescription?: string
}

export interface Session {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  wakeUpTime: string | null
  snoozeCount: number
  routineResults: RoutineResult[]
  status: 'in_progress' | 'completed' | 'abandoned'
  startedAt: string
  completedAt: string | null
}

export interface RoutineResult {
  routineId: string
  routineName: string
  status: 'completed' | 'skipped' | 'partial'
  completionMethod: 'auto' | 'manual' | null
  actualDuration: number | null
  startedAt: string | null
  completedAt: string | null
}

export interface DailyReport {
  id: string
  userId: string
  date: string
  wakeUpTime: string | null
  targetWakeUpTime: string
  snoozeCount: number
  totalRoutines: number
  completedRoutines: number
  skippedRoutines: number
  completionRate: number
  routineResults: RoutineResult[]
  aiSummary?: string
  createdAt: string
}

export interface AICoaching {
  suggestions: CoachingSuggestion[]
  generatedAt: string
}

export interface CoachingSuggestion {
  id: string
  type: 'time_adjust' | 'routine_swap' | 'encouragement'
  message: string
  action?: {
    routineId: string
    field: string
    oldValue: unknown
    newValue: unknown
  }
}

// 세션 상태
export type SessionState =
  | 'idle'
  | 'connecting'
  | 'wake_up'
  | 'routine'
  | 'verification'
  | 'report'
  | 'error'

// Gemini Live API Tool Calling 타입
export interface ToolCall {
  functionCalls: FunctionCall[]
}

export interface FunctionCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface FunctionResponse {
  id: string
  name: string
  response: { result: string }
}
