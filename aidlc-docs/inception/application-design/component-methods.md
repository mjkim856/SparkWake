# Component Methods

## Frontend Components

### FC-1: AuthProvider
```typescript
// 상태
currentUser: User | null
isLoading: boolean
isAnonymous: boolean

// 메서드
signInAnonymously(): Promise<User>
signInWithGoogle(): Promise<User>
linkAnonymousToGoogle(): Promise<User>
signOut(): Promise<void>
getIdToken(): Promise<string>
```

### FC-2: RoutineManager
```typescript
// 상태
routines: Routine[]
selectedRoutine: Routine | null
isEditing: boolean

// 메서드
fetchRoutines(): Promise<Routine[]>
createRoutine(data: RoutineInput): Promise<Routine>
updateRoutine(id: string, data: RoutineInput): Promise<Routine>
deleteRoutine(id: string): Promise<void>
reorderRoutines(routineIds: string[]): Promise<void>
```

### FC-3: LiveSessionController
```typescript
// 상태
sessionState: 'disconnected' | 'connecting' | 'active' | 'error'
isAudioEnabled: boolean
isVideoEnabled: boolean
currentTranscript: string

// 메서드
startSession(config: SessionConfig): Promise<void>
endSession(): Promise<void>
sendAudioChunk(audioData: ArrayBuffer): void
sendVideoFrame(frameData: ImageData): void
onAudioResponse(callback: (audio: ArrayBuffer) => void): void
onTranscript(callback: (text: string) => void): void
onActionRecognized(callback: (action: ActionResult) => void): void
reconnect(): Promise<void>
```

### FC-4: RoutineProgressView
```typescript
// 상태
currentRoutine: Routine | null
elapsedTime: number
isCompleted: boolean

// 메서드
startRoutine(routine: Routine): void
completeRoutine(): void
skipRoutine(): void
openLink(url: string): void
getProgress(): number
```

### FC-5: VideoVerificationView
```typescript
// 상태
verificationState: 'waiting' | 'recognizing' | 'completed' | 'failed'
cameraStream: MediaStream | null
recognitionProgress: number

// 메서드
startCamera(): Promise<void>
stopCamera(): void
captureSnapshot(): ImageData
onVerificationComplete(callback: (result: VerificationResult) => void): void
manualComplete(): void
```

### FC-6: DailyReportView
```typescript
// 상태
report: DailyReport | null
isLoading: boolean

// 메서드
fetchReport(date: string): Promise<DailyReport>
playVoiceSummary(): void
getCompletionRate(): number
getTimeComparison(): TimeComparison[]
```

### FC-7: PWAManager
```typescript
// 상태
isInstalled: boolean
isPushEnabled: boolean
swRegistration: ServiceWorkerRegistration | null

// 메서드
registerServiceWorker(): Promise<void>
requestPushPermission(): Promise<boolean>
subscribeToPush(userId: string): Promise<void>
unsubscribeFromPush(): Promise<void>
showInstallPrompt(): void
```

---

## Backend Components

### BC-1: AuthMiddleware
```python
# 메서드
async def verify_token(token: str) -> UserContext
async def get_current_user(request: Request) -> UserContext
def require_auth(func: Callable) -> Callable  # 데코레이터
```

### BC-2: RoutineService
```python
# 메서드
async def create_routine(user_id: str, data: RoutineCreate) -> Routine
async def get_routines(user_id: str) -> list[Routine]
async def get_routine(user_id: str, routine_id: str) -> Routine
async def update_routine(user_id: str, routine_id: str, data: RoutineUpdate) -> Routine
async def delete_routine(user_id: str, routine_id: str) -> None
async def validate_routine(data: RoutineCreate) -> ValidationResult
```

### BC-3: SessionService
```python
# 메서드
async def start_session(user_id: str) -> RoutineSession
async def end_session(session_id: str) -> RoutineSession
async def get_current_routine(session_id: str) -> Routine | None
async def complete_routine(session_id: str, routine_id: str, result: CompletionResult) -> None
async def skip_routine(session_id: str, routine_id: str, reason: str) -> None
async def record_time(session_id: str, routine_id: str, start: datetime, end: datetime) -> None
```

### BC-4: GeminiLiveService
```python
# 메서드
async def create_live_session(config: LiveSessionConfig) -> LiveSession
async def send_audio(session: LiveSession, audio_data: bytes) -> None
async def send_video_frame(session: LiveSession, frame_data: bytes) -> None
async def receive_audio(session: LiveSession) -> AsyncIterator[bytes]
async def receive_transcript(session: LiveSession) -> AsyncIterator[str]
async def recognize_action(session: LiveSession, action_description: str) -> ActionResult
async def close_session(session: LiveSession) -> None
async def set_system_instruction(session: LiveSession, instruction: str) -> None
```

### BC-5: ReportService
```python
# 메서드
async def generate_daily_report(user_id: str, date: date) -> DailyReport
async def get_daily_report(user_id: str, date: date) -> DailyReport | None
async def calculate_completion_rate(session: RoutineSession) -> float
async def calculate_time_comparison(session: RoutineSession) -> list[TimeComparison]
async def generate_voice_summary(report: DailyReport) -> str
```

### BC-6: PushNotificationService
```python
# 메서드
async def register_token(user_id: str, fcm_token: str) -> None
async def unregister_token(user_id: str, fcm_token: str) -> None
async def schedule_alarm(user_id: str, alarm_time: time) -> ScheduledAlarm
async def cancel_alarm(alarm_id: str) -> None
async def send_notification(user_id: str, title: str, body: str, data: dict) -> None
async def send_wake_up_notification(user_id: str) -> None
```

### BC-7: StorageService
```python
# 메서드
async def upload_snapshot(user_id: str, session_id: str, image_data: bytes) -> str
async def get_snapshot_url(path: str) -> str
async def delete_snapshot(path: str) -> None
async def list_snapshots(user_id: str, session_id: str) -> list[str]
```

---

## Data Models

### Routine
```typescript
interface Routine {
  id: string
  userId: string
  name: string
  startTime: string  // HH:mm format
  duration: number   // minutes
  link?: string
  videoVerification: boolean
  actionDescription?: string
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### RoutineSession
```typescript
interface RoutineSession {
  id: string
  userId: string
  date: string  // YYYY-MM-DD
  startedAt: Timestamp
  endedAt?: Timestamp
  routineResults: RoutineResult[]
  status: 'active' | 'completed' | 'abandoned'
}
```

### RoutineResult
```typescript
interface RoutineResult {
  routineId: string
  status: 'completed' | 'skipped' | 'manual'
  actualStartTime?: Timestamp
  actualEndTime?: Timestamp
  verificationMethod?: 'auto' | 'manual' | 'skipped'
  snapshotUrl?: string
}
```

### DailyReport
```typescript
interface DailyReport {
  id: string
  userId: string
  date: string
  sessionId: string
  completionRate: number
  totalPlannedTime: number
  totalActualTime: number
  routineSummaries: RoutineSummary[]
  createdAt: Timestamp
}
```
