# Frontend Tech Stack Decisions

## 확정 기술 스택

| 카테고리 | 선택 | 버전 | 근거 |
|----------|------|------|------|
| Framework | Next.js | 15.x | App Router, SSR, 빠른 개발 |
| Language | TypeScript | 5.x | 타입 안정성 |
| Styling | Tailwind CSS | 3.x | 빠른 스타일링 |
| UI Components | shadcn/ui | latest | 커스터마이징 용이 |
| State | React Context | - | 단순함, 추가 의존성 없음 |
| PWA | next-pwa | 5.x | Workbox 기반 |
| Auth | Firebase Auth | 10.x | 익명 + Google 로그인 |
| AI | @google/genai | latest | Live API 연결 |

## 주요 결정 사항

### 1. Live API 연결 방식
- **결정**: Frontend 직접 연결 (Client-to-server)
- **근거**: 
  - 지연시간 최소화 (Backend 프록시 불필요)
  - Google 공식 문서 권장 방식
  - JavaScript SDK 공식 지원
- **보안**: Ephemeral Token으로 API 키 보호

### 2. 상태 관리
- **결정**: React Context + useState
- **근거**:
  - MVP 규모에 적합
  - 추가 라이브러리 불필요
  - 학습 곡선 없음

### 3. UI 컴포넌트
- **결정**: Tailwind CSS + shadcn/ui
- **근거**:
  - 빠른 개발 속도
  - 일관된 디자인 시스템
  - 커스터마이징 용이

## 패키지 목록

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@google/genai": "^1.0.0",
    "firebase": "^10.0.0",
    "next-pwa": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/node": "^20.0.0"
  }
}
```
