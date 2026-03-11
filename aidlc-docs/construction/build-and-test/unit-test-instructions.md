# Unit Test Instructions

## 개요
Miracle Morning AI Coach 프로젝트의 단위 테스트 지침서입니다.

---

## 1. Backend 단위 테스트 (pytest)

### 1.1 테스트 환경 설정
```bash
cd backend

# 개발 의존성 설치
pip install -r requirements-dev.txt
```

### 1.2 테스트 구조
```
backend/
├── app/
│   ├── main.py
│   ├── routers/
│   ├── services/
│   └── models/
└── tests/
    ├── __init__.py
    ├── conftest.py          # pytest fixtures
    ├── test_auth.py         # 인증 API 테스트
    ├── test_routines.py     # 루틴 API 테스트
    ├── test_sessions.py     # 세션 API 테스트
    └── test_gemini.py       # Gemini 서비스 테스트
```

### 1.3 테스트 실행
```bash
# 전체 테스트 실행
pytest

# 특정 파일 테스트
pytest tests/test_auth.py

# 상세 출력
pytest -v

# 커버리지 포함
pytest --cov=app --cov-report=html
```

### 1.4 핵심 테스트 케이스

#### conftest.py (공통 Fixtures)
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

@pytest.fixture
def client():
    """FastAPI 테스트 클라이언트"""
    from app.main import app
    return TestClient(app)

@pytest.fixture
def mock_firestore():
    """Firestore 모킹"""
    with patch('app.services.firestore.db') as mock:
        yield mock

@pytest.fixture
def mock_user():
    """테스트용 사용자"""
    return {
        "uid": "test-user-123",
        "email": "test@example.com",
        "is_anonymous": False
    }
```

#### test_auth.py
```python
import pytest
from unittest.mock import patch, MagicMock

def test_health_check(client):
    """헬스체크 엔드포인트 테스트"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_ephemeral_token_endpoint(client):
    """Ephemeral Token 발급 테스트"""
    with patch('app.routers.gemini.get_ephemeral_token') as mock:
        mock.return_value = {"token": "test-token"}
        response = client.get("/api/gemini/ephemeral-token")
        assert response.status_code == 200
        assert "token" in response.json()
```

#### test_routines.py
```python
import pytest
from unittest.mock import patch, AsyncMock

def test_get_routines_unauthorized(client):
    """인증 없이 루틴 조회 시 401 반환"""
    response = client.get("/api/routines")
    assert response.status_code == 401

def test_create_routine(client, mock_firestore, mock_user):
    """루틴 생성 테스트"""
    with patch('app.services.auth.verify_token', return_value=mock_user):
        response = client.post(
            "/api/routines",
            json={
                "name": "Meditation",
                "duration": 10,
                "startTime": "06:00"
            },
            headers={"Authorization": "Bearer test-token"}
        )
        assert response.status_code in [200, 201]
```

---

## 2. Frontend 단위 테스트 (Vitest)

### 2.1 테스트 환경 설정

현재 Frontend에는 테스트 설정이 없습니다. 필요시 아래와 같이 설정:

```bash
cd frontend

# Vitest 및 Testing Library 설치
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

#### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### src/test/setup.ts
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Firebase 모킹
vi.mock('@/lib/firebase', () => ({
  auth: null,
  db: null,
}))
```

### 2.2 테스트 실행
```bash
# 전체 테스트
npm run test

# Watch 모드 (개발 중)
npm run test:watch

# 커버리지
npm run test:coverage
```

### 2.3 핵심 테스트 케이스 예시

#### components/ui/Button.test.tsx
```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })
})
```

---

## 3. 테스트 우선순위 (MVP)

NFR Requirements에서 결정한 대로, MVP에서는 **핵심 API 단위 테스트**만 진행합니다.

### 필수 테스트 (P0)
| 테스트 | 설명 |
|--------|------|
| Health Check | `/health` 엔드포인트 정상 응답 |
| Ephemeral Token | Gemini API 토큰 발급 |
| Auth Middleware | 인증 미들웨어 동작 |

### 권장 테스트 (P1)
| 테스트 | 설명 |
|--------|------|
| Routine CRUD | 루틴 생성/조회/수정/삭제 |
| Session API | 세션 시작/완료/스킵 |

### 선택 테스트 (P2)
| 테스트 | 설명 |
|--------|------|
| Report API | 리포트 조회 |
| Push API | 푸시 알림 등록 |

---

## 4. CI에서 테스트 실행

### GitHub Actions 예시
```yaml
name: Test

on: [push, pull_request]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: |
          cd backend
          pip install -r requirements-dev.txt
          pytest --cov=app

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: |
          cd frontend
          npm ci
          npm run test
```
