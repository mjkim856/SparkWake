# Frontend Components Design

## 컴포넌트 계층 구조

```
App (layout.tsx)
├── AuthProvider
│   └── ThemeProvider
│       ├── HomePage (page.tsx)
│       │   ├── Header
│       │   ├── RoutineList
│       │   │   └── RoutineCard (반복)
│       │   └── AddRoutineButton
│       │
│       ├── SettingsPage (/settings)
│       │   ├── Header
│       │   ├── RoutineForm
│       │   │   ├── TimeInput
│       │   │   ├── DurationInput
│       │   │   ├── LinkInput
│       │   │   └── VideoVerificationToggle
│       │   └── SaveButton
│       │
│       ├── SessionPage (/session)
│       │   ├── LiveSessionProvider
│       │   │   ├── WakeUpView
│       │   │   ├── RoutineProgressView
│       │   │   │   ├── CurrentRoutineCard
│       │   │   │   ├── Timer
│       │   │   │   ├── ProgressBar
│       │   │   │   └── ActionButtons
│       │   │   └── VideoVerificationView
│       │   │       ├── CameraPreview
│       │   │       ├── RecognitionStatus
│       │   │       └── ManualCompleteButton
│       │   └── AudioVisualizer
│       │
│       └── ReportPage (/report)
│           ├── Header
│           ├── CompletionSummary
│           ├── RoutineResultList
│           │   └── RoutineResultCard (반복)
│           ├── TimeComparisonChart
│           └── VoiceSummaryButton
```

---

## 핵심 컴포넌트 상세

### 1. AuthProvider

```typescript
// contexts/AuthContext.tsx
interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAnonymous: boolean
  signInAnonymously: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  linkWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

// 사용 예시
const { user, signInAnonymously } = useAuth()
```

### 2. LiveSessionProvider

```typescript
// contexts/LiveSessionContext.tsx
interface LiveSessionContextValue {
  state: SessionState
  currentRoutine: Routine | null
  transcript: string
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  
  startSession: () => Promise<void>
  endSession: () => Promise<void>
  completeRoutine: (method: 'auto' | 'manual') => void
  skipRoutine: () => void
  toggleAudio: () => void
  toggleVideo: () => void
}
```

### 3. RoutineCard

```typescript
// components/routine/RoutineCard.tsx
interface RoutineCardProps {
  routine: Routine
  onEdit: () => void
  onDelete: () => void
}

// UI 구조
<Card>
  <CardHeader>
    <Time>{routine.startTime}</Time>
    <Title>{routine.name}</Title>
    {routine.link && <LinkIcon />}
  </CardHeader>
  <CardContent>
    <Duration>{routine.duration}분</Duration>
    {routine.videoVerification && (
      <Badge>비디오 인증: {routine.actionDescription}</Badge>
    )}
  </CardContent>
  <CardActions>
    <EditButton onClick={onEdit} />
    <DeleteButton onClick={onDelete} />
  </CardActions>
</Card>
```

### 4. RoutineForm

```typescript
// components/routine/RoutineForm.tsx
interface RoutineFormProps {
  initialData?: Routine
  onSubmit: (data: RoutineInput) => void
  onCancel: () => void
}

// 폼 필드
interface RoutineInput {
  name: string              // 필수
  startTime: string         // 필수, HH:mm
  duration: number          // 필수, 분 단위
  link?: string             // 선택
  videoVerification: boolean // 기본값 false
  actionDescription?: string // videoVerification=true일 때 필수
}

// 유효성 검사
const schema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, '시간 형식: HH:mm'),
  duration: z.number().min(1).max(180),
  link: z.string().url().optional().or(z.literal('')),
  videoVerification: z.boolean(),
  actionDescription: z.string().optional()
}).refine(data => {
  if (data.videoVerification && !data.actionDescription) {
    return false
  }
  return true
}, { message: '비디오 인증 시 행동 설명을 입력하세요' })
```

### 5. CameraPreview

```typescript
// components/session/CameraPreview.tsx
interface CameraPreviewProps {
  onFrame: (frame: ImageData) => void
  isActive: boolean
}

// 구현 핵심
const CameraPreview = ({ onFrame, isActive }: CameraPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    if (!isActive) return
    
    // 카메라 스트림 획득
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current!.srcObject = stream
      })
    
    // 프레임 캡처 (1fps)
    const interval = setInterval(() => {
      const ctx = canvasRef.current!.getContext('2d')!
      ctx.drawImage(videoRef.current!, 0, 0)
      const frame = ctx.getImageData(0, 0, 640, 480)
      onFrame(frame)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isActive])
  
  return (
    <div className="relative">
      <video ref={videoRef} autoPlay muted className="rounded-lg" />
      <canvas ref={canvasRef} className="hidden" width={640} height={480} />
    </div>
  )
}
```

### 6. AudioVisualizer

