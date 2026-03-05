# Frontend NFR Requirements

## 1. 성능 요구사항

| ID | 요구사항 | 목표값 | 측정 방법 |
|----|----------|--------|----------|
| PERF-F1 | 초기 로딩 시간 (LCP) | < 2.5초 | Lighthouse |
| PERF-F2 | 인터랙션 응답 (INP) | < 200ms | Lighthouse |
| PERF-F3 | Live API 연결 시간 | < 1초 | 콘솔 로그 |
| PERF-F4 | 오디오 지연시간 | < 500ms | 체감 테스트 |

## 2. 가용성 요구사항

| ID | 요구사항 | 목표값 |
|----|----------|--------|
| AVAIL-F1 | PWA 오프라인 기본 UI | 지원 |
| AVAIL-F2 | 네트워크 재연결 자동 복구 | 지원 |
| AVAIL-F3 | Service Worker 캐싱 | 정적 자산 |

## 3. 보안 요구사항 ⚠️

| ID | 요구사항 | 구현 방법 |
|----|----------|----------|
| SEC-F1 | API 키 노출 방지 | Ephemeral Token 사용 |
| SEC-F2 | 민감정보 로깅 금지 | 콘솔 출력 필터링 |
| SEC-F3 | XSS 방지 | React 기본 이스케이핑 |
| SEC-F4 | HTTPS 필수 | Firebase Hosting |

### 민감정보 필터링 규칙

```typescript
// 로깅 시 마스킹 필수 항목
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
];

// 프로덕션에서 console.log 비활성화
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.debug = () => {};
}
```

## 4. 접근성 요구사항

| ID | 요구사항 | 구현 방법 |
|----|----------|----------|
| A11Y-F1 | 키보드 네비게이션 | tabIndex, focus 관리 |
| A11Y-F2 | 스크린 리더 지원 | aria-label, role |
| A11Y-F3 | 색상 대비 | WCAG AA 기준 |

## 5. 확장성 요구사항

| ID | 요구사항 | 설계 방향 |
|----|----------|----------|
| SCALE-F1 | 다국어 지원 준비 | i18n 구조 설계 (MVP 후) |
| SCALE-F2 | 컴포넌트 재사용성 | shadcn/ui 기반 |
