# Business Rules

## 1. 인증 규칙

| ID | 규칙 | 검증 시점 |
|----|------|----------|
| AUTH-1 | 모든 API 요청은 유효한 Firebase ID Token 필요 | 모든 요청 |
| AUTH-2 | 익명 사용자도 모든 기능 사용 가능 | 로그인 시 |
| AUTH-3 | 익명→Google 연결 시 기존 데이터 유지 | 계정 연결 시 |
| AUTH-4 | 사용자는 자신의 데이터만 접근 가능 | 모든 데이터 접근 |

---

## 2. 루틴 규칙

| ID | 규칙 | 검증 시점 |
|----|------|----------|
| RTN-1 | 루틴 이름은 1-100자 | 생성/수정 시 |
| RTN-2 | 시작 시간은 HH:mm 형식 (00:00-23:59) | 생성/수정 시 |
| RTN-3 | 소요 시간은 1-180분 | 생성/수정 시 |
| RTN-4 | 링크는 유효한 URL 형식이어야 함 | 생성/수정 시 |
| RTN-5 | 비디오 인증 활성화 시 행동 설명 필수 | 생성/수정 시 |
| RTN-6 | 루틴 목록은 시작 시간 순 정렬 | 조회 시 |
| RTN-7 | 사용자당 최대 20개 루틴 | 생성 시 |

### 유효성 검사 코드

```python
def validate_routine(data: RoutineCreate) -> list[str]:
    errors = []
    
    # RTN-1
    if not (1 <= len(data.name) <= 100):
        errors.append("Name must be 1-100 characters")
    
    # RTN-2
    if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", data.start_time):
        errors.append("Invalid time format (HH:mm)")
    
    # RTN-3
    if not (1 <= data.duration <= 180):
        errors.append("Duration must be 1-180 minutes")
    
    # RTN-4
    if data.link:
        try:
            result = urlparse(data.link)
            if not all([result.scheme, result.netloc]):
                errors.append("Invalid URL format")
        except:
            errors.append("Invalid URL format")
    
    # RTN-5
    if data.video_verification and not data.action_description:
        errors.append("Action description required for video verification")
    
    return errors
```

---

## 3. 세션 규칙

| ID | 규칙 | 검증 시점 |
|----|------|----------|
| SES-1 | 하루에 하나의 활성 세션만 가능 | 세션 시작 시 |
| SES-2 | 세션은 active → completed/abandoned 상태 전이만 가능 | 상태 변경 시 |
| SES-3 | 완료된 세션은 수정 불가 | 모든 수정 시 |
| SES-4 | 루틴 완료/스킵은 활성 세션에서만 가능 | 완료/스킵 시 |
| SES-5 | 같은 루틴을 중복 완료/스킵 불가 | 완료/스킵 시 |

### 상태 전이 다이어그램

```
         start()
    ┌──────────────┐
    │              │
    ▼              │
┌────────┐    ┌────────┐
│ active │───▶│completed│
└────────┘    └────────┘
    │              ▲
    │   end()      │
    │              │
    │         ┌────────┐
    └────────▶│abandoned│
      timeout └────────┘
```

---

## 4. 비디오 인증 규칙

| ID | 규칙 | 검증 시점 |
|----|------|----------|
| VID-1 | 비디오 프레임은 1fps로 제한 | 스트리밍 시 |
| VID-2 | 30초 내 인식 실패 시 수동 완료 옵션 제공 | 인증 중 |
| VID-3 | 자동 인식 시 스냅샷 저장 | 인식 성공 시 |
| VID-4 | 스냅샷은 Cloud Storage에 저장 | 저장 시 |
| VID-5 | 스냅샷 경로: `users/{userId}/sessions/{date}/{routineId}.jpg` | 저장 시 |

---

## 5. 리포트 규칙

| ID | 규칙 | 검증 시점 |
|----|------|----------|
| RPT-1 | 세션 종료 시 자동 리포트 생성 | 세션 종료 시 |
| RPT-2 | 완료율 = 완료 루틴 수 / 전체 루틴 수 × 100 | 리포트 생성 시 |
| RPT-3 | 리포트는 수정 불가 (읽기 전용) | 모든 접근 시 |
| RPT-4 | 리포트 데이터는 무제한 보존 | - |

### 완료율 계산

```python
def calculate_completion_rate(results: list[RoutineResult], total: int) -> float:
    if total == 0:
        return 0.0
    
    completed = sum(1 for r in results if r.status == "completed")
    return round(completed / total * 100, 1)
```

---

## 6. 푸시 알림 규칙

| ID | 규칙 | 검증 시점 |
|----|------|----------|
| PSH-1 | 기상 시간 정각에 푸시 발송 | 스케줄러 실행 시 |
| PSH-2 | 실패한 토큰은 자동 삭제 | 발송 후 |
| PSH-3 | 사용자당 최대 5개 디바이스 토큰 | 등록 시 |
| PSH-4 | 30일 미사용 토큰 자동 정리 | 정기 작업 |

---

## 7. 보안 규칙 ⚠️

| ID | 규칙 | 적용 범위 |
|----|------|----------|
| SEC-1 | API 키는 환경변수로만 관리 | 전체 |
| SEC-2 | 로그에 민감 정보 출력 금지 | 전체 |
| SEC-3 | 프로덕션에서 DEBUG 로그 비활성화 | 프로덕션 |
| SEC-4 | 에러 응답에 스택 트레이스 포함 금지 | 프로덕션 |
| SEC-5 | CORS는 허용된 도메인만 | API |
| SEC-6 | HTTPS 필수 | 전체 |

### 민감 정보 목록

```python
SENSITIVE_KEYS = [
    "api_key",
    "secret",
    "password",
    "token",
    "credential",
    "private_key",
    "access_key",
    "auth",
]

def contains_sensitive(text: str) -> bool:
    text_lower = text.lower()
    return any(key in text_lower for key in SENSITIVE_KEYS)
```

---

## 8. 스누즈 규칙

| ID | 규칙 | 검증 시점 |
|----|------|----------|
| SNZ-1 | 스누즈 기본 시간: 5분 | 스누즈 요청 시 |
| SNZ-2 | 최대 스누즈 횟수: 3회 | 스누즈 요청 시 |
| SNZ-3 | 3회 초과 시 강력한 톤으로 기상 독려 | 스누즈 요청 시 |
| SNZ-4 | 스누즈 횟수는 세션에 기록 | 스누즈 시 |