```typescript
// components/session/AudioVisualizer.tsx
// AI가 말할 때 시각적 피드백 제공
interface AudioVisualizerProps {
  isActive: boolean
  isSpeaking: boolean
}

// 간단한 펄스 애니메이션
<div className={cn(
  "w-16 h-16 rounded-full bg-primary",
  isSpeaking && "animate-pulse"
)} />
```

---

## 페이지별 상태 관리

### HomePage
```typescript
// 로컬 상태
const [routines, setRoutines] = useState<Routine[]>([])
const [isLoading, setIsLoading] = useState(true)

// Firestore 실시간 구독
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(collection(db, 'users', userId, 'routines'), orderBy('startTime')),
    (snapshot) => {
      setRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setIsLoading(false)
    }
  )
  return unsubscribe
}, [userId])
```

### SessionPage
```typescript
// LiveSessionProvider 내부 상태
const [state, setState] = useState<SessionState>('idle')
const [currentRoutineIndex, setCurrentRoutineIndex] = useState(0)
const [sessionResults, setSessionResults] = useState<RoutineResult[]>([])
const [transcript, setTranscript] = useState('')

// WebSocket 연결
const wsRef = useRef<WebSocket | null>(null)
```

### ReportPage
```typescript
// 서버에서 리포트 조회
const [report, setReport] = useState<DailyReport | null>(null)
const [aiCoaching, setAiCoaching] = useState<AICoaching | null>(null)

useEffect(() => {
  const today = format(new Date(), 'yyyy-MM-dd')
  getDoc(doc(db, 'users', userId, 'reports', today))
    .then(doc => setReport(doc.data()))
}, [userId])

// 주간 리포트일 때 AI 코칭 로드
useEffect(() => {
  if (reportType === 'weekly') {
    fetchAICoaching(userId).then(setAiCoaching)
  }
}, [reportType, userId])
```

### 7. AICoachingCard

```typescript
// components/report/AICoachingCard.tsx
interface AICoaching {
  suggestions: CoachingSuggestion[]
  generatedAt: string
}

interface CoachingSuggestion {
  id: string
  type: 'time_adjust' | 'routine_swap' | 'encouragement'
  message: string
  action?: {
    routineId: string
    field: string
    oldValue: any
    newValue: any
  }
}

// UI 구조
<Card className="bg-gradient-to-r from-blue-50 to-purple-50">
  <CardHeader>
    <span className="text-2xl">🤖</span>
    <Title>AI 코칭</Title>
  </CardHeader>
  <CardContent>
    {suggestions.map(suggestion => (
      <div key={suggestion.id} className="p-3 bg-white rounded-lg mb-2">
        <p>{suggestion.message}</p>
        {suggestion.action && (
          <div className="flex gap-2 mt-2">
            <Button onClick={() => applySuggestion(suggestion)}>
              적용하기
            </Button>
            <Button variant="ghost">다음에</Button>
          </div>
        )}
      </div>
    ))}
  </CardContent>
</Card>

// 제안 적용 함수
const applySuggestion = async (suggestion: CoachingSuggestion) => {
  if (!suggestion.action) return
  
  const { routineId, field, newValue } = suggestion.action
  await updateDoc(doc(db, 'users', userId, 'routines', routineId), {
    [field]: newValue
  })
  
  toast.success('루틴이 업데이트되었어요!')
}
```

### AI 코칭 생성 로직 (Backend)

```python
# services/coaching_service.py
async def generate_coaching(user_id: str) -> AICoaching:
    # 최근 7일 데이터 조회
    weekly_data = await get_weekly_sessions(user_id)
    
    prompt = f"""
사용자의 지난 7일 루틴 데이터를 분석해주세요:
{json.dumps(weekly_data, ensure_ascii=False)}

다음 기준으로 2-3개의 맞춤형 제안을 해주세요:
1. 스킵률 높은 루틴 → 시간 단축 또는 대체 제안
2. 특정 요일 패턴 → 요일별 맞춤 조정
3. 잘하고 있는 점 → 칭찬과 격려

JSON 형식으로 응답:
{{"suggestions": [{{"type": "time_adjust", "message": "...", "action": {{...}}}}]}}
"""
    
    response = await gemini.generate_content(prompt)
    return AICoaching(**json.loads(response.text))
```

---

## API 통합 포인트

| 컴포넌트 | Backend API | 용도 |
|----------|-------------|------|
| AuthProvider | POST /api/auth/token | Ephemeral Token 발급 |
| RoutineForm | Firestore 직접 | 루틴 CRUD |
| LiveSessionProvider | WebSocket /ws/live | 실시간 스트리밍 |
| LiveSessionProvider | POST /api/session/* | 세션 시작/종료/완료 |
| ReportPage | Firestore 직접 | 리포트 조회 |
| PWAManager | POST /api/push/register | 푸시 토큰 등록 |
