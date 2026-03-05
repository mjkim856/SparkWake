# Backend NFR Requirements

## 1. 성능 요구사항

| ID | 요구사항 | 목표값 | 측정 방법 |
|----|----------|--------|----------|
| PERF-B1 | API 응답 시간 (p95) | < 500ms | Cloud Monitoring |
| PERF-B2 | Ephemeral Token 발급 | < 200ms | 로그 |
| PERF-B3 | 푸시 알림 발송 | < 1초 | Cloud Functions 로그 |

## 2. 가용성 요구사항

| ID | 요구사항 | 목표값 | 구현 방법 |
|----|----------|--------|----------|
| AVAIL-B1 | 서비스 가용성 | 99% | Cloud Run 자동 스케일링 |
| AVAIL-B2 | Cold Start 시간 | < 5초 | 최소 인스턴스 0 (비용 절감) |
| AVAIL-B3 | 자동 복구 | 지원 | Cloud Run 헬스체크 |

## 3. 보안 요구사항 ⚠️

| ID | 요구사항 | 구현 방법 |
|----|----------|----------|
| SEC-B1 | API 키 보호 | Secret Manager |
| SEC-B2 | 인증 필수 | Firebase ID Token 검증 |
| SEC-B3 | 민감정보 로깅 금지 | 로그 필터링 |
| SEC-B4 | CORS 제한 | 허용 도메인만 |
| SEC-B5 | HTTPS 필수 | Cloud Run 기본 |

### 로깅 보안 규칙

```python
import logging
import re

SENSITIVE_PATTERNS = [
    r'api[_-]?key',
    r'token',
    r'secret',
    r'password',
    r'credential',
    r'authorization',
]

class SensitiveFilter(logging.Filter):
    def filter(self, record):
        msg = str(record.msg)
        for pattern in SENSITIVE_PATTERNS:
            if re.search(pattern, msg, re.IGNORECASE):
                record.msg = "[REDACTED - sensitive content]"
                break
        return True

# 프로덕션 로거 설정
logger = logging.getLogger(__name__)
logger.addFilter(SensitiveFilter())
```

## 4. 확장성 요구사항

| ID | 요구사항 | 설계 방향 |
|----|----------|----------|
| SCALE-B1 | 수평 확장 | Cloud Run 자동 스케일링 |
| SCALE-B2 | 동시 요청 | 인스턴스당 80 요청 |
| SCALE-B3 | 최대 인스턴스 | 10개 (MVP) |

## 5. 테스트 요구사항

| ID | 요구사항 | 범위 |
|----|----------|------|
| TEST-B1 | 단위 테스트 | 핵심 API 엔드포인트 |
| TEST-B2 | 테스트 커버리지 | 주요 비즈니스 로직 |
| TEST-B3 | 테스트 프레임워크 | pytest |

### 테스트 대상 API

```
- POST /api/auth/ephemeral-token
- POST /api/routines
- GET /api/routines
- POST /api/sessions
- POST /api/sessions/{id}/complete
```
